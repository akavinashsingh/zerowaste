import mongoose, { Document, Model, Schema, Types } from "mongoose";

export type WalletTxType =
  | "delivery_credit"   // volunteer receives payout after delivery
  | "delivery_debit"    // NGO pays payout after delivery
  | "top_up"            // admin/system adds funds
  | "refund";           // refund on cancellation

export interface IWalletTransaction extends Document {
  userId: Types.ObjectId;
  /** Positive = credit, negative = debit */
  amount: number;
  type: WalletTxType;
  listingId?: Types.ObjectId;
  description: string;
  /** Running wallet balance after this transaction */
  balanceAfter: number;
  createdAt: Date;
}

const WalletTransactionSchema = new Schema<IWalletTransaction>({
  userId:      { type: Schema.Types.ObjectId, ref: "User",        required: true, index: true },
  amount:      { type: Number,                                     required: true },
  type:        { type: String, enum: ["delivery_credit", "delivery_debit", "top_up", "refund"], required: true },
  listingId:   { type: Schema.Types.ObjectId, ref: "FoodListing" },
  description: { type: String,                                     required: true },
  balanceAfter:{ type: Number,                                     required: true },
  createdAt:   { type: Date, default: Date.now },
});

WalletTransactionSchema.index({ userId: 1, createdAt: -1 }); // wallet history query
WalletTransactionSchema.index({ listingId: 1 });              // lookup by listing

const WalletTransaction: Model<IWalletTransaction> =
  mongoose.models.WalletTransaction ||
  mongoose.model<IWalletTransaction>("WalletTransaction", WalletTransactionSchema);

export default WalletTransaction;
