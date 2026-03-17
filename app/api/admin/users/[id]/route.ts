import { NextResponse } from "next/server";

import { adminOnly } from "@/lib/adminOnly";
import { connectMongo } from "@/lib/mongodb";
import { logAdminAction } from "@/lib/audit";
import User from "@/models/User";

const allowedRoles = new Set(["donor", "ngo", "volunteer", "admin"] as const);

type RouteContext = {
  params: Promise<{ id: string }>;
};

export const PATCH = adminOnly(async (request: Request, { params }: RouteContext, session) => {
  const { id } = await params;
  const body = (await request.json()) as { role?: string; isActive?: boolean };

  const updates: { role?: string; isActive?: boolean } = {};

  if (typeof body.role === "string") {
    if (!allowedRoles.has(body.role as (typeof allowedRoles extends Set<infer U> ? U : never))) {
      return NextResponse.json({ error: "Invalid role value." }, { status: 400 });
    }
    updates.role = body.role;
  }

  if (typeof body.isActive === "boolean") {
    updates.isActive = body.isActive;
  }

  if (updates.role === undefined && updates.isActive === undefined) {
    return NextResponse.json({ error: "Provide role and/or isActive to update." }, { status: 400 });
  }

  await connectMongo();

  const before = await User.findById(id).select("name role isActive").lean();

  const user = await User.findByIdAndUpdate(id, updates, {
    new: true,
    runValidators: true,
  })
    .select("name email role isActive phone address createdAt")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  const action = updates.role !== undefined ? "user_role_change" : updates.isActive ? "user_activate" : "user_deactivate";
  void logAdminAction({
    adminId: session.user.id,
    adminName: session.user.name ?? "Admin",
    action,
    targetId: id,
    targetType: "user",
    targetName: user.name,
    details: { before: { role: (before as {role?: string})?.role, isActive: (before as {isActive?: boolean})?.isActive }, after: updates },
  });

  return NextResponse.json({
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
      phone: user.phone,
      address: user.address,
      createdAt: user.createdAt,
    },
  });
});

export const DELETE = adminOnly(async (_: Request, { params }: RouteContext, session) => {
  const { id } = await params;

  await connectMongo();

  const user = await User.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true, runValidators: true },
  )
    .select("name email role isActive")
    .lean();

  if (!user) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }

  void logAdminAction({
    adminId: session.user.id,
    adminName: session.user.name ?? "Admin",
    action: "user_deactivate",
    targetId: id,
    targetType: "user",
    targetName: user.name,
  });

  return NextResponse.json({
    message: "User deactivated successfully.",
    user: {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
    },
  });
});
