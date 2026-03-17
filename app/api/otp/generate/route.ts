import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { createOTP } from "@/lib/otp";
import { generateOTPSchema, parseBody } from "@/lib/schemas";
import FoodListing from "@/models/FoodListing";

/**
 * POST /api/otp/generate
 * Body: { listingId, type: "pickup" | "delivery" }
 *
 * Generates (or regenerates) an OTP for the given listing.
 * - "pickup"  → must be called by the assigned volunteer; listing must be "claimed"
 * - "delivery" → must be called by the assigned volunteer; listing must be "picked_up"
 *
 * The plain code is NOT returned here (it is shown to donor/NGO via GET /api/otp/view).
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can generate OTPs." }, { status: 403 });
  }

  const body = parseBody(generateOTPSchema, await request.json());
  if (!body.success) return body.response;

  const { listingId, type } = body.data;

  await connectMongo();

  const listing = await FoodListing.findById(listingId).lean();
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.assignedVolunteer?.toString() !== session.user.id) {
    return NextResponse.json({ error: "You are not assigned to this task." }, { status: 403 });
  }

  const requiredStatus = type === "pickup" ? "claimed" : "picked_up";
  if (listing.status !== requiredStatus) {
    return NextResponse.json(
      { error: `Listing must be in '${requiredStatus}' status to generate a ${type} OTP.` },
      { status: 400 },
    );
  }

  await createOTP(listingId, type);

  return NextResponse.json({ message: `${type} OTP generated successfully.` });
}
