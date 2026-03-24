/**
 * OTP + verification + wallet settlement for demand-based deliveries.
 *
 * Mirrors the existing lib/otp.ts flow but for DemandDelivery documents
 * instead of FoodListing documents.
 *
 * OTP documents reuse the existing OTP collection: the listingId field
 * stores the deliveryId (both are ObjectIds — MongoDB ref enforcement
 * is application-level only, so this is safe).
 *
 * Handoff model:
 *   pickup  OTP → generated when volunteer is assigned → shown to DONOR
 *                 → volunteer enters it on arrival    → status → "picked_up"
 *                 → delivery OTP auto-generated
 *
 *   delivery OTP → shown to NGO at drop-off
 *                 → volunteer enters it              → status → "delivered"
 *                 → FoodDemand.status → "fulfilled"
 *                 → wallet settlement
 */

import crypto from "crypto";
import { Types } from "mongoose";

import { connectMongo } from "@/lib/mongodb";
import { settleWallet } from "@/lib/otp";
import { sendNotification } from "@/lib/notify";
import { getIO } from "@/lib/socket";
import DemandDelivery from "@/models/DemandDelivery";
import FoodDemand from "@/models/FoodDemand";
import OTP, { MAX_OTP_ATTEMPTS, OTP_TTL_MS } from "@/models/OTP";

// ── OTP generation ────────────────────────────────────────────────────────────

function generateCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Generate (or regenerate) a pickup or delivery OTP for a demand delivery.
 * - pickup  → recipient is the donor
 * - delivery → recipient is the NGO
 * Stores the OTP with listingId = deliveryId (safe ObjectId reuse).
 */
export async function createDemandOTP(
  deliveryId: string,
  type: "pickup" | "delivery",
): Promise<void> {
  try {
    await connectMongo();

    const delivery = await DemandDelivery.findById(deliveryId).lean();
    if (!delivery) {
      console.error(`[demandDelivery/createOTP] Delivery not found: ${deliveryId}`);
      return;
    }

    const recipientId =
      type === "pickup"
        ? delivery.donorId.toString()
        : delivery.ngoId.toString();

    const recipientName = type === "pickup" ? delivery.donorName : delivery.ngoName;

    const code = generateCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any previous active OTP for this delivery+type
    await OTP.deleteMany({ listingId: new Types.ObjectId(deliveryId), type, isUsed: false });

    await OTP.create({
      listingId: new Types.ObjectId(deliveryId),
      type,
      code,
      recipientId: new Types.ObjectId(recipientId),
      expiresAt,
    });

    const message =
      type === "pickup"
        ? `Your demand pickup OTP is ${code} — show this to the volunteer when they arrive.`
        : `Your demand delivery OTP is ${code} — show this to the volunteer at drop-off.`;

    const io = getIO();
    if (io) {
      io.to(recipientId).emit("otp_generated", {
        deliveryId,
        listingId: deliveryId,
        type,
        code,
        expiresAt: expiresAt.toISOString(),
        label: type === "pickup" ? "Pickup" : "Delivery",
        minutesValid: Math.round(OTP_TTL_MS / 60_000),
        isDemand: true,
      });
    }

    void sendNotification({
      userId: recipientId,
      type: `otp_${type}`,
      message,
      listingId: deliveryId,
    });

    console.log(`[demandDelivery/createOTP] ${type} OTP created for ${recipientName} (${recipientId})`);
  } catch (err) {
    console.error("[demandDelivery/createOTP] Failed:", err);
  }
}

// ── Verify + advance ──────────────────────────────────────────────────────────

export type DemandVerifyResult =
  | { ok: true; newStatus: "picked_up" | "delivered" }
  | { ok: false; error: string; httpStatus: number; attemptsLeft?: number };

/**
 * Verify a volunteer-submitted OTP for a demand delivery and advance status.
 */
export async function verifyAndAdvanceDemand(
  deliveryId: string,
  type: "pickup" | "delivery",
  submittedCode: string,
  volunteerId: string,
): Promise<DemandVerifyResult> {
  await connectMongo();

  // ── 1. Load delivery ────────────────────────────────────────────────────────
  const delivery = await DemandDelivery.findById(deliveryId);
  if (!delivery) {
    return { ok: false, error: "Delivery not found.", httpStatus: 404 };
  }

  // ── 2. Volunteer ownership ─────────────────────────────────────────────────
  if (!delivery.volunteerId || delivery.volunteerId.toString() !== volunteerId) {
    return { ok: false, error: "You are not assigned to this delivery.", httpStatus: 403 };
  }

  // ── 3. Pre-transition state guard ──────────────────────────────────────────
  const requiredStatus = type === "pickup" ? "assigned" : "picked_up";
  if (delivery.status !== requiredStatus) {
    return {
      ok: false,
      error: `Delivery must be in '${requiredStatus}' status to verify a ${type} OTP.`,
      httpStatus: 409,
    };
  }

  // ── 4. Load active OTP (stored with listingId = deliveryId) ────────────────
  const otp = await OTP.findOne({
    listingId: new Types.ObjectId(deliveryId),
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otp) {
    return { ok: false, error: "No active OTP found. Please ask to regenerate.", httpStatus: 404 };
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      ok: false,
      error: "OTP locked after too many failed attempts.",
      httpStatus: 429,
    };
  }

  // ── 5. Constant-time code comparison ───────────────────────────────────────
  const inputBuf = Buffer.from(submittedCode.padEnd(6, "\0"));
  const storedBuf = Buffer.from(otp.code.padEnd(6, "\0"));
  const match = inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    await OTP.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
    const attemptsLeft = MAX_OTP_ATTEMPTS - (otp.attempts + 1);
    return {
      ok: false,
      error: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
      httpStatus: 400,
      attemptsLeft,
    };
  }

  // ── 6. Mark OTP used atomically ────────────────────────────────────────────
  const claimed = await OTP.findOneAndUpdate(
    { _id: otp._id, isUsed: false },
    { $set: { isUsed: true } },
    { new: true },
  );
  if (!claimed) {
    return { ok: false, error: "This OTP was already used.", httpStatus: 409 };
  }

  // ── 7. Advance delivery status ─────────────────────────────────────────────
  const newStatus = type === "pickup" ? "picked_up" : "delivered";
  const now = new Date();

  delivery.status = newStatus as "picked_up" | "delivered";
  if (type === "pickup") delivery.pickedUpAt = now;
  else delivery.deliveredAt = now;
  await delivery.save();

  // ── 8. Socket broadcast ────────────────────────────────────────────────────
  const donorId = delivery.donorId.toString();
  const ngoId = delivery.ngoId.toString();
  const payload = { deliveryId, demandId: delivery.demandId.toString(), status: newStatus, isDemand: true };

  const io = getIO();
  if (io) {
    io.to(donorId).emit("demand_delivery_status", payload);
    io.to(volunteerId).emit("demand_delivery_status", payload);
    io.to(ngoId).emit("demand_delivery_status", payload);
  }

  // ── 9. In-app notifications ────────────────────────────────────────────────
  const msgs =
    type === "pickup"
      ? {
          donor: "The volunteer has picked up your food for the NGO demand.",
          ngo: "Food picked up — volunteer is on the way to you.",
          volunteer: "Pickup confirmed! Head to the NGO for drop-off.",
        }
      : {
          donor: "Your donated food has been delivered to the NGO successfully!",
          ngo: "Demand delivery confirmed. Food has arrived!",
          volunteer: "Demand delivery complete! Great work.",
        };

  void Promise.all([
    sendNotification({ userId: donorId, message: msgs.donor, type: `${type}_verified`, listingId: deliveryId }),
    sendNotification({ userId: volunteerId, message: msgs.volunteer, type: `${type}_verified`, listingId: deliveryId }),
    sendNotification({ userId: ngoId, message: msgs.ngo, type: `${type}_verified`, listingId: deliveryId }),
  ]);

  // ── 10. Auto-generate delivery OTP after pickup ────────────────────────────
  if (type === "pickup") {
    void createDemandOTP(deliveryId, "delivery");
  }

  // ── 11. Wallet settlement + mark demand fulfilled on delivery ──────────────
  if (type === "delivery") {
    if (delivery.payoutAmount) {
      void settleWallet({
        ngoId,
        volunteerId,
        payoutAmount: delivery.payoutAmount,
        listingId: deliveryId,
        io: getIO(),
      });
    }

    // Mark the parent demand as fulfilled
    void FoodDemand.findByIdAndUpdate(delivery.demandId, { status: "fulfilled" });
  }

  return { ok: true, newStatus };
}
