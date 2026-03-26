import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import cloudinary from "@/lib/cloudinary";
import { connectMongo } from "@/lib/mongodb";
import { sendNotification } from "@/lib/notify";
import { getIO } from "@/lib/socket";
import FoodListing from "@/models/FoodListing";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role !== "ngo") {
    return NextResponse.json({ error: "Only NGOs can confirm delivery." }, { status: 403 });
  }

  const { id } = await params;
  await connectMongo();

  const listing = await FoodListing.findById(id);
  if (!listing) {
    return NextResponse.json({ error: "Listing not found." }, { status: 404 });
  }

  if (listing.status !== "delivered") {
    return NextResponse.json({ error: "Listing must be in delivered status to confirm receipt." }, { status: 409 });
  }

  // Ensure this NGO is the claimant
  if (listing.claimedBy?.toString() !== session.user.id) {
    return NextResponse.json({ error: "You did not claim this listing." }, { status: 403 });
  }

  if (listing.deliveryConfirmation) {
    return NextResponse.json({ error: "Delivery already confirmed." }, { status: 409 });
  }

  const body = (await req.json()) as { photo?: string; note?: string };
  const { photo, note } = body;

  let photoUrl: string | undefined;
  if (photo) {
    const result = await cloudinary.uploader.upload(photo, {
      folder: "zerowaste/delivery-confirmations",
      resource_type: "image",
    });
    photoUrl = result.secure_url;
  }

  const confirmedAt = new Date();
  listing.deliveryConfirmation = {
    photo: photoUrl,
    note: note?.trim() || undefined,
    confirmedAt,
    confirmedByNgoId: listing.claimedBy!,
    confirmedByNgoName: session.user.name ?? "NGO",
  };
  await listing.save();

  const donorId = listing.donorId.toString();
  const listingId = listing._id.toString();

  // Notify donor
  await sendNotification({
    userId: donorId,
    type: "delivery_confirmed",
    message: `${session.user.name ?? "The NGO"} confirmed receipt of your food donation.${photoUrl ? " A photo was attached." : ""}`,
    listingId,
  });

  // Real-time socket event to donor
  const io = getIO();
  if (io) {
    io.to(donorId).emit("delivery_confirmed", {
      listingId,
      photo: photoUrl,
      note: note?.trim() || undefined,
      confirmedAt: confirmedAt.toISOString(),
      confirmedByNgoName: session.user.name ?? "NGO",
    });
  }

  return NextResponse.json({
    message: "Delivery confirmed.",
    deliveryConfirmation: {
      photo: photoUrl,
      note: note?.trim() || undefined,
      confirmedAt: confirmedAt.toISOString(),
      confirmedByNgoName: session.user.name ?? "NGO",
    },
  });
}
