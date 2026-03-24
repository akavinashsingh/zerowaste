import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type DemandUrgency = "low" | "medium" | "high";
export type DemandStatus = "open" | "accepted" | "fulfilled" | "expired";

export interface IFoodDemand extends Document {
  ngoId: Types.ObjectId;
  ngoName: string;
  mealsRequired: number;
  foodType?: string;
  urgency: DemandUrgency;
  /** GeoJSON Point — coordinates: [lng, lat] */
  location: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  status: DemandStatus;
  acceptedBy?: Types.ObjectId;
  acceptedByName?: string;
  acceptedAt?: Date;
  /** DemandDelivery document created when donor accepts */
  deliveryId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FoodDemandSchema = new Schema<IFoodDemand>(
  {
    ngoId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    ngoName: { type: String, required: true, trim: true },
    mealsRequired: { type: Number, required: true, min: 1 },
    foodType: { type: String, trim: true },
    urgency: {
      type: String,
      enum: ["low", "medium", "high"],
      required: true,
      default: "medium",
      index: true,
    },
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true, trim: true },
    },
    status: {
      type: String,
      enum: ["open", "accepted", "fulfilled", "expired"],
      default: "open",
      index: true,
    },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User", index: true },
    acceptedByName: { type: String, trim: true },
    acceptedAt: { type: Date },
    deliveryId: { type: Schema.Types.ObjectId, ref: "DemandDelivery" },
  },
  { timestamps: true },
);

FoodDemandSchema.index({ location: "2dsphere" });
FoodDemandSchema.index({ createdAt: -1 });

const FoodDemand: Model<IFoodDemand> =
  mongoose.models.FoodDemand || mongoose.model<IFoodDemand>("FoodDemand", FoodDemandSchema);

export default FoodDemand;
