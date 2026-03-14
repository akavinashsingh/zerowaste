import { connectMongo } from "@/lib/mongodb";
import { getIO } from "@/lib/socket";
import Notification from "@/models/Notification";

export async function sendNotification({
  userId,
  type,
  message,
  listingId,
}: {
  userId: string;
  type: string;
  message: string;
  listingId: string;
}): Promise<void> {
  try {
    await connectMongo();
    const notification = await Notification.create({ userId, type, message, listingId, read: false });

    const io = getIO();
    if (io) {
      io.to(userId).emit("notification", {
        _id: notification._id.toString(),
        type,
        message,
        listingId,
        read: false,
        createdAt: notification.createdAt.toISOString(),
      });
    }
  } catch (err) {
    // Non-critical — log but never throw so callers aren't affected
    console.error("[notify] Failed to send notification:", err);
  }
}
