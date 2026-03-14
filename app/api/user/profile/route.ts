import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    phone?: string;
    address?: string;
    location?: {
      lat?: number;
      lng?: number;
    };
  };

  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const address = String(body.address ?? "").trim();
  const lat = body.location?.lat;
  const lng = body.location?.lng;

  if (!name || !phone || !address || typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json({ error: "Name, phone, address, and location are required." }, { status: 400 });
  }

  await connectMongo();

  const updatedUser = await User.findByIdAndUpdate(
    session.user.id,
    {
      $set: {
        name,
        phone,
        address,
        location: { lat, lng },
      },
    },
    {
      new: true,
      runValidators: true,
    },
  )
    .select("name email role phone address location")
    .lean();

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  return NextResponse.json({ user: updatedUser });
}