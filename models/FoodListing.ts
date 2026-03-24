import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type FoodType = "cooked" | "packaged" | "raw";
export type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";

export interface FoodItem {
  name: string;
  quantity: string;
  unit: string;
}

export interface IFoodListing extends Document {
  donorId: Types.ObjectId;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  foodItems: FoodItem[];
  claimedFoodItems?: FoodItem[];
  totalQuantity: string;
  totalMeals: number;
  foodType: FoodType;
  expiresAt: Date;
  images: string[];
  /** GeoJSON Point — coordinates: [lng, lat] */
  location: {
    type: string;
    coordinates: [number, number];
    address: string;
  };
  status: ListingStatus;
  claimedBy?: Types.ObjectId;
  claimedAt?: Date;
  assignedVolunteer?: Types.ObjectId;
  volunteerAssignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
  /** Distance (km) between donor pickup and NGO drop-off, stored when volunteer accepts */
  distanceKm?: number;
  /** Calculated volunteer payout in INR */
  payoutAmount?: number;
  /** The NGO (claimedBy) responsible for this payout */
  payoutNgoId?: Types.ObjectId;
  createdAt: Date;
}

const FoodItemSchema = new Schema<FoodItem>(
  {
    name: { type: String, required: true, trim: true },
    quantity: { type: String, required: true, trim: true },
    unit: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const FoodListingSchema = new Schema<IFoodListing>({
  donorId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  donorName: { type: String, required: true, trim: true },
  donorPhone: { type: String, required: true, trim: true },
  donorAddress: { type: String, required: true, trim: true },
  foodItems: { type: [FoodItemSchema], required: true },
  claimedFoodItems: { type: [FoodItemSchema], default: undefined },
  totalQuantity: { type: String, required: true, trim: true },
  totalMeals: { type: Number, required: true, min: 0, default: 0, index: true },
  foodType: { type: String, enum: ["cooked", "packaged", "raw"], required: true },
  expiresAt: { type: Date, required: true, index: true },
  images: { type: [String], default: [] },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true },
    address: { type: String, required: true, trim: true },
  },
  status: {
    type: String,
    enum: ["available", "claimed", "picked_up", "delivered", "expired"],
    default: "available",
    index: true,
  },
  claimedBy: { type: Schema.Types.ObjectId, ref: "User" },
  claimedAt: { type: Date, index: true },
  assignedVolunteer: { type: Schema.Types.ObjectId, ref: "User", index: true },
  volunteerAssignedAt: { type: Date, index: true },
  pickedUpAt: { type: Date },
  deliveredAt: { type: Date },
  distanceKm: { type: Number, min: 0 },
  payoutAmount: { type: Number, min: 0 },
  payoutNgoId: { type: Schema.Types.ObjectId, ref: "User", index: true },
  createdAt: { type: Date, default: Date.now, index: true },
});
FoodListingSchema.index({ location: '2dsphere' });
// Compound indexes for common query patterns
FoodListingSchema.index({ status: 1, expiresAt: 1 });  // cron expiry scan
FoodListingSchema.index({ donorId: 1, status: 1 });    // donor dashboard listing fetch
FoodListingSchema.index({ claimedBy: 1, claimedAt: -1 }); // NGO claimed listings

const FoodListing: Model<IFoodListing> =
  mongoose.models.FoodListing || mongoose.model<IFoodListing>("FoodListing", FoodListingSchema);

export default FoodListing;