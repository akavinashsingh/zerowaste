import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import DonorDashboardClient from "@/components/dashboard/DonorDashboardClient";
import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";

export default async function DonorDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "donor") {
    redirect(`/dashboard/${session.user.role}`);
  }

  await connectMongo();
  const user = await User.findById(session.user.id)
    .select("address location")
    .lean() as { address?: string; location?: { coordinates?: [number, number] } } | null;

  const donorAddress = user?.address ?? "";
  const coords = user?.location?.coordinates;
  const donorLat = coords ? coords[1] : undefined;
  const donorLng = coords ? coords[0] : undefined;

  return (
    <DonorDashboardClient
      donorName={session.user.name ?? "Donor"}
      donorAddress={donorAddress}
      donorLat={donorLat}
      donorLng={donorLng}
    />
  );
}
