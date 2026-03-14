import { Types } from "mongoose";
import { NextResponse } from "next/server";

import { adminOnly } from "@/lib/adminOnly";
import { connectMongo } from "@/lib/mongodb";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";

const allowedRoles = new Set(["donor", "ngo", "volunteer", "admin"]);

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, max);
}

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type ListingCountRow = {
  _id: Types.ObjectId;
  count: number;
};

export const GET = adminOnly(async (request) => {
  await connectMongo();

  const url = new URL(request.url);
  const role = (url.searchParams.get("role") ?? "").trim();
  const search = (url.searchParams.get("search") ?? "").trim();
  const page = parsePositiveInt(url.searchParams.get("page"), 1, 100000);
  const limit = parsePositiveInt(url.searchParams.get("limit"), 10, 100);

  const filter: Record<string, unknown> = {};

  if (role && allowedRoles.has(role)) {
    filter.role = role;
  }

  if (search) {
    const pattern = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: pattern }, { email: pattern }];
  }

  const skip = (page - 1) * limit;

  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .select("name email role isActive phone address createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  const userIds = users.map((user) => user._id as Types.ObjectId);

  let donorCounts: ListingCountRow[] = [];
  let claimedCounts: ListingCountRow[] = [];
  let volunteerCounts: ListingCountRow[] = [];

  if (userIds.length > 0) {
    [donorCounts, claimedCounts, volunteerCounts] = await Promise.all([
      FoodListing.aggregate<ListingCountRow>([
        { $match: { donorId: { $in: userIds } } },
        { $group: { _id: "$donorId", count: { $sum: 1 } } },
      ]),
      FoodListing.aggregate<ListingCountRow>([
        { $match: { claimedBy: { $in: userIds } } },
        { $group: { _id: "$claimedBy", count: { $sum: 1 } } },
      ]),
      FoodListing.aggregate<ListingCountRow>([
        { $match: { assignedVolunteer: { $in: userIds } } },
        { $group: { _id: "$assignedVolunteer", count: { $sum: 1 } } },
      ]),
    ]);
  }

  const donorCountMap = new Map(donorCounts.map((row) => [row._id.toString(), row.count]));
  const claimedCountMap = new Map(claimedCounts.map((row) => [row._id.toString(), row.count]));
  const volunteerCountMap = new Map(volunteerCounts.map((row) => [row._id.toString(), row.count]));

  const rows = users.map((user) => {
    const id = user._id.toString();

    return {
      _id: id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
      listingCounts: {
        donor: donorCountMap.get(id) ?? 0,
        claimed: claimedCountMap.get(id) ?? 0,
        volunteer: volunteerCountMap.get(id) ?? 0,
      },
    };
  });

  return NextResponse.json({
    users: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
});
