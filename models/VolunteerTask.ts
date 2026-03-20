import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type VolunteerTaskStatus = "assigned" | "picked_up" | "delivered" | "cancelled";

export interface IVolunteerTask extends Document {
  listingId: Types.ObjectId;
  donorId: Types.ObjectId;
  ngoId: Types.ObjectId;
  volunteerId: Types.ObjectId;
  status: VolunteerTaskStatus;
  /** Distance (km) from listing pickup to NGO drop-off */
  distanceKm: number | null;
  /** Volunteer payout in INR */
  payoutAmount: number | null;
  assignedAt: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
}

const VolunteerTaskSchema = new Schema<IVolunteerTask>({
  listingId: { type: Schema.Types.ObjectId, ref: "FoodListing", required: true, index: true },
  donorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ngoId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  volunteerId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: {
    type: String,
    enum: ["assigned", "picked_up", "delivered", "cancelled"],
    default: "assigned",
    index: true,
  },
  distanceKm: { type: Number, min: 0, default: null },
  payoutAmount: { type: Number, min: 0, default: null },
  assignedAt: { type: Date, default: Date.now, index: true },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
});

// Compound indexes for common query patterns
VolunteerTaskSchema.index({ volunteerId: 1, status: 1 }); // isVolunteerBusy() check
VolunteerTaskSchema.index({ listingId: 1, status: 1 });   // task sync on listing updates

const VolunteerTask: Model<IVolunteerTask> =
  mongoose.models.VolunteerTask ||
  mongoose.model<IVolunteerTask>("VolunteerTask", VolunteerTaskSchema);

export default VolunteerTask;
