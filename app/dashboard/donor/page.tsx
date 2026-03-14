import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import DonorDashboardClient from "@/components/dashboard/DonorDashboardClient";
import { authOptions } from "@/lib/auth";

export default async function DonorDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "donor") {
    redirect(`/dashboard/${session.user.role}`);
  }

  return <DonorDashboardClient donorName={session.user.name ?? "Donor"} />;
}
