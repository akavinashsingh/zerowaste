import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import FoodListing from "@/models/FoodListing";
import VolunteerTask from "@/models/VolunteerTask";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectMongo();

  // Collect listings that will be expired so we can notify owners
  const now = new Date();
  const toExpire = await FoodListing.find({
    expiresAt: { $lt: now },
    status: { $in: ["available", "claimed"] },
  })
    .select("_id donorId claimedBy assignedVolunteer status")
    .lean();

  if (toExpire.length === 0) {
    return NextResponse.json({ expiredCount: 0 });
  }

  const expiredIds = toExpire.map((l) => l._id);

  // Mark expired
  const result = await FoodListing.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { status: "expired" } },
  );

  // Cancel any open VolunteerTasks for these listings
  await VolunteerTask.updateMany(
    { listingId: { $in: expiredIds }, status: { $nin: ["delivered", "cancelled"] } },
    { $set: { status: "cancelled" } },
  );

  // Notify all affected parties (fire-and-forget)
  void Promise.all(
    toExpire.flatMap((listing) => {
      const listingId = listing._id.toString();
      const msg = "A food listing has expired without being fully delivered.";
      const type = "listing_expired";
      const notifs = [
        sendNotification({ userId: listing.donorId.toString(), type, message: msg, listingId }),
      ];
      if (listing.claimedBy) {
        notifs.push(sendNotification({ userId: listing.claimedBy.toString(), type, message: "A listing you claimed has expired.", listingId }));
      }
      if (listing.assignedVolunteer) {
        notifs.push(sendNotification({ userId: listing.assignedVolunteer.toString(), type, message: "A task assigned to you has expired.", listingId }));
      }
      return notifs;
    }),
  );

  return NextResponse.json({ expiredCount: result.modifiedCount });
}