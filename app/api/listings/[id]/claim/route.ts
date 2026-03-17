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

const ERROR_STATUS: Record<string, number> = {
  LISTING_NOT_FOUND: 404,
  LISTING_UNAVAILABLE: 409,
  NO_VOLUNTEERS_NEARBY: 200, // soft — claim still reported, no volunteer yet
  ALL_VOLUNTEERS_BUSY: 200,
};

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

  // ── Run auto-assignment (claim + volunteer binding in one transaction) ────
  const outcome = await autoAssignVolunteer(id, session.user.id, session.user.name ?? "NGO");

  if (!outcome.ok) {
    const { code, message } = outcome.error;
    const httpStatus = ERROR_STATUS[code] ?? 400;

    // Hard failures (listing gone / not found) — return error immediately
    if (httpStatus >= 400) {
      return NextResponse.json({ error: message }, { status: httpStatus });
    }

    // Soft failures (no volunteer found) — listing was NOT claimed yet.
    // Return a warning so the NGO client can show a message.
    return NextResponse.json(
      {
        warning: message,
        code,
        assignment: null,
      },
      { status: 200 },
    );
  }

  // ── Build response: fetch updated listing with populated refs ────────────
  const updatedListing = await FoodListing.findById(id)
    .populate("claimedBy", "name phone email")
    .populate("donorId", "name phone email address")
    .populate("assignedVolunteer", "name phone rating")
    .lean();

  const normalizedListing = {
    ...updatedListing,
    location: normalizeLocation(updatedListing?.location as RawLocation | undefined),
  };

  return NextResponse.json({
    listing: normalizedListing,
    assignment: outcome.data,
  });
}
