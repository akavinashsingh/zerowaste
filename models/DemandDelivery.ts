import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type DemandDeliveryStatus = "open" | "assigned" | "picked_up" | "delivered" | "cancelled";

export interface IDemandDelivery extends Document {
  demandId: Types.ObjectId;
  /** Donor who accepted the demand and will hand over food */
  donorId: Types.ObjectId;
  donorName: string;
  /** NGO who posted the demand */
  ngoId: Types.ObjectId;
  ngoName: string;
  /** Volunteer assigned to this delivery */
  volunteerId?: Types.ObjectId;
  volunteerName?: string;
  status: DemandDeliveryStatus;
  distanceKm: number | null;
  payoutAmount: number | null;
  pickupAddress: string;
  dropoffAddress: string;
  /** GeoJSON [lng, lat] — donor's location */
  pickupCoords?: [number, number];
  /** GeoJSON [lng, lat] — NGO's demand location */
  dropoffCoords?: [number, number];
  assignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const DemandDeliverySchema = new Schema<IDemandDelivery>(
  {
    demandId:       { type: Schema.Types.ObjectId, ref: "FoodDemand",  required: true, index: true },
    donorId:        { type: Schema.Types.ObjectId, ref: "User",        required: true, index: true },
    donorName:      { type: String, required: true, trim: true },
    ngoId:          { type: Schema.Types.ObjectId, ref: "User",        required: true, index: true },
    ngoName:        { type: String, required: true, trim: true },
    volunteerId:    { type: Schema.Types.ObjectId, ref: "User",        index: true },
    volunteerName:  { type: String, trim: true },
    status: {
      type: String,
      enum: ["open", "assigned", "picked_up", "delivered", "cancelled"],
      default: "open",
      index: true,
    },
    distanceKm:     { type: Number, min: 0, default: null },
    payoutAmount:   { type: Number, min: 0, default: null },
    pickupAddress:  { type: String, required: true, trim: true },
    dropoffAddress: { type: String, required: true, trim: true },
    pickupCoords:   { type: [Number] },
    dropoffCoords:  { type: [Number] },
    assignedAt:     { type: Date },
    pickedUpAt:     { type: Date },
    deliveredAt:    { type: Date },
  },
  { timestamps: true },
);

DemandDeliverySchema.index({ volunteerId: 1, status: 1 });
DemandDeliverySchema.index({ status: 1, createdAt: -1 });

const DemandDelivery: Model<IDemandDelivery> =
  mongoose.models.DemandDelivery ||
  mongoose.model<IDemandDelivery>("DemandDelivery", DemandDeliverySchema);

export default DemandDelivery;
