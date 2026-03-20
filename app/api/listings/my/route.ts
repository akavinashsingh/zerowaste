import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

type RawLocation = { type?: string; coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can view donor listings." }, { status: 403 });
  }

  await connectMongo();

  const rawListings = await FoodListing.find({ donorId: session.user.id })
    .sort({ createdAt: -1 })
    .populate("claimedBy", "name phone")
    .populate("assignedVolunteer", "name phone")
    .lean();

  const listings = rawListings.map((doc) => ({
    ...doc,
    location: normalizeLocation(doc.location as unknown as RawLocation),
  }));

  return NextResponse.json({ listings });
}