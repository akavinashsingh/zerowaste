import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { calcPayoutAmount } from "@/lib/payout";
import { createDemandOTP } from "@/lib/demandDelivery";
import { sendNotification } from "@/lib/notify";
import { getIO } from "@/lib/socket";
import DemandDelivery from "@/models/DemandDelivery";
import User from "@/models/User";

type RouteContext = { params: Promise<{ deliveryId: string }> };

// ---------------------------------------------------------------------------
// POST /api/demands/deliveries/:deliveryId/assign — volunteer accepts a demand delivery
// ---------------------------------------------------------------------------
export async function POST(_request: Request, context: RouteContext) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can accept demand deliveries." }, { status: 403 });
  }

  const { deliveryId } = await context.params;

  await connectMongo();

  const volunteer = await User.findById(session.user.id).lean();
  if (!volunteer) {
    return NextResponse.json({ error: "Volunteer account not found." }, { status: 404 });
  }

  // Atomically assign — only succeeds if delivery is still "open"
  const delivery = await DemandDelivery.findOneAndUpdate(
    { _id: deliveryId, status: "open" },
    {
      $set: {
        status: "assigned",
        volunteerId: volunteer._id,
        volunteerName: volunteer.name,
        assignedAt: new Date(),
      },
    },
    { new: true },
  );

  if (!delivery) {
    const existing = await DemandDelivery.findById(deliveryId).lean();
    if (!existing) {
      return NextResponse.json({ error: "Delivery task not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "This delivery has already been accepted by another volunteer." },
      { status: 409 },
    );
  }

  // Calculate payout using this volunteer's pricePerKm
  const pricePerKm = (volunteer.pricePerKm as number | undefined) ?? 10;
  const payoutAmount =
    delivery.distanceKm != null
      ? calcPayoutAmount(delivery.distanceKm, pricePerKm)
      : 50; // minimum payout when distance is unknown

  await DemandDelivery.findByIdAndUpdate(deliveryId, { $set: { payoutAmount } });

  const volunteerName = volunteer.name as string;
  const volunteerPhone = (volunteer.phone as string | undefined) ?? "";

  // Fire-and-forget: generate pickup OTP for donor + notify all parties
  void (async () => {
    try {
      await createDemandOTP(deliveryId, "pickup");

      const io = getIO();
      const statusPayload = { deliveryId, status: "assigned", isDemand: true };

      if (io) {
        io.to(delivery.donorId.toString()).emit("demand_delivery_status", statusPayload);
        io.to(delivery.ngoId.toString()).emit("demand_delivery_status", statusPayload);
        io.to(session.user.id).emit("demand_delivery_status", statusPayload);
      }

      await Promise.all([
        sendNotification({
          userId: delivery.donorId.toString(),
          type: "volunteer_assigned",
          message: `${volunteerName} will collect food from you for the NGO demand. Check your OTP to verify pickup.`,
          listingId: deliveryId,
        }),
        sendNotification({
          userId: delivery.ngoId.toString(),
          type: "volunteer_assigned",
          message: `${volunteerName} (${volunteerPhone}) accepted your demand delivery. They will bring the food to you.`,
          listingId: deliveryId,
        }),
      ]);
    } catch (err) {
      console.error("[deliveries/assign] Background tasks failed:", err);
    }
  })();

  return NextResponse.json({
    deliveryId,
    status: delivery.status,
    volunteerName,
    payoutAmount,
    distanceKm: delivery.distanceKm,
    pickupAddress: delivery.pickupAddress,
    dropoffAddress: delivery.dropoffAddress,
    donorName: delivery.donorName,
    ngoName: delivery.ngoName,
  });
}
