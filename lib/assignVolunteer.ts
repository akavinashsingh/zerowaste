/**
 * Auto-assignment service: claim a listing for an NGO and bind the best
 * available nearby volunteer.
 *
 * Flow:
 *   1. Validate listing is available.
 *   2. Atomically claim it for the NGO (findOneAndUpdate, no transaction needed).
 *   3. Best-effort: find the nearest non-busy volunteer and bind them.
 *   4. Return success (with or without volunteer) or hard failure.
 *
 * Hard failures  (listing not claimed)  → ok: false, claimed: false
 * Soft failures  (listing claimed, no volunteer yet) → ok: false, claimed: true
 * Full success   (listing claimed + volunteer assigned) → ok: true
 */
import { Types } from "mongoose";

import { connectMongo } from "@/lib/mongodb";
import { createOTP } from "@/lib/otp";
import { sendNotification } from "@/lib/notify";
import { calcTaskDistanceKm, calcPayoutAmount, PAYOUT_CONFIG } from "@/lib/payout";
import { getIO } from "@/lib/socket";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";
import VolunteerTask from "@/models/VolunteerTask";

// ── Config ────────────────────────────────────────────────────────────────────

/** Search radius when looking for volunteers near the pickup point */
const VOLUNTEER_SEARCH_RADIUS_KM = 10;

/** How many volunteer candidates to evaluate before giving up */
const MAX_CANDIDATES = 20;

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AssignmentResult {
  volunteer: {
    id: string;
    name: string;
    phone: string;
    distanceToPickupKm: number;
    rating: number;
  };
  task: {
    id: string;
    distanceKm: number | null;
    payoutAmount: number | null;
  };
}

export interface AssignmentError {
  code:
    | "LISTING_UNAVAILABLE"   // status is no longer "available"
    | "NO_VOLUNTEERS_NEARBY"  // no active volunteer within radius
    | "ALL_VOLUNTEERS_BUSY"   // found candidates but all had active tasks
    | "LISTING_NOT_FOUND";
  message: string;
}

type GeoVolunteer = {
  _id: Types.ObjectId;
  name: string;
  phone: string;
  pricePerKm: number;
  rating: number;
  distanceMeters: number;
  location: { coordinates: [number, number] };
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function isVolunteerBusy(volunteerId: Types.ObjectId): Promise<boolean> {
  const active = await VolunteerTask.exists({
    volunteerId,
    status: { $in: ["assigned", "picked_up"] },
  });
  return !!active;
}

// ── Core service ──────────────────────────────────────────────────────────────

export async function autoAssignVolunteer(
  listingId: string,
  ngoId: string,
  ngoName: string,
  claimedFoodItems?: { name: string; quantity: string; unit: string }[],
): Promise<
  | { ok: true; data: AssignmentResult }
  | { ok: false; claimed: true; error: AssignmentError }
  | { ok: false; claimed: false; error: AssignmentError }
> {
  await connectMongo();

  // ── 1. Load and validate listing ─────────────────────────────────────────
  const listing = await FoodListing.findById(listingId).lean();

  if (!listing) {
    return { ok: false, claimed: false, error: { code: "LISTING_NOT_FOUND", message: "Listing not found." } };
  }

  if (listing.status !== "available") {
    return {
      ok: false,
      claimed: false,
      error: { code: "LISTING_UNAVAILABLE", message: "This listing has already been claimed." },
    };
  }

  const now = new Date();
  if (listing.expiresAt < now) {
    return {
      ok: false,
      claimed: false,
      error: { code: "LISTING_UNAVAILABLE", message: "This listing has expired." },
    };
  }

  // ── 2. Atomically claim the listing for this NGO ─────────────────────────
  const ngoObjectId = new Types.ObjectId(ngoId);

  const claimed = await FoodListing.findOneAndUpdate(
    {
      _id: new Types.ObjectId(listingId),
      status: "available",
      expiresAt: { $gt: now },
    },
    {
      $set: {
        status: "claimed",
        claimedBy: ngoObjectId,
        claimedAt: now,
        ...(claimedFoodItems && claimedFoodItems.length > 0 && { claimedFoodItems }),
      },
    },
    { new: true },
  );

  if (!claimed) {
    // Another NGO claimed it between our read and write
    return {
      ok: false,
      claimed: false,
      error: { code: "LISTING_UNAVAILABLE", message: "This listing was just claimed by another NGO." },
    };
  }

  const [pickupLng, pickupLat] = listing.location.coordinates;

  // ── 3. Find nearby available volunteers ──────────────────────────────────
  const candidates = await User.aggregate<GeoVolunteer>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [pickupLng, pickupLat] },
        distanceField: "distanceMeters",
        maxDistance: VOLUNTEER_SEARCH_RADIUS_KM * 1000,
        spherical: true,
        query: {
          role: "volunteer",
          isActive: true,
          isAvailable: { $ne: false },
          "location.coordinates": { $exists: true, $not: { $size: 0 } },
        },
      },
    },
    { $sort: { distanceMeters: 1, rating: -1 } },
    { $limit: MAX_CANDIDATES },
    { $project: { _id: 1, name: 1, phone: 1, pricePerKm: 1, rating: 1, distanceMeters: 1, location: 1 } },
  ]);

  if (candidates.length === 0) {
    // Listing is claimed — NGO can manually assign later via self-assign endpoint
    return {
      ok: false,
      claimed: true,
      error: {
        code: "NO_VOLUNTEERS_NEARBY",
        message: `Listing claimed! No available volunteers found within ${VOLUNTEER_SEARCH_RADIUS_KM} km. A volunteer can self-assign from the app.`,
      },
    };
  }

  // ── 4. Find NGO location for route distance calc ─────────────────────────
  const ngoUser = await User.findById(ngoId).select("location").lean();
  const ngoCoords = (ngoUser?.location as { coordinates?: [number, number] } | null | undefined)?.coordinates;

  // ── 5. Try each candidate — assign first non-busy volunteer ──────────────
  for (const candidate of candidates) {
    if (await isVolunteerBusy(candidate._id)) continue;

    const distanceKm = calcTaskDistanceKm(candidate.location.coordinates, ngoCoords ?? null);
    const pricePerKm = candidate.pricePerKm ?? PAYOUT_CONFIG.DEFAULT_PRICE_PER_KM;
    const payoutAmount = distanceKm !== null ? calcPayoutAmount(distanceKm, pricePerKm) : null;

    // Atomically bind the volunteer to the already-claimed listing
    const assigned = await FoodListing.findOneAndUpdate(
      {
        _id: new Types.ObjectId(listingId),
        status: "claimed",
        assignedVolunteer: { $exists: false },
      },
      {
        $set: {
          assignedVolunteer: candidate._id,
          volunteerAssignedAt: now,
          ...(distanceKm !== null && { distanceKm }),
          ...(payoutAmount !== null && { payoutAmount }),
          payoutNgoId: ngoObjectId,
        },
      },
      { new: true },
    );

    if (!assigned) {
      // Another request bound a volunteer concurrently — done
      break;
    }

    const [task] = await VolunteerTask.create([
      {
        listingId: claimed._id,
        donorId: claimed.donorId,
        ngoId: ngoObjectId,
        volunteerId: candidate._id,
        status: "assigned",
        distanceKm,
        payoutAmount,
        assignedAt: now,
      },
    ]);

    const result: AssignmentResult = {
      volunteer: {
        id: candidate._id.toString(),
        name: candidate.name,
        phone: candidate.phone,
        distanceToPickupKm: parseFloat((candidate.distanceMeters / 1000).toFixed(2)),
        rating: candidate.rating ?? 0,
      },
      task: {
        id: task._id.toString(),
        distanceKm,
        payoutAmount,
      },
    };

    void dispatchEvents({
      result,
      donorId: listing.donorId.toString(),
      ngoId,
      ngoName,
      listingId,
    });

    return { ok: true, data: result };
  }

  // All candidates were busy (listing is still claimed)
  return {
    ok: false,
    claimed: true,
    error: {
      code: "ALL_VOLUNTEERS_BUSY",
      message: "Listing claimed! All nearby volunteers are currently occupied. A volunteer can self-assign from the app.",
    },
  };
}

// ── Notifications + Socket events ─────────────────────────────────────────────

interface DispatchParams {
  result: AssignmentResult;
  donorId: string;
  ngoId: string;
  ngoName: string;
  listingId: string;
}

async function dispatchEvents({
  result,
  donorId,
  ngoId,
  ngoName,
  listingId,
}: DispatchParams): Promise<void> {
  const io = getIO();
  const { volunteer, task } = result;

  const socketPayload = {
    listingId,
    taskId: task.id,
    volunteer: {
      id: volunteer.id,
      name: volunteer.name,
      phone: volunteer.phone,
      distanceToPickupKm: volunteer.distanceToPickupKm,
    },
    distanceKm: task.distanceKm,
    payoutAmount: task.payoutAmount,
  };

  if (io) {
    io.to(donorId).emit("volunteer_assigned", socketPayload);
    io.to(volunteer.id).emit("task_assigned", socketPayload);
    io.to(ngoId).emit("volunteer_confirmed", socketPayload);
  }

  void createOTP(listingId, "pickup");

  await Promise.all([
    sendNotification({
      userId: donorId,
      type: "volunteer_assigned",
      message: `A volunteer (${volunteer.name}) has been assigned to pick up your listing.`,
      listingId,
    }),
    sendNotification({
      userId: volunteer.id,
      type: "task_assigned",
      message: `New pickup assigned by ${ngoName}. Distance: ${volunteer.distanceToPickupKm} km.`,
      listingId,
    }),
    sendNotification({
      userId: ngoId,
      type: "volunteer_confirmed",
      message: `Volunteer ${volunteer.name} confirmed for your claimed listing.`,
      listingId,
    }),
  ]);
}
