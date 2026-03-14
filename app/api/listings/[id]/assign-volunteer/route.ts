import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { Types } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import FoodListing from "@/models/FoodListing";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can accept tasks." }, { status: 403 });
  }

  const { id } = await params;

  await connectMongo();
  const listing = await FoodListing.findById(id);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.status !== "claimed") {
    return NextResponse.json(
      { error: "This task is not available for volunteer assignment." },
      { status: 400 },
    );
  }

  if (listing.assignedVolunteer) {
    return NextResponse.json({ error: "A volunteer has already been assigned to this task." }, { status: 400 });
  }

  listing.assignedVolunteer = new Types.ObjectId(session.user.id);
  listing.volunteerAssignedAt = new Date();
  await listing.save();

  const updated = await FoodListing.findById(id)
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .populate("assignedVolunteer", "name phone")
    .lean();

  const notifyParams = {
    type: "volunteer_assigned",
    message: `A volunteer has accepted the pickup task for your listing.`,
    listingId: id,
  };

  void Promise.all([
    sendNotification({ userId: listing.donorId.toString(), ...notifyParams }),
    sendNotification({ userId: listing.claimedBy!.toString(), ...notifyParams }),
  ]);

  return NextResponse.json({ listing: updated });
}
