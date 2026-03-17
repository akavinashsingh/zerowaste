import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type OTPType = "pickup" | "delivery";

export interface IOTP extends Document {
  listingId: Types.ObjectId;
  code: string;         // plain 6-digit code — shown to authorized role
  expiresAt: Date;
  type: OTPType;
  verified: boolean;
  attempts: number;     // rate-limit brute force
}

const OTPSchema = new Schema<IOTP>({
  listingId: { type: Schema.Types.ObjectId, ref: "FoodListing", required: true, index: true },
  code: { type: String, required: true, length: 6 },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  type: { type: String, enum: ["pickup", "delivery"], required: true },
  verified: { type: Boolean, default: false },
  attempts: { type: Number, default: 0, min: 0 },
});

OTPSchema.index({ listingId: 1, type: 1 });

const OTP: Model<IOTP> =
  mongoose.models.OTP || mongoose.model<IOTP>("OTP", OTPSchema);

export default OTP;
