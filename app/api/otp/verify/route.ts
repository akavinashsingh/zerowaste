import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { createOTP, verifyOTP } from "@/lib/otp";
import { verifyOTPSchema, parseBody } from "@/lib/schemas";
import { sendNotification } from "@/lib/notify";
import FoodListing from "@/models/FoodListing";

/**
 * POST /api/otp/verify
 * Body: { listingId, code, type: "pickup" | "delivery" }
 *
 * Volunteer submits OTP to confirm handoff.
 * On success:
 *   - pickup  → listing status becomes "picked_up"; delivery OTP auto-generated
 *   - delivery → listing status becomes "delivered"
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can verify OTPs." }, { status: 403 });
  }

  const body = parseBody(verifyOTPSchema, await request.json());
  if (!body.success) return body.response;

  const { listingId, code, type } = body.data;

  await connectMongo();

  const listing = await FoodListing.findById(listingId);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.assignedVolunteer?.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not assigned to this task." }, { status: 403 });
  }

  const requiredStatus = type === "pickup" ? "claimed" : "picked_up";
  if (listing.status !== requiredStatus) {
    return NextResponse.json(
      { error: `Listing is not in the expected '${requiredStatus}' state.` },
      { status: 400 },
    );
  }

  const result = await verifyOTP(listingId, code, type);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  // --- Update listing status ---
  const newStatus = type === "pickup" ? "picked_up" : "delivered";
  listing.status = newStatus as "picked_up" | "delivered";
  if (newStatus === "picked_up") {
    listing.pickedUpAt = new Date();
  } else {
    listing.deliveredAt = new Date();
  }
  await listing.save();

  // --- Auto-generate delivery OTP after successful pickup ---
  if (type === "pickup") {
    await createOTP(listingId, "delivery");
  }

  // --- Notify donor + NGO ---
  const message =
    type === "pickup"
      ? "Food has been picked up by the volunteer."
      : "Food has been successfully delivered!";

  void Promise.all([
    sendNotification({ userId: listing.donorId.toString(), type: newStatus, message, listingId }),
    listing.claimedBy
      ? sendNotification({ userId: listing.claimedBy.toString(), type: newStatus, message, listingId })
      : Promise.resolve(),
  ]);

  return NextResponse.json({
    message: `${type === "pickup" ? "Pickup" : "Delivery"} confirmed successfully.`,
    status: newStatus,
  });
}
