import { NextResponse } from "next/server";

import { adminOnly } from "@/lib/adminOnly";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

const allowedStatuses = new Set(["available", "claimed", "picked_up", "delivered", "expired"]);

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const GET = adminOnly(async (request) => {
  await connectMongo();

  const url = new URL(request.url);
  const status = (url.searchParams.get("status") ?? "").trim();
  const search = (url.searchParams.get("search") ?? "").trim();
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 100000);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 10, 100);

  const filter: Record<string, unknown> = {};

  if (status === "active") {
    filter.status = { $in: ["available", "claimed", "picked_up"] };
  } else if (status.includes(",")) {
    const statuses = status
      .split(",")
      .map((value) => value.trim())
      .filter((value) => allowedStatuses.has(value));

    if (statuses.length) {
      filter.status = { $in: statuses };
    }
  } else if (status && allowedStatuses.has(status)) {
    filter.status = status;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { donorName: pattern },
      { donorAddress: pattern },
      { totalQuantity: pattern },
      { "foodItems.name": pattern },
    ];
  }

  const skip = (page - 1) * limit;

  const [total, listings] = await Promise.all([
    FoodListing.countDocuments(filter),
    FoodListing.find(filter)
      .populate("donorId", "name email phone role")
      .populate("claimedBy", "name email phone role")
      .populate("assignedVolunteer", "name email phone role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const normalizedListings = listings.map((listing) => ({
    ...listing,
    location: normalizeLocation(listing.location as RawLocation | undefined),
  }));

  return NextResponse.json({
    listings: normalizedListings,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
