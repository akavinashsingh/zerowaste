/**
 * Auto-assignment service: claim a listing for an NGO and bind the best
 * available nearby volunteer in a single MongoDB transaction.
 *
 * NOTE: Transactions require a MongoDB replica set (Atlas or local replica).
 * In a standalone dev instance the transaction block is skipped and the writes
 * are applied as individual operations — safe enough for development.
 */
import mongoose, { Types } from "mongoose";

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

/**
 * Returns true if the volunteer already has an active (non-terminal) task.
 * We check VolunteerTask (authoritative) first; falls back to FoodListing.
 */
async function isVolunteerBusy(
  volunteerId: Types.ObjectId,
  session: mongoose.ClientSession | null,
): Promise<boolean> {
  const query = VolunteerTask.exists({ volunteerId, status: { $in: ["assigned", "picked_up"] } });
  if (session) query.session(session);
  const active = await query;
  return !!active;
}

// ── Core service ──────────────────────────────────────────────────────────────

/**
 * Claim a listing for an NGO and auto-assign the nearest available volunteer.
 *
 * @param listingId  The FoodListing to claim
 * @param ngoId      The authenticated NGO's user ID
 * @param ngoName    NGO display name (for notifications)
 * @returns          AssignmentResult on success, AssignmentError otherwise
 */
export async function autoAssignVolunteer(
  listingId: string,
  ngoId: string,
  ngoName: string,
): Promise<{ ok: true; data: AssignmentResult } | { ok: false; error: AssignmentError }> {
  await connectMongo();

  // ── 1. Load listing (pre-transaction read) ───────────────────────────────
  const listing = await FoodListing.findById(listingId).lean();
  if (!listing) {
    return { ok: false, error: { code: "LISTING_NOT_FOUND", message: "Listing not found." } };
  }
  if (listing.status !== "available") {
    return {
      ok: false,
      error: { code: "LISTING_UNAVAILABLE", message: "This listing has already been claimed." },
    };
  }

  const [pickupLng, pickupLat] = listing.location.coordinates;

  // ── 2. Find nearby volunteers via $geoNear ────────────────────────────────
  //    Primary sort: distance ASC (natural from $geoNear)
  //    Tiebreaker:   rating DESC
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
          "location.coordinates": { $exists: true, $not: { $size: 0 } },
        },
      },
    },
    { $sort: { distanceMeters: 1, rating: -1 } },
    { $limit: MAX_CANDIDATES },
    { $project: { _id: 1, name: 1, phone: 1, pricePerKm: 1, rating: 1, distanceMeters: 1, location: 1 } },
  ]);

  if (candidates.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_VOLUNTEERS_NEARBY",
        message: `No available volunteers found within ${VOLUNTEER_SEARCH_RADIUS_KM} km.`,
      },
    };
  }

  // ── 3. Find the first non-busy candidate and assign atomically ─────────────
  const ngoObjectId = new Types.ObjectId(ngoId);
  const ngoUser = await User.findById(ngoId).select("location").lean();
  const ngoCoords = (ngoUser?.location as { coordinates?: [number, number] } | null | undefined)
    ?.coordinates;

  for (const candidate of candidates) {
    const mongoSession = await mongoose.startSession();
    let result: AssignmentResult | null = null;

    try {
      await mongoSession.withTransaction(async () => {
        // Re-check listing inside transaction to prevent race condition
        const freshListing = await FoodListing.findById(listingId).session(mongoSession);
        if (!freshListing || freshListing.status !== "available") {
          // Another request claimed it — abort this transaction
          await mongoSession.abortTransaction();
          return;
        }

        // Check volunteer availability inside transaction
        if (await isVolunteerBusy(candidate._id, mongoSession)) {
          // This candidate is busy — abort and try the next one
          await mongoSession.abortTransaction();
          return;
        }

        // Calculate route distance (pickup → NGO) and payout
        const distanceKm = calcTaskDistanceKm(
          candidate.location.coordinates,
          ngoCoords ?? null,
        );
        const pricePerKm = candidate.pricePerKm ?? PAYOUT_CONFIG.DEFAULT_PRICE_PER_KM;
        const payoutAmount = distanceKm !== null ? calcPayoutAmount(distanceKm, pricePerKm) : null;

        const now = new Date();

        // Mutate listing
        freshListing.status = "claimed";
        freshListing.claimedBy = ngoObjectId;
        freshListing.claimedAt = now;
        freshListing.assignedVolunteer = candidate._id;
        freshListing.volunteerAssignedAt = now;
        if (distanceKm !== null) freshListing.distanceKm = distanceKm;
        if (payoutAmount !== null) freshListing.payoutAmount = payoutAmount;
        freshListing.payoutNgoId = ngoObjectId;
        await freshListing.save({ session: mongoSession });

        // Create the explicit VolunteerTask record
        const [task] = await VolunteerTask.create(
          [
            {
              listingId: freshListing._id,
              donorId: freshListing.donorId,
              ngoId: ngoObjectId,
              volunteerId: candidate._id,
              status: "assigned",
              distanceKm,
              payoutAmount,
              assignedAt: now,
            },
          ],
          { session: mongoSession },
        );

        result = {
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
      });

      if (result) {
        // Transaction committed — fire notifications and socket events
        await mongoSession.endSession();
        void dispatchEvents({
          result,
          donorId: listing.donorId.toString(),
          ngoId,
          ngoName,
          listingId,
        });
        return { ok: true, data: result };
      }

      // result is null: listing was already taken or volunteer was busy
      await mongoSession.endSession();

      // If the listing was snatched by someone else, stop trying
      const recheck = await FoodListing.findById(listingId).select("status").lean();
      if (recheck?.status !== "available") {
        return {
          ok: false,
          error: { code: "LISTING_UNAVAILABLE", message: "This listing was just claimed by another NGO." },
        };
      }

      // Otherwise this volunteer was busy — continue to next candidate
    } catch (err) {
      await mongoSession.endSession();
      // Re-throw unexpected errors; loop will not continue
      throw err;
    }
  }

  // Exhausted all candidates without a successful assignment
  return {
    ok: false,
    error: {
      code: "ALL_VOLUNTEERS_BUSY",
      message: "All nearby volunteers are currently occupied. Please try again shortly.",
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

  // Emit dedicated socket events to each party
  if (io) {
    io.to(donorId).emit("volunteer_assigned", socketPayload);
    io.to(volunteer.id).emit("task_assigned", socketPayload);
    io.to(ngoId).emit("volunteer_confirmed", socketPayload);
  }

  // Generate pickup OTP — donor will receive it via socket + notification
  void createOTP(listingId, "pickup");

  // Persist in-app notifications
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
