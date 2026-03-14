import { NextResponse } from "next/server";

import cloudinary from "@/lib/cloudinary";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const formData = await request.formData();
  const image = formData.get("image");

  if (!(image instanceof File)) {
    return NextResponse.json({ error: "An image file is required." }, { status: 400 });
  }

  const bytes = Buffer.from(await image.arrayBuffer());
  const dataUri = `data:${image.type};base64,${bytes.toString("base64")}`;

  const uploadResult = await cloudinary.uploader.upload(dataUri, {
    folder: "zerowaste/listings",
    resource_type: "image",
  });

  return NextResponse.json({ url: uploadResult.secure_url });
}