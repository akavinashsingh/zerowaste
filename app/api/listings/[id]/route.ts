import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  await connectMongo();

  const listing = await FoodListing.findById(id)
    .populate("donorId", "name phone address")
    .populate("claimedBy", "name phone")
    .lean();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  return NextResponse.json({ listing });
}