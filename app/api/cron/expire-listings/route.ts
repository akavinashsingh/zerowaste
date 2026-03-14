import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

export async function GET() {
  await connectMongo();

  const result = await FoodListing.updateMany(
    {
      expiresAt: { $lt: new Date() },
      status: "available",
    },
    {
      $set: { status: "expired" },
    },
  );

  return NextResponse.json({
    expiredCount: result.modifiedCount,
  });
}