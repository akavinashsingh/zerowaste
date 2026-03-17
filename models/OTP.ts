import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type OTPType = "pickup" | "delivery";

export interface IOTP extends Document {
  listingId: Types.ObjectId;
  type: OTPType;
  /** Plain 6-digit code — only the authorized recipient may read this field */
  code: string;
  /**
   * Who is shown this code and must relay it to the volunteer:
   *   pickup   → donor (they show the code at handoff)
   *   delivery → NGO   (they show the code at drop-off)
   */
  recipientId: Types.ObjectId;
  isUsed: boolean;
  /** Failed attempt counter — locked after MAX_OTP_ATTEMPTS */
  attempts: number;
  /** MongoDB TTL index auto-deletes expired documents */
  expiresAt: Date;
  createdAt: Date;
}

/** Maximum wrong guesses before the OTP is locked */
export const MAX_OTP_ATTEMPTS = 5;

/** How long (ms) until an OTP expires */
export const OTP_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const OTPSchema = new Schema<IOTP>({
  listingId: { type: Schema.Types.ObjectId, ref: "FoodListing", required: true },
  type: { type: String, enum: ["pickup", "delivery"], required: true },
  code: { type: String, required: true },
  recipientId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  isUsed: { type: Boolean, default: false, index: true },
  attempts: { type: Number, default: 0, min: 0 },
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

// One active OTP per listing+type combination
OTPSchema.index({ listingId: 1, type: 1 });

// MongoDB TTL — auto-deletes documents when expiresAt is reached
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const OTP: Model<IOTP> =
  mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
