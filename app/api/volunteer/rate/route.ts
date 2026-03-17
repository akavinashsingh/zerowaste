import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { updatePricePerKmSchema, parseBody } from "@/lib/schemas";
import User from "@/models/User";

// ---------------------------------------------------------------------------
// GET /api/volunteer/rate — return current pricePerKm
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can view their rate." }, { status: 403 });
  }

  await connectMongo();
  const user = await User.findById(session.user.id).select("pricePerKm").lean();

  return NextResponse.json({ pricePerKm: user?.pricePerKm ?? 10 });
}

// ---------------------------------------------------------------------------
// PATCH /api/volunteer/rate — update pricePerKm
// Body: { pricePerKm: number }
// ---------------------------------------------------------------------------
export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can update their rate." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseBody(updatePricePerKmSchema, body);
  if (!parsed.success) return parsed.response;

  await connectMongo();

  const updated = await User.findByIdAndUpdate(
    session.user.id,
    { $set: { pricePerKm: parsed.data.pricePerKm } },
    { new: true, select: "pricePerKm" },
  ).lean();

  if (!updated) {
    return NextResponse.json({ error: "Volunteer account not found." }, { status: 404 });
  }

  return NextResponse.json({ pricePerKm: updated.pricePerKm });
}
