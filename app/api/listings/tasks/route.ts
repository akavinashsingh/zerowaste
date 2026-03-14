import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { getDistanceKm } from "@/lib/distance";
import FoodListing from "@/models/FoodListing";

type RawLocation = { type?: string; coordinates?: number[]; address?: string };

function normalizeLocation(raw: RawLocation | null | undefined) {
  if (!raw?.coordinates?.length) return undefined;
  return { lat: raw.coordinates[1] ?? 0, lng: raw.coordinates[0] ?? 0, address: raw.address ?? "" };
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can view available tasks." }, { status: 403 });
  }

  const url = new URL(request.url);
  const latParam = url.searchParams.get("lat");
  const lngParam = url.searchParams.get("lng");
  const volLat = latParam ? Number(latParam) : null;
  const volLng = lngParam ? Number(lngParam) : null;
  const hasVolLocation = volLat !== null && volLng !== null && !isNaN(volLat) && !isNaN(volLng);

  await connectMongo();

  const rawTasks = await FoodListing.find({ status: "claimed", assignedVolunteer: null })
    .populate("donorId", "name phone address location")
    .populate("claimedBy", "name phone address location")
    .lean();

  const tasks = rawTasks.map((task) => {
    const normalLoc = normalizeLocation(task.location as unknown as RawLocation);
    let distanceToPickup: number | undefined;
    let distanceToDrop: number | undefined;

    if (hasVolLocation && normalLoc) {
      distanceToPickup = getDistanceKm(volLat!, volLng!, normalLoc.lat, normalLoc.lng);
    }

    const claimedBy = task.claimedBy as unknown as { location?: RawLocation } | null;
    if (hasVolLocation && claimedBy?.location) {
      const dropLoc = normalizeLocation(claimedBy.location);
      if (dropLoc) {
        distanceToDrop = getDistanceKm(volLat!, volLng!, dropLoc.lat, dropLoc.lng);
      }
    }

    return {
      ...task,
      location: normalLoc ?? { lat: 0, lng: 0, address: "" },
      distanceToPickup,
      distanceToDrop,
    };
  });

  if (hasVolLocation) {
    tasks.sort((a, b) => (a.distanceToPickup ?? Infinity) - (b.distanceToPickup ?? Infinity));
  } else {
    tasks.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }

  return NextResponse.json({ tasks });
}
