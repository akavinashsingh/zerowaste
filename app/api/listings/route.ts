import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";

function normalizeFoodItems(foodItems: unknown) {
  if (!Array.isArray(foodItems) || foodItems.length === 0) {
    return [];
  }

  return foodItems
    .map((item) => {
      const value = item as Record<string, unknown>;

      return {
        name: String(value.name ?? "").trim(),
        quantity: String(value.quantity ?? "").trim(),
        unit: String(value.unit ?? "").trim(),
      };
    })
    .filter((item) => item.name && item.quantity && item.unit);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can create listings." }, { status: 403 });
  }

  const body = await request.json();
  const foodItems = normalizeFoodItems(body.foodItems);
  const totalQuantity = String(body.totalQuantity ?? "").trim();
  const foodType = String(body.foodType ?? "").trim();
  const expiresAt = new Date(body.expiresAt);
  const images = Array.isArray(body.images)
    ? body.images.filter((url: unknown) => typeof url === "string" && url.trim())
    : [];
  const location = body.location as { lat?: number; lng?: number; address?: string } | undefined;

  if (!foodItems.length || !totalQuantity || !["cooked", "packaged", "raw"].includes(foodType)) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return NextResponse.json({ error: "Pickup deadline must be a future date and time." }, { status: 400 });
  }

  if (
    !location ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number" ||
    !String(location.address ?? "").trim()
  ) {
    return NextResponse.json({ error: "Location details are required." }, { status: 400 });
  }

  await connectMongo();
  const donor = await User.findById(session.user.id).lean();

  if (!donor) {
    return NextResponse.json({ error: "Donor account not found." }, { status: 404 });
  }

  const listing = await FoodListing.create({
    donorId: donor._id,
    donorName: donor.name,
    donorPhone: donor.phone,
    donorAddress: donor.address,
    foodItems,
    totalQuantity,
    foodType,
    expiresAt,
    images,
    location: {
      lat: location.lat,
      lng: location.lng,
      address: String(location.address).trim(),
    },
  });

  return NextResponse.json(
    {
      id: listing._id.toString(),
      status: listing.status,
      createdAt: listing.createdAt,
    },
    { status: 201 },
  );
}

export async function GET() {
  await connectMongo();

  const listings = await FoodListing.find({ status: "available" })
    .sort({ createdAt: -1 })
    .select("donorName donorAddress foodItems expiresAt totalQuantity foodType images location status createdAt")
    .lean();

  return NextResponse.json({ listings });
}