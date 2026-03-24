import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { calcPayoutAmount, calcTaskDistanceKm } from "@/lib/payout";
import { sendNotification } from "@/lib/notify";
import { getIO } from "@/lib/socket";
import DemandDelivery from "@/models/DemandDelivery";
import FoodDemand from "@/models/FoodDemand";
import User from "@/models/User";

type RouteContext = { params: Promise<{ id: string }> };

// ---------------------------------------------------------------------------
// POST /api/demands/:id/accept — donor accepts an NGO food demand.
// Creates a DemandDelivery so volunteers can pick it up.
// ---------------------------------------------------------------------------
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "donor") {
    return NextResponse.json({ error: "Only donors can accept demands." }, { status: 403 });
  }

  const { id } = await context.params;

  await connectMongo();

  const donor = await User.findById(session.user.id).lean();
  if (!donor) {
    return NextResponse.json({ error: "Donor account not found." }, { status: 404 });
  }

  // Atomically claim the demand only if it is still open (prevents race conditions)
  const demand = await FoodDemand.findOneAndUpdate(
    { _id: id, status: "open" },
    {
      status: "accepted",
      acceptedBy: donor._id,
      acceptedByName: donor.name,
      acceptedAt: new Date(),
    },
    { new: true },
  );

  if (!demand) {
    const existing = await FoodDemand.findById(id).lean();
    if (!existing) {
      return NextResponse.json({ error: "Demand not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "This demand has already been accepted by another donor." },
      { status: 409 },
    );
  }

  const demandId = demand._id.toString();
  const ngoId = demand.ngoId.toString();

  // ── Create DemandDelivery so volunteers can discover and accept the task ──
  const donorLoc = donor.location as { coordinates?: [number, number] } | undefined;
  const demandLoc = demand.location as { coordinates?: [number, number]; address?: string } | undefined;

  const pickupCoords = donorLoc?.coordinates ?? undefined;
  const dropoffCoords = demandLoc?.coordinates ?? undefined;

  // Pre-calculate distance (payout will be finalised per volunteer rate when they accept)
  const distanceKm = calcTaskDistanceKm(
    pickupCoords ?? null,
    dropoffCoords ?? null,
  );

  const delivery = await DemandDelivery.create({
    demandId: demand._id,
    donorId: donor._id,
    donorName: donor.name,
    ngoId: demand.ngoId,
    ngoName: demand.ngoName,
    status: "open",
    distanceKm,
    payoutAmount: null, // set when volunteer accepts (uses their pricePerKm)
    pickupAddress: (donor.address as string | undefined) ?? "Donor address not set",
    dropoffAddress: demandLoc?.address ?? demand.ngoName,
    pickupCoords: pickupCoords as [number, number] | undefined,
    dropoffCoords: dropoffCoords as [number, number] | undefined,
  });

  const deliveryId = delivery._id.toString();

  // Store deliveryId on the demand for easy reference
  await FoodDemand.findByIdAndUpdate(demandId, { deliveryId: delivery._id });

  // Fire-and-forget: notify NGO + broadcast to nearby volunteers
  void (async () => {
    try {
      const io = getIO();

      // Notify NGO
      await sendNotification({
        userId: ngoId,
        type: "ngo_demand_nearby",
        message: `${donor.name} has accepted your demand for ${demand.mealsRequired} meals. Waiting for a volunteer.`,
        listingId: demandId,
      });

      if (io) {
        io.to(ngoId).emit("demand_accepted", {
          demandId,
          deliveryId,
          donorName: donor.name,
          donorPhone: (donor.phone as string | undefined) ?? "",
          mealsRequired: demand.mealsRequired,
          acceptedAt: demand.acceptedAt?.toISOString(),
        });
      }

      // Notify nearby volunteers within 15km of the pickup point
      if (pickupCoords) {
        const nearbyVolunteers = await User.aggregate<{ _id: { toString(): string } }>([
          {
            $geoNear: {
              near: { type: "Point", coordinates: pickupCoords },
              distanceField: "distanceMeters",
              maxDistance: 15000,
              spherical: true,
              query: {
                role: "volunteer",
                isAvailable: true,
                "location.coordinates": { $exists: true, $not: { $size: 0 } },
              },
            },
          },
          { $project: { _id: 1 } },
        ]);

        await Promise.all(
          nearbyVolunteers.map((vol) => {
            const volId = vol._id.toString();
            void sendNotification({
              userId: volId,
              type: "new_listing_nearby",
              message: `New demand delivery task: collect food from ${donor.name} and deliver to ${demand.ngoName} (${demand.mealsRequired} meals).`,
              listingId: deliveryId,
            });
            if (io) {
              io.to(volId).emit("demand_delivery_available", {
                deliveryId,
                demandId,
                donorName: donor.name,
                ngoName: demand.ngoName,
                mealsRequired: demand.mealsRequired,
                pickupAddress: delivery.pickupAddress,
                dropoffAddress: delivery.dropoffAddress,
                distanceKm,
              });
            }
            return Promise.resolve();
          }),
        );
      }
    } catch (err) {
      console.error("[demands/accept] Background tasks failed:", err);
    }
  })();

  return NextResponse.json({
    id: demandId,
    deliveryId,
    status: demand.status,
    acceptedByName: demand.acceptedByName,
    acceptedAt: demand.acceptedAt,
  });
}

// Ensure payout helpers are tree-shaken only — used above
void calcPayoutAmount;
