import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || session.user.role !== "volunteer") {
    return NextResponse.json({ error: "Only volunteers can update availability." }, { status: 403 });
  }

  const body = (await request.json()) as { isAvailable?: boolean };

  if (typeof body.isAvailable !== "boolean") {
    return NextResponse.json({ error: "isAvailable must be a boolean." }, { status: 400 });
  }

  await connectMongo();

  await User.findByIdAndUpdate(session.user.id, { $set: { isAvailable: body.isAvailable } });

  return NextResponse.json({ isAvailable: body.isAvailable });
}
