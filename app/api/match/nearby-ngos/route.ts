import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const radiusKmParam = url.searchParams.get("radiusKm");

  if (!latParam || !lngParam) {
    return NextResponse.json({ error: "lat and lng are required." }, { status: 400 });
  }

  const lat = Number(latParam);
  const lng = Number(lngParam);
  const radiusKm = Number(radiusKmParam ?? "10");

  if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm) || radiusKm <= 0) {
    return NextResponse.json({ error: "Invalid location parameters." }, { status: 400 });
  }

  await connectMongo();

  const ngos = await User.aggregate([
    {
      $geoNear: {
        near: { type: "Point", coordinates: [lng, lat] },
        distanceField: "distanceMeters",
        maxDistance: radiusKm * 1000,
        spherical: true,
        query: {
          role: "ngo",
          "location.coordinates": { $exists: true, $not: { $size: 0 } },
        },
      },
    },
    {
      $addFields: {
        distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
      },
    },
    {
      $project: {
        name: 1,
        address: 1,
        phone: 1,
        location: 1,
        distanceKm: 1,
      },
    },
  ]);

  return NextResponse.json({ ngos });
}
