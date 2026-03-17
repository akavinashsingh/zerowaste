import crypto from "crypto";
import { connectMongo } from "@/lib/mongodb";
import OTP, { OTPType } from "@/models/OTP";

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const MAX_OTP_ATTEMPTS = 5;

/** Generate a cryptographically random 6-digit OTP string. */
export function generateOTPCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Create a new OTP for a listing, invalidating any previous unverified OTP
 * of the same type. Returns the plain code (to be shown to authorized role).
 */
export async function createOTP(listingId: string, type: OTPType): Promise<string> {
  await connectMongo();

  // Invalidate previous unverified OTPs for this listing + type
  await OTP.deleteMany({ listingId, type, verified: false });

  const code = generateOTPCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  await OTP.create({ listingId, code, expiresAt, type });

  return code;
}

/**
 * Verify an OTP submission.
 * Returns { ok: true } on success or { ok: false, error: string } on failure.
 * Increments attempt counter; blocks after MAX_OTP_ATTEMPTS.
 */
export async function verifyOTP(
  listingId: string,
  code: string,
  type: OTPType,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  await connectMongo();

  const otp = await OTP.findOne({ listingId, type, verified: false });

  if (!otp) {
    return { ok: false, error: "No active OTP found for this task.", status: 404 };
  }

  if (otp.expiresAt < new Date()) {
    await otp.deleteOne();
    return { ok: false, error: "OTP has expired. A new one must be generated.", status: 410 };
  }

  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await otp.deleteOne();
    return { ok: false, error: "Too many incorrect attempts. A new OTP must be generated.", status: 429 };
  }

  // Constant-time comparison to prevent timing attacks
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

  otp.verified = true;
  await otp.save();

  return { ok: true };
}
