import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Auth / User                                                         */
/* ------------------------------------------------------------------ */

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.enum(["donor", "ngo", "volunteer"]),
  phone: z.string().optional(),
  address: z.string().optional(),
  location: z
    .object({
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    })
    .optional(),
});

export const profileUpdateSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().min(1, "Phone is required"),
  address: z.string().min(1, "Address is required"),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
  }),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(6, "New password must be at least 6 characters"),
});

/* ------------------------------------------------------------------ */
/*  Food Listings                                                       */
/* ------------------------------------------------------------------ */

const foodItemSchema = z.object({
  name: z.string().min(1, "Food item name is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unit: z.enum(["kg", "g", "litres", "pcs", "packets", "boxes", "servings"]),
});

export const createListingSchema = z.object({
  foodItems: z.array(foodItemSchema).min(1, "At least one food item is required"),
  foodType: z.enum(["cooked", "packaged", "raw"]),
  totalQuantity: z.string().min(1, "Total quantity is required"),
  quantityMeals: z.number().min(1, "Must have at least 1 meal"),
  expiresAt: z.string().min(1, "Expiry date is required"),
  images: z.array(z.string().url()).optional().default([]),
  location: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180),
    address: z.string().min(1, "Address is required"),
  }),
});

export const updateListingStatusSchema = z.object({
  status: z.enum(["picked_up", "delivered"]),
});

export const adminUpdateListingStatusSchema = z.object({
  status: z.enum(["available", "claimed", "picked_up", "delivered", "expired"]),
});

/* ------------------------------------------------------------------ */
/*  Admin User Management                                               */
/* ------------------------------------------------------------------ */

export const adminUpdateUserSchema = z.object({
  role: z.enum(["donor", "ngo", "volunteer", "admin"]).optional(),
  isActive: z.boolean().optional(),
}).refine((data) => data.role !== undefined || data.isActive !== undefined, {
  message: "At least one of role or isActive must be provided",
});

/* ------------------------------------------------------------------ */
/*  Helper: parse and return 400 on failure                             */
/* ------------------------------------------------------------------ */

import { NextResponse } from "next/server";

export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { success: true; data: T } | { success: false; response: ReturnType<typeof NextResponse.json> } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const errors = result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  return {
    success: false,
    response: NextResponse.json({ error: errors.join("; ") }, { status: 400 }),
  };
}
