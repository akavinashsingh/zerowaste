import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import { parseBody, passwordChangeSchema } from "@/lib/schemas";
import User from "@/models/User";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as unknown;
  const parsed = parseBody(passwordChangeSchema, body);
  if (!parsed.success) return parsed.response;

  const { currentPassword, newPassword } = parsed.data;

  await connectMongo();

  const user = await User.findById(session.user.id).select("password").lean();
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const valid = await bcrypt.compare(currentPassword, (user as { password: string }).password);
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  await User.findByIdAndUpdate(session.user.id, { password: hashed });

  return NextResponse.json({ success: true });
}
