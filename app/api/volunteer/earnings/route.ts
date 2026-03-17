import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";

type RawLocation = { coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

// ---------------------------------------------------------------------------
// GET /api/volunteer/earnings
// Returns a breakdown of all tasks assigned to the authenticated volunteer,
// grouped by payout status (delivered = earned, in-progress = pending).
// ---------------------------------------------------------------------------
export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can view earnings." }, { status: 403 });
  }

  await connectMongo();

  const [volunteer, rawTasks] = await Promise.all([
    User.findById(session.user.id).select("name pricePerKm").lean(),
    FoodListing.find({ assignedVolunteer: session.user.id })
      .sort({ volunteerAssignedAt: -1 })
      .populate("donorId", "name address location")
      .populate("claimedBy", "name address location")
      .lean(),
  ]);

  // Tally totals
  let totalEarned = 0;    // delivered tasks
  let totalPending = 0;   // accepted / in-progress tasks

  const tasks = rawTasks.map((task) => {
    const payout = task.payoutAmount ?? 0;
    const isDelivered = task.status === "delivered";
    const isInProgress = task.status === "claimed" || task.status === "picked_up";

    if (isDelivered) totalEarned += payout;
    if (isInProgress) totalPending += payout;

    return {
      id: task._id.toString(),
      status: task.status,
      distanceKm: task.distanceKm ?? null,
      payoutAmount: task.payoutAmount ?? null,
      volunteerAssignedAt: task.volunteerAssignedAt ?? null,
      pickedUpAt: task.pickedUpAt ?? null,
      deliveredAt: task.deliveredAt ?? null,
      donor: (() => {
        const d = task.donorId as unknown as { name?: string; address?: string; location?: RawLocation } | null;
        return d ? { name: d.name, address: d.address, location: normalizeLocation(d.location) } : null;
      })(),
      ngo: (() => {
        const n = task.claimedBy as unknown as { name?: string; address?: string; location?: RawLocation } | null;
        return n ? { name: n.name, address: n.address, location: normalizeLocation(n.location) } : null;
      })(),
      location: normalizeLocation(task.location as unknown as RawLocation),
    };
  });

  return NextResponse.json({
    volunteer: {
      id: session.user.id,
      name: volunteer?.name ?? session.user.name,
      pricePerKm: volunteer?.pricePerKm ?? 10,
    },
    summary: {
      totalTasks: tasks.length,
      delivered: tasks.filter((t) => t.status === "delivered").length,
      inProgress: tasks.filter((t) => t.status === "claimed" || t.status === "picked_up").length,
      totalEarnedINR: totalEarned,
      totalPendingINR: totalPending,
    },
    tasks,
  });
}
