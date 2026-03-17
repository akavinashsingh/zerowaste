import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { updateDemandStatusSchema, parseBody } from "@/lib/schemas";
import FoodDemand from "@/models/FoodDemand";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// PATCH /api/demands/:id — NGO updates the status of their own demand
//   Admins may also update any demand's status.
// ---------------------------------------------------------------------------
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (session.user.role !== "ngo" && session.user.role !== "admin") {
    return NextResponse.json({ error: "Only NGOs or admins can update demands." }, { status: 403 });
  }

  const { id } = await context.params;

  const body = await request.json();
  const parsed = parseBody(updateDemandStatusSchema, body);
  if (!parsed.success) return parsed.response;

  await connectMongo();

  const demand = await FoodDemand.findById(id);
  if (!demand) {
    return NextResponse.json({ error: "Demand not found." }, { status: 404 });
  }

  // NGOs may only update their own demands
  if (session.user.role === "ngo" && demand.ngoId.toString() !== session.user.id) {
    return NextResponse.json({ error: "You can only update your own demands." }, { status: 403 });
  }

  demand.status = parsed.data.status;
  await demand.save();

  return NextResponse.json({
    id: demand._id.toString(),
    status: demand.status,
    updatedAt: demand.updatedAt,
  });
}

// ---------------------------------------------------------------------------
// GET /api/demands/:id — fetch a single demand by id
// ---------------------------------------------------------------------------
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;

  await connectMongo();

  const demand = await FoodDemand.findById(id).lean();
  if (!demand) {
    return NextResponse.json({ error: "Demand not found." }, { status: 404 });
  }

  const loc = demand.location as { coordinates?: number[]; address?: string } | null | undefined;
  return NextResponse.json({
    ...demand,
    location: loc?.coordinates?.length
      ? { lat: loc.coordinates[1], lng: loc.coordinates[0], address: loc.address ?? "" }
      : undefined,
  });
}
