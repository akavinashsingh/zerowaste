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
  totalQuantity: string;
  foodType: FoodType;
  expiresAt: Date;
  images: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: ListingStatus;
  claimedBy?: Types.ObjectId;
  claimedAt?: Date;
  assignedVolunteer?: Types.ObjectId;
  volunteerAssignedAt?: Date;
  pickedUpAt?: Date;
  deliveredAt?: Date;
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
  totalQuantity: { type: String, required: true, trim: true },
  foodType: { type: String, enum: ["cooked", "packaged", "raw"], required: true },
  expiresAt: { type: Date, required: true, index: true },
  images: { type: [String], default: [] },
  location: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
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
  createdAt: { type: Date, default: Date.now, index: true },
});

const FoodListing: Model<IFoodListing> =
  mongoose.models.FoodListing || mongoose.model<IFoodListing>("FoodListing", FoodListingSchema);

export default FoodListing;