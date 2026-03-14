import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { coordinatesToGeoJSON } from "@/lib/distance";
import { sendNotification } from "@/lib/notify";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";

type RawLocation = { type?: string; coordinates?: number[]; address?: string };

/** Convert GeoJSON location back to { lat, lng, address } for client consumption. */
function normalizeLocation(raw: RawLocation | null | undefined): { lat: number; lng: number; address: string } | undefined {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

function normalizeFoodItems(foodItems: unknown) {
  if (!Array.isArray(foodItems) || foodItems.length === 0) {
    return [];
  }

  return foodItems
    .map((item) => {
      const value = item as Record<string, unknown>;

      return {
        name: String(value.name ?? "").trim(),
        quantity: String(value.quantity ?? "").trim(),
        unit: String(value.unit ?? "").trim(),
      };
    })
    .filter((item) => item.name && item.quantity && item.unit);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can create listings." }, { status: 403 });
  }

  const body = await request.json();
  const foodItems = normalizeFoodItems(body.foodItems);
  const totalQuantity = String(body.totalQuantity ?? "").trim();
  const foodType = String(body.foodType ?? "").trim();
  const expiresAt = new Date(body.expiresAt);
  const images = Array.isArray(body.images)
    ? body.images.filter((url: unknown) => typeof url === "string" && url.trim())
    : [];
  const location = body.location as { lat?: number; lng?: number; address?: string } | undefined;

  if (!foodItems.length || !totalQuantity || !["cooked", "packaged", "raw"].includes(foodType)) {
    return NextResponse.json({ error: "Please complete all required fields." }, { status: 400 });
  }

  if (Number.isNaN(expiresAt.getTime()) || expiresAt <= new Date()) {
    return NextResponse.json({ error: "Pickup deadline must be a future date and time." }, { status: 400 });
  }

  if (
    !location ||
    typeof location.lat !== "number" ||
    typeof location.lng !== "number" ||
    !String(location.address ?? "").trim()
  ) {
    return NextResponse.json({ error: "Location details are required." }, { status: 400 });
  }

  await connectMongo();
  const donor = await User.findById(session.user.id).lean();

  if (!donor) {
    return NextResponse.json({ error: "Donor account not found." }, { status: 404 });
  }

  const listing = await FoodListing.create({
    donorId: donor._id,
    donorName: donor.name,
    donorPhone: donor.phone,
    donorAddress: donor.address,
    foodItems,
    totalQuantity,
    foodType,
    expiresAt,
    images,
    location: {
      ...coordinatesToGeoJSON(location.lat, location.lng),
      address: String(location.address).trim(),
    },
  });

  const listingId = listing._id.toString();

  // Fire-and-forget: notify nearby NGOs
  void (async () => {
    try {
      const nearbyNgos = await User.aggregate<{ _id: { toString(): string }; name: string; distanceMeters: number }>([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [location.lng, location.lat] },
            distanceField: "distanceMeters",
            maxDistance: 10000,
            spherical: true,
            query: {
              role: "ngo",
              "location.coordinates": { $exists: true, $not: { $size: 0 } },
            },
          },
        },
        { $project: { _id: 1, name: 1, distanceMeters: 1 } },
      ]);

      await Promise.all(
        nearbyNgos.map((ngo) => {
          const distanceKm = (ngo.distanceMeters / 1000).toFixed(1);
          return sendNotification({
            userId: ngo._id.toString(),
            type: "new_listing_nearby",
            message: `New food listing available ${distanceKm} km from you!`,
            listingId,
          });
        }),
      );
    } catch (err) {
      console.error("[listings/POST] Failed to notify nearby NGOs:", err);
    }
  })();

  return NextResponse.json(
    {
      id: listingId,
      status: listing.status,
      createdAt: listing.createdAt,
    },
    { status: 201 },
  );
}

export async function GET(request: Request) {
  await connectMongo();

  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const radiusKmParam = url.searchParams.get("radiusKm");

  if (latParam && lngParam) {
    const lat = Number(latParam);
    const lng = Number(lngParam);
    const radiusKm = Number(radiusKmParam ?? "50");

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
      return NextResponse.json({ error: "Invalid location parameters." }, { status: 400 });
    }

    const pipeline = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { status: "available" },
        },
      },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
        },
      },
      {
        $project: {
          distanceMeters: 0,
        },
      },
    ];

    const rawListings = await FoodListing.aggregate(pipeline);
    const listings = rawListings.map((doc) => ({
      ...doc,
      location: normalizeLocation(doc.location as RawLocation),
    }));

    return NextResponse.json({ listings });
  }

  const rawListings = await FoodListing.find({ status: "available" })
    .sort({ createdAt: -1 })
    .select("donorName donorAddress foodItems expiresAt totalQuantity foodType images location status createdAt")
    .lean();

  const listings = rawListings.map((doc) => ({
    ...doc,
    location: normalizeLocation(doc.location as unknown as RawLocation),
  }));

  return NextResponse.json({ listings });
}