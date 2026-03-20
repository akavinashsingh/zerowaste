import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { createOTP } from "@/lib/otp";
import FoodListing from "@/models/FoodListing";
import OTP from "@/models/OTP";

/**
 * POST /api/otp/request-delivery
 * Body: { listingId }
 *
 * Allows the NGO that claimed a listing (when it's in picked_up status) to
 * generate (or regenerate) the delivery OTP. Returns the code immediately so
 * the NGO can show it to the volunteer on arrival.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can request a delivery OTP." }, { status: 403 });
  }

  const body = (await request.json()) as { listingId?: string };
  const { listingId } = body;

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required." }, { status: 400 });
  }

  await connectMongo();

  const listing = await FoodListing.findById(listingId).lean();

  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.claimedBy?.toString() !== session.user.id) {
    return NextResponse.json({ error: "You did not claim this listing." }, { status: 403 });
  }

  if (listing.status !== "picked_up") {
    return NextResponse.json(
      { error: "Delivery OTP can only be requested once food is picked up." },
      { status: 400 },
    );
  }

  // Generate (or regenerate) the delivery OTP
  await createOTP(listingId, "delivery");

  // Fetch the freshly created OTP to return the code
  const otp = await OTP.findOne({
    listingId,
    type: "delivery",
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!otp) {
    return NextResponse.json({ error: "OTP generation failed. Please try again." }, { status: 500 });
  }

  const minutesLeft = Math.ceil((otp.expiresAt.getTime() - Date.now()) / 60_000);

  return NextResponse.json({ code: otp.code, minutesLeft });
}
