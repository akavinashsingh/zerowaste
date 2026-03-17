import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";

export async function GET(request: Request) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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