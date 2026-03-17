import mongoose, { Schema } from "mongoose";

export type AuditAction =
  | "user_role_change"
  | "user_activate"
  | "user_deactivate"
  | "user_delete"
  | "listing_status_change"
  | "listing_delete";

const AuditLogSchema = new Schema({
  adminId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  adminName: { type: String, required: true },
  action: {
    type: String,
    enum: ["user_role_change", "user_activate", "user_deactivate", "user_delete", "listing_status_change", "listing_delete"],
    required: true,
    index: true,
  },
  targetId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ["user", "listing"], required: true },
  targetName: { type: String },
  details: { type: Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now, index: true },
});

const AuditLog = mongoose.models.AuditLog ?? mongoose.model("AuditLog", AuditLogSchema);
export default AuditLog;
