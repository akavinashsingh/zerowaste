/**
 * OTP service for food-handoff verification.
 *
 * Handoff model:
 *   pickup  OTP → generated when volunteer accepted → shown to DONOR
 *                 → volunteer enters it on arrival   → listing → "picked_up"
 *                 → delivery OTP auto-generated
 *
 *   delivery OTP → shown to NGO at drop-off
 *                 → volunteer enters it              → listing → "delivered"
 *                 → VolunteerTask synced
 */

import crypto from "crypto";
import mongoose, { Types } from "mongoose";

import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import { getIO } from "@/lib/socket";
import FoodListing from "@/models/FoodListing";
import OTP, { MAX_OTP_ATTEMPTS, OTP_TTL_MS, type OTPType } from "@/models/OTP";
import User from "@/models/User";
import VolunteerTask from "@/models/VolunteerTask";
import WalletTransaction from "@/models/WalletTransaction";

// ── Constants ─────────────────────────────────────────────────────────────────

export { MAX_OTP_ATTEMPTS };
/** Re-export for callers that previously used this name */
export const OTP_EXPIRY_MS = OTP_TTL_MS;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Cryptographically random 6-digit string, zero-padded. */
export function generateOTPCode(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");
}

type RecipientInfo = { id: string; name: string };

/**
 * Resolve the user who must show the OTP to the volunteer.
 *   pickup   → donor
 *   delivery → NGO (claimedBy)
 */
async function resolveRecipient(
  listingId: string,
  type: OTPType,
): Promise<RecipientInfo | null> {
  const listing = await FoodListing.findById(listingId)
    .populate("donorId", "name")
    .populate("claimedBy", "name")
    .lean();

  if (!listing) return null;

  if (type === "pickup") {
    const donor = listing.donorId as unknown as { _id: Types.ObjectId; name: string } | null;
    return donor ? { id: donor._id.toString(), name: donor.name } : null;
  }

  const ngo = listing.claimedBy as unknown as { _id: Types.ObjectId; name: string } | null;
  return ngo ? { id: ngo._id.toString(), name: ngo.name } : null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate (or regenerate) an OTP for a listing transition.
 *
 * - Invalidates any existing active OTP for (listingId, type).
 * - Persists the new OTP with the recipient's userId.
 * - Delivers the code to the recipient in real-time via Socket.IO.
 * - Persists an in-app notification so the code is visible even if the
 *   socket event is missed.
 *
 * Non-throwing — errors are logged but never propagated so callers aren't
 * blocked (this is always called fire-and-forget on assignment).
 */
export async function createOTP(listingId: string, type: OTPType): Promise<void> {
  try {
    await connectMongo();

    const recipient = await resolveRecipient(listingId, type);
    if (!recipient) {
      console.error(`[otp] Cannot resolve recipient for listing=${listingId} type=${type}`);
      return;
    }

    const code = generateOTPCode();
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    // Invalidate any previous active OTP for this listing+type
    await OTP.deleteMany({ listingId, type, isUsed: false });

    await OTP.create({
      listingId,
      type,
      code,
      recipientId: new Types.ObjectId(recipient.id),
      expiresAt,
    });

    const label = type === "pickup" ? "Pickup" : "Delivery";
    const message =
      type === "pickup"
        ? `Your food pickup OTP is ${code} — show this to the volunteer when they arrive.`
        : `Your food delivery OTP is ${code} — show this to the volunteer at drop-off.`;

    // Real-time delivery
    const io = getIO();
    if (io) {
      io.to(recipient.id).emit("otp_generated", {
        listingId,
        type,
        code,
        expiresAt: expiresAt.toISOString(),
        label,
        minutesValid: Math.round(OTP_TTL_MS / 60_000),
      });
    }

    // Persisted in-app notification (fallback for offline recipients)
    void sendNotification({
      userId: recipient.id,
      type: `otp_${type}`,
      message,
      listingId,
    });
  } catch (err) {
    console.error("[otp/createOTP] Failed:", err);
  }
}

// ── Wallet settlement ─────────────────────────────────────────────────────────

interface SettleWalletParams {
  ngoId: string;
  volunteerId: string;
  payoutAmount: number;
  listingId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  io: any;
}

/**
 * Atomically deduct payoutAmount from the NGO's wallet and credit it to the
 * volunteer's wallet. Creates a WalletTransaction record for each party.
 * Runs inside a MongoDB session so both updates succeed or both roll back.
 * Non-throwing — errors are logged but do not fail the delivery confirmation.
 */
async function settleWallet({ ngoId, volunteerId, payoutAmount, listingId, io }: SettleWalletParams): Promise<void> {
  try {
    const session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const ngoObjectId  = new Types.ObjectId(ngoId);
      const volObjectId  = new Types.ObjectId(volunteerId);
      const listingObjId = new Types.ObjectId(listingId);

      // Deduct from NGO
      const ngo = await User.findOneAndUpdate(
        { _id: ngoObjectId, walletBalance: { $gte: payoutAmount } },
        { $inc: { walletBalance: -payoutAmount } },
        { new: true, session },
      );

      if (!ngo) {
        // Insufficient balance — still settle but flag it (don't block delivery)
        // Log a zero-balance transaction so the NGO sees the debt
        const ngoDoc = await User.findById(ngoObjectId).session(session).lean();
        const currentBalance = (ngoDoc?.walletBalance as number | undefined) ?? 0;
        await WalletTransaction.create(
          [{ userId: ngoObjectId, amount: -payoutAmount, type: "delivery_debit", listingId: listingObjId,
             description: `Delivery payout to volunteer (insufficient balance — ₹${payoutAmount} overdue)`,
             balanceAfter: currentBalance - payoutAmount }],
          { session },
        );
      } else {
        await WalletTransaction.create(
          [{ userId: ngoObjectId, amount: -payoutAmount, type: "delivery_debit", listingId: listingObjId,
             description: `Delivery payout for listing ${listingId}`, balanceAfter: ngo.walletBalance }],
          { session },
        );
      }

      // Credit volunteer
      const vol = await User.findByIdAndUpdate(
        volObjectId,
        { $inc: { walletBalance: payoutAmount } },
        { new: true, session },
      );

      if (vol) {
        await WalletTransaction.create(
          [{ userId: volObjectId, amount: payoutAmount, type: "delivery_credit", listingId: listingObjId,
             description: `Delivery earnings for listing ${listingId}`, balanceAfter: vol.walletBalance }],
          { session },
        );
      }
    });

    await session.endSession();

    // Notify both parties in real-time
    if (io) {
      io.to(ngoId).emit("wallet_update", { type: "debit",  amount: payoutAmount });
      io.to(volunteerId).emit("wallet_update", { type: "credit", amount: payoutAmount });
    }

    void Promise.all([
      sendNotification({
        userId: ngoId,
        type: "wallet_debit",
        message: `₹${payoutAmount} deducted from your wallet for delivery payout.`,
        listingId,
      }),
      sendNotification({
        userId: volunteerId,
        type: "wallet_credit",
        message: `₹${payoutAmount} credited to your wallet for completed delivery!`,
        listingId,
      }),
    ]);
  } catch (err) {
    console.error("[otp/settleWallet] Failed:", err);
  }
}

// ── Verify + advance ──────────────────────────────────────────────────────────

export type VerifyResult =
  | { ok: true; newStatus: "picked_up" | "delivered" }
  | { ok: false; error: string; httpStatus: number; attemptsLeft?: number };

/**
 * Verify a volunteer-submitted OTP and, if correct, advance the listing status.
 *
 * Responsibilities:
 *  1. Auth: volunteer must be the assigned volunteer on the listing.
 *  2. State: listing must be in the expected pre-transition status.
 *  3. OTP: must exist, be unexpired, unused, and within attempt budget.
 *  4. On success:
 *     - marks OTP as used
 *     - advances listing.status
 *     - syncs VolunteerTask.status
 *     - emits listing_status socket event to all three parties
 *     - sends in-app notifications
 *     - auto-creates delivery OTP after successful pickup
 */
export async function verifyAndAdvance(
  listingId: string,
  type: OTPType,
  submittedCode: string,
  volunteerId: string,
): Promise<VerifyResult> {
  await connectMongo();

  // ── 1. Load listing ────────────────────────────────────────────────────────
  const listing = await FoodListing.findById(listingId);
  if (!listing) {
    return { ok: false, error: "Listing not found.", httpStatus: 404 };
  }

  // ── 2. Volunteer ownership ─────────────────────────────────────────────────
  if (!listing.assignedVolunteer || listing.assignedVolunteer.toString() !== volunteerId) {
    return { ok: false, error: "You are not assigned to this task.", httpStatus: 403 };
  }

  // ── 3. Pre-transition state guard ─────────────────────────────────────────
  const requiredStatus = type === "pickup" ? "claimed" : "picked_up";
  if (listing.status !== requiredStatus) {
    return {
      ok: false,
      error: `Listing must be in '${requiredStatus}' status to verify a ${type} OTP.`,
      httpStatus: 409,
    };
  }

  // ── 4. Load active OTP ─────────────────────────────────────────────────────
  const otp = await OTP.findOne({
    listingId,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otp) {
    return {
      ok: false,
      error: "No active OTP found. Please ask to regenerate.",
      httpStatus: 404,
    };
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return {
      ok: false,
      error: "OTP locked after too many failed attempts. A new one must be generated.",
      httpStatus: 429,
    };
  }

  // ── 5. Constant-time code comparison ──────────────────────────────────────
  const inputBuf = Buffer.from(submittedCode.padEnd(6, "\0"));
  const storedBuf = Buffer.from(otp.code.padEnd(6, "\0"));
  const match =
    inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    // Atomic increment to avoid race on attempt counter
    await OTP.findByIdAndUpdate(otp._id, { $inc: { attempts: 1 } });
    const attemptsLeft = MAX_OTP_ATTEMPTS - (otp.attempts + 1);
    return {
      ok: false,
      error: `Incorrect OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} remaining.`,
      httpStatus: 400,
      attemptsLeft,
    };
  }

  // ── 6. Mark OTP used — atomic to prevent double-submission race ────────────
  // Only succeeds if it hasn't been used yet; returns null if already consumed.
  const claimed = await OTP.findOneAndUpdate(
    { _id: otp._id, isUsed: false },
    { $set: { isUsed: true } },
    { new: true },
  );
  if (!claimed) {
    return {
      ok: false,
      error: "This OTP was already used. Please contact support.",
      httpStatus: 409,
    };
  }

  // ── 7. Advance listing status ──────────────────────────────────────────────
  const newStatus = type === "pickup" ? "picked_up" : "delivered";
  const now = new Date();

  listing.status = newStatus as "picked_up" | "delivered";
  if (type === "pickup") listing.pickedUpAt = now;
  else listing.deliveredAt = now;
  await listing.save();

  // ── 8. Sync VolunteerTask ──────────────────────────────────────────────────
  await VolunteerTask.findOneAndUpdate(
    {
      listingId: listing._id,
      volunteerId: new Types.ObjectId(volunteerId),
      status: { $nin: ["delivered", "cancelled"] },
    },
    {
      $set: {
        status: newStatus === "picked_up" ? "picked_up" : "delivered",
        ...(newStatus === "picked_up" ? { pickedUpAt: now } : { deliveredAt: now }),
      },
    },
  );

  // ── 9. Socket broadcast to all three parties ───────────────────────────────
  const donorId = listing.donorId.toString();
  const ngoId = listing.claimedBy?.toString();
  const statusPayload = { listingId, status: newStatus };

  const io = getIO();
  if (io) {
    io.to(donorId).emit("listing_status", statusPayload);
    io.to(volunteerId).emit("listing_status", statusPayload);
    if (ngoId) io.to(ngoId).emit("listing_status", statusPayload);
  }

  // ── 10. In-app notifications ───────────────────────────────────────────────
  const msgs = {
    pickup: {
      donor: "The volunteer has confirmed pickup of your food donation.",
      ngo: "Food picked up — the volunteer is on the way.",
      volunteer: "Pickup confirmed! Head to the NGO for drop-off.",
    },
    delivery: {
      donor: "Your food donation has been successfully delivered!",
      ngo: "Delivery confirmed. Thank you for claiming this listing!",
      volunteer: "Delivery complete! Great work.",
    },
  }[type];

  const notifBase = { type: `${type}_verified`, listingId };
  void Promise.all([
    sendNotification({ userId: donorId, message: msgs.donor, ...notifBase }),
    sendNotification({ userId: volunteerId, message: msgs.volunteer, ...notifBase }),
    ngoId
      ? sendNotification({ userId: ngoId, message: msgs.ngo, ...notifBase })
      : Promise.resolve(),
  ]);

  // ── 11. Auto-generate delivery OTP after pickup ────────────────────────────
  if (type === "pickup") {
    void createOTP(listingId, "delivery");
  }

  // ── 12. Wallet settlement on delivery ─────────────────────────────────────
  if (type === "delivery" && ngoId && listing.payoutAmount) {
    void settleWallet({
      ngoId,
      volunteerId,
      payoutAmount: listing.payoutAmount,
      listingId,
      io: getIO(),
    });
  }

  return { ok: true, newStatus };
}

/**
 * Legacy wrapper kept for backward compatibility with existing callers.
 * New code should use verifyAndAdvance which also advances the listing status.
 */
export async function verifyOTP(
  listingId: string,
  code: string,
  type: OTPType,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const otp = await OTP.findOne({
    listingId,
    type,
    isUsed: false,
    expiresAt: { $gt: new Date() },
  });

  if (!otp) return { ok: false, error: "No active OTP found for this task.", status: 404 };
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    return { ok: false, error: "Too many incorrect attempts. A new OTP must be generated.", status: 429 };
  }

  const inputBuf = Buffer.from(code.padEnd(6, "\0"));
  const storedBuf = Buffer.from(otp.code.padEnd(6, "\0"));
  const match = inputBuf.length === storedBuf.length && crypto.timingSafeEqual(inputBuf, storedBuf);

  if (!match) {
    otp.attempts += 1;
    await otp.save();
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts;
    return {
      ok: false,
      error: `Incorrect OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      status: 400,
    };
  }

  otp.isUsed = true;
  await otp.save();
  return { ok: true };
}
