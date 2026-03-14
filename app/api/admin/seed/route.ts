import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export async function POST(request: Request) {
  const expectedSecret = process.env.SEED_SECRET;

  if (!expectedSecret) {
    return NextResponse.json({ error: "SEED_SECRET is not configured." }, { status: 500 });
  }

  const providedSecret = request.headers.get("x-seed-secret");

  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid seed secret." }, { status: 403 });
  }

  await connectMongo();

  const existingAdmin = await User.findOne({ role: "admin" }).lean();
  if (existingAdmin) {
    return NextResponse.json({ message: "Admin user already exists." });
  }

  const passwordHash = await bcrypt.hash("admin123", 10);

  const admin = await User.create({
    name: "Default Admin",
    email: "admin@furdial.com",
    password: passwordHash,
    role: "admin",
    phone: "0000000000",
    address: "System Seeded Admin",
    isActive: true,
  });

  return NextResponse.json(
    {
      message: "Default admin user created.",
      adminId: admin._id.toString(),
      email: admin.email,
    },
    { status: 201 },
  );
}
