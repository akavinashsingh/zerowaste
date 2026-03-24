import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { verifyAndAdvanceDemand } from "@/lib/demandDelivery";

const verifyDemandSchema = z.object({
  deliveryId: z.string().min(1, "deliveryId is required"),
  code: z.string().length(6, "OTP must be exactly 6 digits"),
  type: z.enum(["pickup", "delivery"]),
});

/**
 * POST /api/otp/verify-demand
 * Body: { deliveryId, code, type: "pickup" | "delivery" }
 *
 * Volunteer submits OTP to confirm a demand delivery handoff.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can verify demand OTPs." }, { status: 403 });
  }

  const body = (await request.json()) as unknown;
  const parsed = verifyDemandSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request body." },
      { status: 400 },
    );
  }

  const { deliveryId, code, type } = parsed.data;

  await connectMongo();

  const result = await verifyAndAdvanceDemand(deliveryId, type, code, session.user.id);

  if (!result.ok) {
    const body: Record<string, unknown> = { error: result.error };
    if ("attemptsLeft" in result && result.attemptsLeft !== undefined) {
      body.attemptsLeft = result.attemptsLeft;
    }
    return NextResponse.json(body, { status: result.httpStatus });
  }

  return NextResponse.json({
    message: `${type === "pickup" ? "Pickup" : "Delivery"} confirmed successfully.`,
    status: result.newStatus,
  });
}
