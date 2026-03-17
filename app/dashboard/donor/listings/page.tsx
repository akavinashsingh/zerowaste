import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DonorListingsClient from "@/components/dashboard/DonorListingsClient";

export default async function DonorListingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "donor") redirect(`/dashboard/${session.user.role}`);
  return <DonorListingsClient />;
}
