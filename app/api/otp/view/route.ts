import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import OTP from "@/models/OTP";
import FoodListing from "@/models/FoodListing";

/**
 * GET /api/otp/view?listingId=xxx&type=pickup|delivery
 *
 * Returns the active OTP code for display to the authorized role:
 *   - pickup  → donor only
 *   - delivery → NGO only
 */
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const listingId = searchParams.get("listingId");
  const type = searchParams.get("type") as "pickup" | "delivery" | null;

  if (!listingId || (type !== "pickup" && type !== "delivery")) {
    return NextResponse.json({ error: "listingId and type (pickup|delivery) are required." }, { status: 400 });
  }

  await connectMongo();

  const listing = await FoodListing.findById(listingId).lean();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  // Role-based authorization
  const userId = session.user.id;
  if (type === "pickup" && listing.donorId.toString() !== userId) {
    return NextResponse.json({ error: "Only the donor can view the pickup OTP." }, { status: 403 });
  }
  if (type === "delivery" && listing.claimedBy?.toString() !== userId) {
    return NextResponse.json({ error: "Only the receiving NGO can view the delivery OTP." }, { status: 403 });
  }

  const otp = await OTP.findOne({ listingId, type, verified: false }).lean();

  if (!otp) {
    return NextResponse.json({ code: null, message: "No active OTP." });
  }

  if (otp.expiresAt < new Date()) {
    return NextResponse.json({ code: null, message: "OTP has expired." });
  }

  const minutesLeft = Math.ceil((otp.expiresAt.getTime() - Date.now()) / 60000);

  return NextResponse.json({
    code: otp.code,
    expiresAt: otp.expiresAt,
    minutesLeft,
  });
}
