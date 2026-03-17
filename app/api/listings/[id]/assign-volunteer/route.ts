import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import { calcTaskDistanceKm, calcPayoutAmount, PAYOUT_CONFIG } from "@/lib/payout";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";

type RawCoords = { coordinates?: [number, number] };

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

  // ----- Persist -----
  listing.assignedVolunteer = new Types.ObjectId(session.user.id);
  listing.volunteerAssignedAt = new Date();
  if (distanceKm !== null) listing.distanceKm = distanceKm;
  if (payoutAmount !== null) listing.payoutAmount = payoutAmount;
  if (listing.claimedBy) listing.payoutNgoId = listing.claimedBy;
  await listing.save();

  const updated = await FoodListing.findById(id)
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .populate("assignedVolunteer", "name phone")
    .lean();

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
