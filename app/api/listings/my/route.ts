import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can view donor listings." }, { status: 403 });
  }

  await connectMongo();

  const listings = await FoodListing.find({ donorId: session.user.id })
    .sort({ createdAt: -1 })
    .lean();

  return NextResponse.json({ listings });
}