import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can view available tasks." }, { status: 403 });
  }

  await connectMongo();

  const tasks = await FoodListing.find({ status: "claimed", assignedVolunteer: null })
    .sort({ expiresAt: 1 })
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .lean();

  return NextResponse.json({ tasks });
}
