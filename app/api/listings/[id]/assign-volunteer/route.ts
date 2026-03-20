import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { createOTP } from "@/lib/otp";
import { sendNotification } from "@/lib/notify";
import { calcTaskDistanceKm, calcPayoutAmount, PAYOUT_CONFIG } from "@/lib/payout";
import FoodListing from "@/models/FoodListing";
import VolunteerTask from "@/models/VolunteerTask";
import User from "@/models/User";

type RawCoords = { coordinates?: [number, number] };

/**
 * DELETE /api/listings/[id]/assign-volunteer
 * Allows the assigned volunteer to cancel/unassign themselves from a task
 * that has not yet been picked up. Resets the listing back to "claimed"
 * (unassigned) so another volunteer can accept it.
 */
export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can cancel task assignment." }, { status: 403 });
  }

  const { id } = await params;

  await connectMongo();

  const listing = await FoodListing.findById(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (!listing.assignedVolunteer || listing.assignedVolunteer.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not assigned to this task." }, { status: 403 });
  }

  if (listing.status !== "claimed") {
    return NextResponse.json(
      { error: "Cannot cancel a task that has already been picked up or delivered." },
      { status: 400 },
    );
  }

  // Unassign the volunteer, return listing to "claimed" (unclaimed volunteer) state
  await FoodListing.findByIdAndUpdate(id, {
    $unset: { assignedVolunteer: 1, volunteerAssignedAt: 1, payoutAmount: 1, payoutNgoId: 1 },
  });

  // Mark the VolunteerTask as cancelled
  await VolunteerTask.findOneAndUpdate(
    { listingId: new Types.ObjectId(id), volunteerId: new Types.ObjectId(session.user.id), status: "assigned" },
    { $set: { status: "cancelled" } },
  );

  // Notify donor and NGO
  const notifyMsg = "The assigned volunteer has cancelled this task. It is available for another volunteer.";
  void Promise.all([
    sendNotification({ userId: listing.donorId.toString(), type: "volunteer_cancelled", message: notifyMsg, listingId: id }),
    listing.claimedBy
      ? sendNotification({ userId: listing.claimedBy.toString(), type: "volunteer_cancelled", message: notifyMsg, listingId: id })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ message: "Task cancelled successfully. The listing is available for another volunteer." });
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can accept tasks." }, { status: 403 });
  }

  const { id } = await params;

  await connectMongo();

  const listing = await FoodListing.findById(id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.status !== "claimed") {
    return NextResponse.json(
      { error: "This task is not available for volunteer assignment." },
      { status: 400 },
    );
  }

  // Guard: reject if listing has already passed its pickup deadline
  if (listing.expiresAt < new Date()) {
    return NextResponse.json({ error: "This listing has expired and can no longer be accepted." }, { status: 410 });
  }

  if (listing.assignedVolunteer) {
    return NextResponse.json({ error: "A volunteer has already been assigned to this task." }, { status: 400 });
  }

  // ----- Payout calculation -----
  // Load volunteer (need pricePerKm) and NGO (need drop-off location)
  const [volunteer, ngo, donor] = await Promise.all([
    User.findById(session.user.id).select("pricePerKm").lean(),
    listing.claimedBy ? User.findById(listing.claimedBy).select("location").lean() : Promise.resolve(null),
    User.findById(listing.donorId).select("location").lean(),
  ]);

  if (!volunteer) {
    return NextResponse.json({ error: "Volunteer account not found." }, { status: 404 });
  }

  // Pickup coords: prefer listing.location (donor's pickup point), fall back to donor's profile
  const pickupCoords =
    (listing.location?.coordinates as [number, number] | undefined) ??
    (donor?.location as RawCoords | null)?.coordinates;

  const dropCoords = (ngo?.location as RawCoords | null)?.coordinates;

  const distanceKm = calcTaskDistanceKm(pickupCoords, dropCoords);

  // Hard reject if route exceeds the cap and both endpoints are known
  if (distanceKm !== null && distanceKm > PAYOUT_CONFIG.MAX_DISTANCE_KM) {
    return NextResponse.json(
      {
        error: `Task distance (${distanceKm.toFixed(1)} km) exceeds the ${PAYOUT_CONFIG.MAX_DISTANCE_KM} km limit.`,
      },
      { status: 422 },
    );
  }

  const pricePerKm = volunteer.pricePerKm ?? PAYOUT_CONFIG.DEFAULT_PRICE_PER_KM;
  const payoutAmount = distanceKm !== null ? calcPayoutAmount(distanceKm, pricePerKm) : null;

  // ----- Persist (atomic — prevents two volunteers accepting simultaneously) -----
  const now = new Date();
  const setFields: Record<string, unknown> = {
    assignedVolunteer: new Types.ObjectId(session.user.id),
    volunteerAssignedAt: now,
  };
  if (distanceKm !== null) setFields.distanceKm = distanceKm;
  if (payoutAmount !== null) setFields.payoutAmount = payoutAmount;
  if (listing.claimedBy) setFields.payoutNgoId = listing.claimedBy;

  const updated = await FoodListing.findOneAndUpdate(
    // Only claim if still unassigned at the moment of write
    { _id: new Types.ObjectId(id), status: "claimed", assignedVolunteer: { $exists: false }, expiresAt: { $gt: now } },
    { $set: setFields },
    { new: true },
  )
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .populate("assignedVolunteer", "name phone")
    .lean();

  if (!updated) {
    return NextResponse.json({ error: "Task is no longer available — another volunteer may have accepted it." }, { status: 409 });
  }

  // Auto-generate pickup OTP — donor will see this code to hand off to volunteer
  void createOTP(id, "pickup");

  const notifyParams = {
    type: "volunteer_assigned",
    message: `A volunteer has accepted the pickup task for your listing.`,
    listingId: id,
  };

  void Promise.all([
    sendNotification({ userId: listing.donorId.toString(), ...notifyParams }),
    sendNotification({ userId: listing.claimedBy!.toString(), ...notifyParams }),
  ]);

  return NextResponse.json({
    listing: updated,
    payout: {
      distanceKm,
      payoutAmount,
      pricePerKm,
      note:
        distanceKm === null
          ? "Payout distance could not be calculated — one or both parties have no location set."
          : undefined,
    },
  });
}
