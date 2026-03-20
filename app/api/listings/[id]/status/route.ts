import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import { getIO } from "@/lib/socket";
import FoodListing from "@/models/FoodListing";
import VolunteerTask from "@/models/VolunteerTask";

const ALLOWED_TRANSITIONS: Record<string, string> = {
  picked_up: "claimed",
  delivered: "picked_up",
};

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can update task status." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  const newStatus = String(body.status ?? "").trim();

  if (newStatus !== "picked_up" && newStatus !== "delivered") {
    return NextResponse.json({ error: "Status must be 'picked_up' or 'delivered'." }, { status: 400 });
  }

  await connectMongo();
  const listing = await FoodListing.findById(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (!listing.assignedVolunteer || listing.assignedVolunteer.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not assigned to this task." }, { status: 403 });
  }

  const expectedCurrentStatus = ALLOWED_TRANSITIONS[newStatus];
  if (listing.status !== expectedCurrentStatus) {
    return NextResponse.json(
      { error: `Cannot transition from '${listing.status}' to '${newStatus}'.` },
      { status: 400 },
    );
  }

  const now = new Date();
  listing.status = newStatus as "picked_up" | "delivered";
  if (newStatus === "picked_up") {
    listing.pickedUpAt = now;
  } else {
    listing.deliveredAt = now;
  }
  await listing.save();

  // Sync VolunteerTask to match listing status
  await VolunteerTask.findOneAndUpdate(
    {
      listingId: new Types.ObjectId(id),
      volunteerId: new Types.ObjectId(session.user.id),
      status: { $nin: ["delivered", "cancelled"] },
    },
    {
      $set: {
        status: newStatus === "picked_up" ? "picked_up" : "delivered",
        ...(newStatus === "picked_up" ? { pickedUpAt: now } : { deliveredAt: now }),
      },
    },
  );

  const updated = await FoodListing.findById(id)
    .populate("donorId", "name phone email address location")
    .populate("claimedBy", "name phone email address location")
    .populate("assignedVolunteer", "name phone email")
    .lean();

  const normalizedListing = {
    ...updated,
    location: normalizeLocation(updated?.location as RawLocation | undefined),
  };

  // Broadcast status change to all parties via Socket.IO
  const io = getIO();
  const statusPayload = { listingId: id, status: newStatus };
  if (io) {
    const donorId = listing.donorId.toString();
    const volunteerId = session.user.id;
    const ngoId = listing.claimedBy?.toString();
    io.to(donorId).emit("listing_status", statusPayload);
    io.to(volunteerId).emit("listing_status", statusPayload);
    if (ngoId) io.to(ngoId).emit("listing_status", statusPayload);
  }

  const message =
    newStatus === "picked_up"
      ? "Food has been picked up by the volunteer."
      : "Food has been successfully delivered!";

  const notifyParams = { type: newStatus, message, listingId: id };

  void Promise.all([
    sendNotification({ userId: listing.donorId.toString(), ...notifyParams }),
    listing.claimedBy
      ? sendNotification({ userId: listing.claimedBy.toString(), ...notifyParams })
      : Promise.resolve(),
  ]);

  return NextResponse.json({ listing: normalizedListing });
}
