import { connectMongo } from "@/lib/mongodb";
import AuditLog, { AuditAction } from "@/models/AuditLog";

export async function logAdminAction({
  adminId,
  adminName,
  action,
  targetId,
  targetType,
  targetName,
  details,
}: {
  adminId: string;
  adminName: string;
  action: AuditAction;
  targetId: string;
  targetType: "user" | "listing";
  targetName?: string;
  details?: Record<string, unknown>;
}) {
  try {
    await connectMongo();
    await AuditLog.create({ adminId, adminName, action, targetId, targetType, targetName, details });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
