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

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can view their tasks." }, { status: 403 });
  }

  await connectMongo();

  const rawTasks = await FoodListing.find({ assignedVolunteer: session.user.id })
    .sort({ volunteerAssignedAt: -1 })
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .lean();

  const tasks = rawTasks.map((doc) => {
    const claimedBy = doc.claimedBy as unknown as { location?: RawLocation } | null;
    const claimedByNorm = claimedBy
      ? { ...(claimedBy as object), location: normalizeLocation(claimedBy.location) }
      : doc.claimedBy;

    return {
      ...doc,
      location: normalizeLocation(doc.location as unknown as RawLocation),
      claimedBy: claimedByNorm,
    };
  });

  return NextResponse.json({ tasks });
}
