import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import OTP from "@/models/OTP";

/**
 * GET /api/otp/view?listingId=xxx&type=pickup|delivery
 *
 * Returns the active OTP code for the calling user if they are the
 * designated recipient (recipientId on the OTP document):
 *   pickup   → donor
 *   delivery → NGO
 *
 * Authorization is enforced via OTP.recipientId — no separate listing
 * lookup is needed, which removes one DB round-trip and a class of IDOR.
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
    return NextResponse.json(
      { error: "listingId and type (pickup|delivery) are required." },
      { status: 400 },
    );
  }

  await connectMongo();

  const otp = await OTP.findOne({
    listingId,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  }).lean();

  if (!otp) {
    return NextResponse.json({ code: null, message: "No active OTP for this listing." });
  }

  // Scope: only the designated recipient may read the code
  if (otp.recipientId.toString() !== session.user.id) {
    return NextResponse.json(
      { error: "You are not authorized to view this OTP." },
      { status: 403 },
    );
  }

  const minutesLeft = Math.ceil((otp.expiresAt.getTime() - Date.now()) / 60_000);

  return NextResponse.json({
    code: otp.code,
    type,
    expiresAt: otp.expiresAt.toISOString(),
    minutesLeft,
    attemptsUsed: otp.attempts,
    attemptsRemaining: Math.max(0, 5 - otp.attempts),
  });
}
