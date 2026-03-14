import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import Notification from "@/models/Notification";

export async function PATCH(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  await connectMongo();

  const notification = await Notification.findOneAndUpdate(
    { _id: id, userId: session.user.id },
    { $set: { read: true } },
    { new: true },
  ).lean();

  if (!notification) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  return NextResponse.json({ notification });
}
