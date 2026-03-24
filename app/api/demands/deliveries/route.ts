import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import DemandDelivery from "@/models/DemandDelivery";

// ---------------------------------------------------------------------------
// GET /api/demands/deliveries
//   ?type=available  — open demand deliveries any volunteer can accept
//   ?type=mine       — this volunteer's assigned/in-progress tasks
//   ?type=completed  — this volunteer's delivered tasks
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can view demand deliveries." }, { status: 403 });
  }

  await connectMongo();

  const url = new URL(request.url);
  const type = url.searchParams.get("type") ?? "available";

  let deliveries;

  if (type === "available") {
    deliveries = await DemandDelivery.find({ status: "open" })
      .sort({ createdAt: -1 })
      .lean();
  } else if (type === "mine") {
    deliveries = await DemandDelivery.find({
      volunteerId: session.user.id,
      status: { $in: ["assigned", "picked_up"] },
    })
      .sort({ assignedAt: -1 })
      .lean();
  } else if (type === "completed") {
    deliveries = await DemandDelivery.find({
      volunteerId: session.user.id,
      status: "delivered",
    })
      .sort({ deliveredAt: -1 })
      .lean();
  } else {
    return NextResponse.json({ error: "Invalid type parameter." }, { status: 400 });
  }

  return NextResponse.json({ deliveries });
}
