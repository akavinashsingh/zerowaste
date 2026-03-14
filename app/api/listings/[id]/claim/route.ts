import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

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
  listing.claimedBy = session.user.id;
  listing.claimedAt = new Date();
  await listing.save();

  const updatedListing = await FoodListing.findById(id)
    .populate("claimedBy", "name phone")
    .populate("donorId", "name phone address")
    .lean();

  return NextResponse.json({ listing: updatedListing });
}