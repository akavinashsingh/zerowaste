import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import FoodListing from "@/models/FoodListing";

const ALLOWED_TRANSITIONS: Record<string, string> = {
  picked_up: "claimed",
  delivered: "picked_up",
};

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

  listing.status = newStatus as "picked_up" | "delivered";
  if (newStatus === "picked_up") {
    listing.pickedUpAt = new Date();
  } else {
    listing.deliveredAt = new Date();
  }
  await listing.save();

  const updated = await FoodListing.findById(id)
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .populate("assignedVolunteer", "name phone")
    .lean();

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

  return NextResponse.json({ listing: updated });
}
