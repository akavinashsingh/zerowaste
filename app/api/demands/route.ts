import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { PipelineStage } from "mongoose";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { coordinatesToGeoJSON } from "@/lib/distance";
import { sendNotification } from "@/lib/notify";
import { createDemandSchema, parseBody } from "@/lib/schemas";
import DemandDelivery from "@/models/DemandDelivery";
import FoodDemand from "@/models/FoodDemand";
import FoodListing from "@/models/FoodListing";
import User from "@/models/User";
import { getIO } from "@/lib/socket";

type RawLocation = { type?: string; coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

// ---------------------------------------------------------------------------
// POST /api/demands — NGO creates a food demand
// ---------------------------------------------------------------------------
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can create demands." }, { status: 403 });
  }

  const body = await request.json();
  const parsed = parseBody(createDemandSchema, body);
  if (!parsed.success) return parsed.response;

  const { mealsRequired, foodType, urgency, location } = parsed.data;

  await connectMongo();

  const ngo = await User.findById(session.user.id).lean();
  if (!ngo) {
    return NextResponse.json({ error: "NGO account not found." }, { status: 404 });
  }

  const demand = await FoodDemand.create({
    ngoId: ngo._id,
    ngoName: ngo.name,
    mealsRequired,
    foodType: foodType ?? undefined,
    urgency,
    location: {
      ...coordinatesToGeoJSON(location.lat, location.lng),
      address: location.address,
    },
  });

  const demandId = demand._id.toString();

  // Fire-and-forget: notify nearby donors and emit Socket.IO event
  void (async () => {
    try {
      const nearbyDonors = await User.aggregate<{
        _id: { toString(): string };
        name: string;
        distanceMeters: number;
      }>([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [location.lng, location.lat] },
            distanceField: "distanceMeters",
            maxDistance: 10000, // 10 km
            spherical: true,
            query: {
              role: "donor",
              "location.coordinates": { $exists: true, $not: { $size: 0 } },
            },
          },
        },
        { $project: { _id: 1, name: 1, distanceMeters: 1 } },
      ]);

      const urgencyLabel = urgency === "high" ? "🔴 URGENT" : urgency === "medium" ? "🟡 Medium" : "🟢 Low";
      const io = getIO();

      await Promise.all(
        nearbyDonors.map((donor) => {
          const distanceKm = (donor.distanceMeters / 1000).toFixed(1);
          const donorId = donor._id.toString();
          const message = `[${urgencyLabel}] ${ngo.name} needs ${mealsRequired} meals, ${distanceKm} km from you.`;

          // Persist notification + emit via sendNotification
          const notifyPromise = sendNotification({
            userId: donorId,
            type: "ngo_demand_nearby",
            message,
            listingId: demandId,
          });

          // Also emit a dedicated Socket.IO event so clients can react specifically
          if (io) {
            io.to(donorId).emit("ngo_demand", {
              demandId,
              ngoName: ngo.name,
              mealsRequired,
              foodType: foodType ?? null,
              urgency,
              distanceKm: parseFloat(distanceKm),
              address: location.address,
              createdAt: demand.createdAt.toISOString(),
            });
          }

          return notifyPromise;
        }),
      );
    } catch (err) {
      console.error("[demands/POST] Failed to notify nearby donors:", err);
    }
  })();

  return NextResponse.json(
    {
      id: demandId,
      status: demand.status,
      urgency: demand.urgency,
      createdAt: demand.createdAt,
    },
    { status: 201 },
  );
}

// ---------------------------------------------------------------------------
// GET /api/demands?lat=&lng=&radius= — fetch open demands near a location
//     radius defaults to 50 km
//     ?mine=true — returns only the authenticated NGO's own demands
// ---------------------------------------------------------------------------
export async function GET(request: Request) {
  await connectMongo();

  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const radiusKm = Number(url.searchParams.get("radius") ?? "50");
  const statusFilter = url.searchParams.get("status") ?? "open";
  const mine = url.searchParams.get("mine") === "true";

  if (mine) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== "ngo") {
      return NextResponse.json({ error: "Only NGOs can view their own demands." }, { status: 403 });
    }
    const rawDemands = await FoodDemand.find({ ngoId: session.user.id })
      .sort({ createdAt: -1 })
      .lean();
    const normalised = rawDemands.map((doc) => ({
      ...doc,
      location: normalizeLocation(doc.location as unknown as RawLocation),
    }));

    // Attach deliveryStatus from DemandDelivery for demands that have a deliveryId
    const deliveryIds = normalised.filter((d) => d.deliveryId).map((d) => d.deliveryId!);
    let deliveryStatusMap: Record<string, string> = {};
    if (deliveryIds.length > 0) {
      const deliveries = await DemandDelivery.find({ _id: { $in: deliveryIds } })
        .select("status")
        .lean();
      deliveryStatusMap = Object.fromEntries(
        deliveries.map((d) => [d._id.toString(), d.status as string]),
      );
    }

    const demands = normalised.map((d) =>
      d.deliveryId
        ? { ...d, deliveryStatus: deliveryStatusMap[d.deliveryId.toString()] }
        : d,
    );
    return NextResponse.json({ demands });
  }

  if (latParam && lngParam) {
    const lat = Number(latParam);
    const lng = Number(lngParam);

    if (isNaN(lat) || isNaN(lng) || isNaN(radiusKm)) {
      return NextResponse.json({ error: "Invalid location parameters." }, { status: 400 });
    }

    const pipeline: PipelineStage[] = [
      {
        $geoNear: {
          near: { type: "Point", coordinates: [lng, lat] },
          distanceField: "distanceMeters",
          maxDistance: radiusKm * 1000,
          spherical: true,
          query: { status: statusFilter },
        },
      },
      {
        $addFields: {
          distanceKm: { $round: [{ $divide: ["$distanceMeters", 1000] }, 2] },
        },
      },
      { $project: { distanceMeters: 0 } },
    ];

    const rawDemands = await FoodDemand.aggregate(pipeline);
    const demands = rawDemands.map((doc) => ({
      ...doc,
      location: normalizeLocation(doc.location as RawLocation),
    }));

    return NextResponse.json({ demands });
  }

  // No coordinates — return all demands with the given status, newest first
  const rawDemands = await FoodDemand.find({ status: statusFilter })
    .sort({ createdAt: -1 })
    .lean();

  const demands = rawDemands.map((doc) => ({
    ...doc,
    location: normalizeLocation(doc.location as unknown as RawLocation),
  }));

  return NextResponse.json({ demands });
}

// Suppress unused-import warning: FoodListing is intentionally imported so the
// model is registered with Mongoose before any aggregation that might join it.
void FoodListing;
