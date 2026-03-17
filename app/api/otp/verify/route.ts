import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { verifyAndAdvance } from "@/lib/otp";
import { verifyOTPSchema, parseBody } from "@/lib/schemas";

/**
 * POST /api/otp/verify
 * Body: { listingId, code, type: "pickup" | "delivery" }
 *
 * Volunteer submits OTP to confirm a handoff.
 * Delegates entirely to verifyAndAdvance which:
 *   - validates the OTP and attempt budget
 *   - advances listing.status
 *   - syncs VolunteerTask
 *   - emits listing_status socket events to all parties
 *   - sends in-app notifications
 *   - auto-generates delivery OTP after pickup
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

  const result = await verifyAndAdvance(listingId, type, code, session.user.id);

  if (!result.ok) {
    const response: Record<string, unknown> = { error: result.error };
    if ("attemptsLeft" in result && result.attemptsLeft !== undefined) {
      response.attemptsLeft = result.attemptsLeft;
    }
    return NextResponse.json(response, { status: result.httpStatus });
  }

  return NextResponse.json({
    message: `${type === "pickup" ? "Pickup" : "Delivery"} confirmed successfully.`,
    status: result.newStatus,
  });
}
