import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await connectMongo();

  const listing = await FoodListing.findById(id)
    .populate("donorId", "name email phone address")
    .populate("claimedBy", "name email phone")
    .lean();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const normalizedListing = {
    ...listing,
    location: normalizeLocation(listing.location as RawLocation | undefined),
  };

  return NextResponse.json({ listing: normalizedListing });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectMongo();

  const listing = await FoodListing.findById(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // Only donors can delete their own listings, and only if not claimed
  if (listing.donorId.toString() !== session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (listing.status !== "available") {
    return NextResponse.json(
      { error: `Cannot delete a ${listing.status} listing.` },
      { status: 400 },
    );
  }

  await FoodListing.deleteOne({ _id: id });

  return NextResponse.json({ success: true, message: "Listing deleted successfully." });
}