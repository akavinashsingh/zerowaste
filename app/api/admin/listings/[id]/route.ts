import { NextResponse } from "next/server";

import { adminOnly } from "@/lib/adminOnly";
import { connectMongo } from "@/lib/mongodb";
import { logAdminAction } from "@/lib/audit";
import FoodListing from "@/models/FoodListing";

const allowedStatuses = new Set(["available", "claimed", "picked_up", "delivered", "expired"] as const);

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

export const PATCH = adminOnly(async (request: Request, { params }: RouteContext, session) => {
  const { id } = await params;
  const body = (await request.json()) as { status?: string };

  if (!body.status || !allowedStatuses.has(body.status as (typeof allowedStatuses extends Set<infer U> ? U : never))) {
    return NextResponse.json({ error: "Invalid status value." }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status: body.status };

  if (body.status === "picked_up") {
    updates.pickedUpAt = new Date();
  }

  if (body.status === "delivered") {
    updates.deliveredAt = new Date();
    if (!updates.pickedUpAt) {
      updates.pickedUpAt = new Date();
    }
  }

  if (body.status === "available") {
    updates.claimedBy = undefined;
    updates.claimedAt = undefined;
    updates.assignedVolunteer = undefined;
    updates.volunteerAssignedAt = undefined;
    updates.pickedUpAt = undefined;
    updates.deliveredAt = undefined;
  }

  await connectMongo();

  const listing = await FoodListing.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .populate("donorId", "name email phone role")
    .populate("claimedBy", "name email phone role")
    .populate("assignedVolunteer", "name email phone role")
    .lean();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  const normalizedListing = {
    ...listing,
    location: normalizeLocation(listing.location as RawLocation | undefined),
  };

  void logAdminAction({
    adminId: session.user.id,
    adminName: session.user.name ?? "Admin",
    action: "listing_status_change",
    targetId: id,
    targetType: "listing",
    details: { newStatus: body.status },
  });

  return NextResponse.json({ listing: normalizedListing });
});

export const DELETE = adminOnly(async (_: Request, { params }: RouteContext, session) => {
  const { id } = await params;

  await connectMongo();

  const listing = await FoodListing.findByIdAndDelete(id).lean();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  void logAdminAction({
    adminId: session.user.id,
    adminName: session.user.name ?? "Admin",
    action: "listing_delete",
    targetId: id,
    targetType: "listing",
    targetName: (listing as { donorName?: string }).donorName,
  });

  return NextResponse.json({ message: "Listing deleted successfully." });
});
