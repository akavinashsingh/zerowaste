import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can view claimed listings." }, { status: 403 });
  }

  await connectMongo();

  const listings = await FoodListing.find({ claimedBy: session.user.id })
    .sort({ claimedAt: -1, createdAt: -1 })
    .populate("donorId", "name phone address")
    .populate("assignedVolunteer", "name phone")
    .lean();

  return NextResponse.json({ listings });
}