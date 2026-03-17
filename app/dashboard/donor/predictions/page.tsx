import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import DonorPredictionsClient from "@/components/dashboard/DonorPredictionsClient";

export default async function DonorPredictionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "donor") redirect(`/dashboard/${session.user.role}`);
  return <DonorPredictionsClient />;
}
