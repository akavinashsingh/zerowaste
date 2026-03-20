import mongoose, { Document, Model, Schema, Types } from "mongoose";

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  message: string;
  listingId?: Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, required: true },
  message: { type: String, required: true },
  listingId: { type: Schema.Types.ObjectId, ref: "FoodListing" },
  read: { type: Boolean, default: false, index: true },
  createdAt: { type: Date, default: Date.now },
});

// TTL index: auto-delete notifications older than 30 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });
// Compound index for unread count query (used in dashboard layout)
NotificationSchema.index({ userId: 1, read: 1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
