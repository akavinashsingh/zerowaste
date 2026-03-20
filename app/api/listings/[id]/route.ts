import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { coordinatesToGeoJSON } from "@/lib/distance";
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

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can edit listings." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    foodItems?: { name: string; quantity: string; unit: string }[];
    totalQuantity?: string;
    foodType?: string;
    expiresAt?: string;
    images?: string[];
    location?: { lat: number; lng: number; address: string };
  };

  await connectMongo();

  const listing = await FoodListing.findById(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.donorId.toString() !== session.user.id) {
    return NextResponse.json({ error: "You can only edit your own listings." }, { status: 403 });
  }

  if (listing.status !== "available") {
    return NextResponse.json({ error: "Only available (unclaimed) listings can be edited." }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.foodItems?.length) {
    updates.foodItems = body.foodItems;
  }
  if (body.totalQuantity) {
    updates.totalQuantity = String(body.totalQuantity).trim();
  }
  if (body.foodType && ["cooked", "packaged", "raw"].includes(body.foodType)) {
    updates.foodType = body.foodType;
  }
  if (body.expiresAt) {
    const expiresAt = new Date(body.expiresAt);
    if (isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
      return NextResponse.json({ error: "Pickup deadline must be a future date." }, { status: 400 });
    }
    updates.expiresAt = expiresAt;
  }
  if (Array.isArray(body.images)) {
    updates.images = body.images.filter((u) => typeof u === "string" && u.trim());
  }
  if (body.location && typeof body.location.lat === "number" && typeof body.location.lng === "number") {
    updates.location = {
      ...coordinatesToGeoJSON(body.location.lat, body.location.lng),
      address: String(body.location.address ?? "").trim(),
    };
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields to update." }, { status: 400 });
  }

  const updated = await FoodListing.findByIdAndUpdate(id, { $set: updates }, { new: true, runValidators: true })
    .populate("donorId", "name phone")
    .lean();

  return NextResponse.json({ listing: { ...updated, location: normalizeLocation(updated?.location as RawLocation | undefined) } });
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