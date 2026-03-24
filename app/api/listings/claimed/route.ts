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

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can view claimed listings." }, { status: 403 });
  }

  await connectMongo();

  const rawListings = await FoodListing.find({
    $or: [
      { claimedBy: session.user.id },
      { "partialClaims.ngoId": session.user.id },
    ],
  })
    .sort({ claimedAt: -1, createdAt: -1 })
    .populate("donorId", "name phone address")
    .populate("assignedVolunteer", "name phone")
    .lean();

  const ngoId = session.user.id;
  const listings = rawListings.map((doc) => {
    const partialClaim = (doc.partialClaims as Array<{ ngoId: { toString(): string }; claimedItems: unknown[] }> | undefined)
      ?.find((pc) => pc.ngoId.toString() === ngoId);
    return {
      ...doc,
      location: normalizeLocation(doc.location as unknown as RawLocation),
      // For partial claims: surface what this NGO specifically reserved
      ...(partialClaim && doc.status === "available" && { myClaimedItems: partialClaim.claimedItems }),
    };
  });

  return NextResponse.json({ listings });
}