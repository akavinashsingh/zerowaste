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

// ── Quantity helpers ──────────────────────────────────────────────────────────

type FoodItem = { name: string; quantity: string; unit: string };

/** Extract the leading number from a quantity string, e.g. "50 kg" → 50, "3" → 3 */
function parseQtyNum(s: string): number | null {
  const m = s.trim().match(/^(\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : null;
}

/**
 * Subtract claimed items from current items.
 * Returns { remaining, isPartial } where isPartial is true when at least one
 * item still has a positive quantity left after the subtraction.
 */
function computeRemaining(
  current: FoodItem[],
  claimed: FoodItem[],
): { remaining: FoodItem[]; isPartial: boolean } {
  let isPartial = false;
  const remaining: FoodItem[] = current.map((item) => {
    const match = claimed.find(
      (c) => c.name.trim().toLowerCase() === item.name.trim().toLowerCase(),
    );
    if (!match) {
      isPartial = true;
      return item;
    }
    const origNum = parseQtyNum(item.quantity);
    const claimedNum = parseQtyNum(match.quantity);
    if (origNum === null || claimedNum === null) {
      // non-numeric quantity — treat as fully claimed
      return { ...item, quantity: "0" };
    }
    const rem = Math.max(0, origNum - claimedNum);
    if (rem > 0) isPartial = true;
    const suffix = item.quantity.trim().replace(/^\d+(?:\.\d+)?/, "").trim();
    return { ...item, quantity: rem === 0 ? "0" : `${rem}${suffix ? " " + suffix : ""}` };
  });
  return { remaining, isPartial };
}

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

  // ── 2. Determine if this is a partial or full claim ──────────────────────
  const ngoObjectId = new Types.ObjectId(ngoId);
  const currentItems = listing.foodItems as FoodItem[];

  let isPartial = false;
  let newRemainingItems: FoodItem[] | null = null;

  if (claimedFoodItems && claimedFoodItems.length > 0) {
    // Validate — claimed amounts must not exceed available amounts
    for (const cf of claimedFoodItems) {
      const available = currentItems.find(
        (c) => c.name.trim().toLowerCase() === cf.name.trim().toLowerCase(),
      );
      if (!available) continue;
      const availNum = parseQtyNum(available.quantity);
      const claimedNum = parseQtyNum(cf.quantity);
      if (availNum !== null && claimedNum !== null && claimedNum > availNum) {
        return {
          ok: false,
          claimed: false,
          error: {
            code: "LISTING_UNAVAILABLE",
            message: `Claimed quantity for "${cf.name}" (${cf.quantity}) exceeds what is available (${available.quantity} ${available.unit}).`,
          },
        };
      }
    }

    const result = computeRemaining(currentItems, claimedFoodItems);
    isPartial = result.isPartial;
    newRemainingItems = result.remaining;
  }

  // ── 3. Atomically update the listing ─────────────────────────────────────
  const claimed = await FoodListing.findOneAndUpdate(
    {
      _id: new Types.ObjectId(listingId),
      status: "available",
      expiresAt: { $gt: now },
    },
    isPartial && claimedFoodItems
      ? {
          $set: { foodItems: newRemainingItems },
          $push: {
            partialClaims: { ngoId: ngoObjectId, ngoName, claimedItems: claimedFoodItems, claimedAt: now },
          },
        }
      : {
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
    return {
      ok: false,
      claimed: false,
      error: { code: "LISTING_UNAVAILABLE", message: "This listing was just claimed by another NGO." },
    };
  }

  const [pickupLng, pickupLat] = listing.location.coordinates;

  // Notify other nearby NGOs about the updated quantities (non-blocking)
  if (isPartial) {
    void notifyNearbyNgos(listingId, ngoId, claimed, [pickupLng, pickupLat]);
  }

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

    if (!isPartial) {
      // Full claim: atomically bind the volunteer to the listing
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

  return {
    ok: false,
    claimed: true,
    error: {
      code: "ALL_VOLUNTEERS_BUSY",
      message: isPartial
        ? "Your portion is reserved! No volunteers are free right now. A volunteer can self-assign from the app."
        : "Listing claimed! All nearby volunteers are currently occupied. A volunteer can self-assign from the app.",
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

/** Push `listing_updated` to all nearby NGOs (except the claimer) so their dashboards refresh in real-time. */
async function notifyNearbyNgos(
  listingId: string,
  claimerNgoId: string,
  claimed: { foodItems: unknown; partialClaims?: unknown },
  pickupCoords: [number, number],
): Promise<void> {
  const io = getIO();
  if (!io) return;

  const nearbyNgos = await User.aggregate<{ _id: Types.ObjectId }>([
    {
      $geoNear: {
        near: { type: "Point", coordinates: pickupCoords },
        distanceField: "distanceMeters",
        maxDistance: 50000, // 50 km
        spherical: true,
        query: { role: "ngo", "location.coordinates": { $exists: true, $not: { $size: 0 } } },
      },
    },
    { $project: { _id: 1 } },
  ]);

  const payload = {
    listingId,
    foodItems: claimed.foodItems,
    partialClaims: claimed.partialClaims ?? [],
  };

  for (const ngo of nearbyNgos) {
    if (ngo._id.toString() !== claimerNgoId) {
      io.to(ngo._id.toString()).emit("listing_updated", payload);
    }
  }
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
