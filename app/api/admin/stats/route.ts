import { NextResponse } from "next/server";

import { adminOnly } from "@/lib/adminOnly";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";

type DayCount = {
  date: string;
  count: number;
};

function buildDateSeries(days: number) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  for (let i = days - 1; i >= 0; i -= 1) {
    const day = new Date(today);
    day.setDate(today.getDate() - i);
    dates.push(day.toISOString().slice(0, 10));
  }

  return dates;
}

function fillMissingDays(days: string[], rows: Array<{ _id: string; count: number }>): DayCount[] {
  const rowMap = new Map(rows.map((row) => [row._id, row.count]));
  return days.map((date) => ({ date, count: rowMap.get(date) ?? 0 }));
}

export const GET = adminOnly(async () => {
  await connectMongo();

  const thirtyDaySeries = buildDateSeries(30);
  const startDate = new Date(`${thirtyDaySeries[0]}T00:00:00.000Z`);

  const [
    totalListings,
    activeListings,
    deliveredListings,
    expiredListings,
    usersByRole,
    foodSavedAgg,
    listingsByDayRaw,
    deliveriesByDayRaw,
    foodTypeRaw,
  ] = await Promise.all([
    FoodListing.countDocuments({}),
    FoodListing.countDocuments({ status: { $in: ["available", "claimed"] } }),
    FoodListing.countDocuments({ status: "delivered" }),
    FoodListing.countDocuments({ status: "expired" }),
    User.aggregate<{ _id: string; count: number }>([
      { $match: { role: { $in: ["donor", "ngo", "volunteer"] } } },
      { $group: { _id: "$role", count: { $sum: 1 } } },
    ]),
    FoodListing.aggregate<{ totalMeals?: number }>([
      { $match: { status: "delivered" } },
      {
        $project: {
          quantityMatch: {
            $regexFind: {
              input: "$totalQuantity",
              regex: /[0-9]+(?:\.[0-9]+)?/,
            },
          },
        },
      },
      {
        $group: {
          _id: null,
          totalMeals: {
            $sum: {
              $toDouble: { $ifNull: ["$quantityMatch.match", "0"] },
            },
          },
        },
      },
    ]),
    FoodListing.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    FoodListing.aggregate<{ _id: string; count: number }>([
      { $match: { status: "delivered", deliveredAt: { $gte: startDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$deliveredAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    FoodListing.aggregate<{ _id: string; count: number }>([
      { $group: { _id: "$foodType", count: { $sum: 1 } } },
    ]),
  ]);

  const roleCounts = new Map(usersByRole.map((item) => [item._id, item.count]));
  const foodTypeCounts = new Map(foodTypeRaw.map((item) => [item._id, item.count]));

  return NextResponse.json({
    totalListings,
    activeListings,
    deliveredListings,
    expiredListings,
    totalUsers: {
      donors: roleCounts.get("donor") ?? 0,
      ngos: roleCounts.get("ngo") ?? 0,
      volunteers: roleCounts.get("volunteer") ?? 0,
    },
    totalFoodSaved: Number((foodSavedAgg[0]?.totalMeals ?? 0).toFixed(2)),
    listingsByDay: fillMissingDays(thirtyDaySeries, listingsByDayRaw),
    deliveriesByDay: fillMissingDays(thirtyDaySeries, deliveriesByDayRaw),
    listingsByFoodType: {
      cooked: foodTypeCounts.get("cooked") ?? 0,
      packaged: foodTypeCounts.get("packaged") ?? 0,
      raw: foodTypeCounts.get("raw") ?? 0,
    },
  });
});
