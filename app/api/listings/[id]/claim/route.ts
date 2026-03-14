import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import FoodListing from "@/models/FoodListing";

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can claim listings." }, { status: 403 });
  }

  const { id } = await params;

  await connectMongo();
  const listing = await FoodListing.findById(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.status !== "available") {
    return NextResponse.json({ error: "This listing has already been claimed" }, { status: 400 });
  }

  listing.status = "claimed";
  listing.claimedBy = new Types.ObjectId(session.user.id);
  listing.claimedAt = new Date();
  await listing.save();

  const updatedListing = await FoodListing.findById(id)
    .populate("claimedBy", "name phone email")
    .populate("donorId", "name phone email address")
    .lean();

  const normalizedListing = {
    ...updatedListing,
    location: normalizeLocation(updatedListing?.location as RawLocation | undefined),
  };

  // Notify the donor
  void sendNotification({
    userId: listing.donorId.toString(),
    type: "listing_claimed",
    message: `Your listing was claimed by ${session.user.name ?? "an NGO"}.`,
    listingId: id,
  });

  return NextResponse.json({ listing: normalizedListing });
}