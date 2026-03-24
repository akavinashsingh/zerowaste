import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { autoAssignVolunteer } from "@/lib/assignVolunteer";
import FoodListing from "@/models/FoodListing";

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

async function fetchListing(id: string) {
  const doc = await FoodListing.findById(id)
    .populate("claimedBy", "name phone email")
    .populate("donorId", "name phone email address")
    .populate("assignedVolunteer", "name phone rating")
    .lean();
  if (!doc) return null;
  return { ...doc, location: normalizeLocation(doc.location as RawLocation | undefined) };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can claim listings." }, { status: 403 });
  }

  const { id } = await params;

  let claimedItems: { name: string; quantity: string; unit: string }[] | undefined;
  try {
    const body = (await req.json()) as { claimedItems?: unknown };
    if (Array.isArray(body?.claimedItems)) {
      claimedItems = body.claimedItems as { name: string; quantity: string; unit: string }[];
    }
  } catch {
    // body is optional
  }

  await connectMongo();

  const outcome = await autoAssignVolunteer(id, session.user.id, session.user.name ?? "NGO", claimedItems);

  // Hard failure — listing was NOT claimed
  if (!outcome.ok && !outcome.claimed) {
    const statusMap: Record<string, number> = {
      LISTING_NOT_FOUND: 404,
      LISTING_UNAVAILABLE: 409,
    };
    const httpStatus = statusMap[outcome.error.code] ?? 400;
    return NextResponse.json({ error: outcome.error.message }, { status: httpStatus });
  }

  // Fetch the (now-claimed) listing for the response
  const listing = await fetchListing(id);

  // Soft failure — listing WAS claimed, but no volunteer found yet
  if (!outcome.ok && outcome.claimed) {
    return NextResponse.json({
      listing,
      warning: outcome.error.message,
      code: outcome.error.code,
      assignment: null,
    });
  }

  // Full success — listing claimed and volunteer assigned
  return NextResponse.json({
    listing,
    assignment: outcome.data,
  });
}
