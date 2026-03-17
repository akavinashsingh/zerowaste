import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type DemandUrgency = "low" | "medium" | "high";
export type DemandStatus = "open" | "fulfilled" | "expired";

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
      enum: ["open", "fulfilled", "expired"],
      default: "open",
      index: true,
    },
  },
  { timestamps: true },
);

FoodDemandSchema.index({ location: "2dsphere" });
FoodDemandSchema.index({ createdAt: -1 });

const FoodDemand: Model<IFoodDemand> =
  mongoose.models.FoodDemand || mongoose.model<IFoodDemand>("FoodDemand", FoodDemandSchema);

export default FoodDemand;
