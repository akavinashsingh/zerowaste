import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function DonorSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "donor") redirect(`/dashboard/${session.user.role}`);
  return <SettingsClient role="donor" />;
}
