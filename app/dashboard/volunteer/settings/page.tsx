import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SettingsClient from "@/components/dashboard/SettingsClient";

export default async function VolunteerSettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "volunteer") redirect(`/dashboard/${session.user.role}`);
  return <SettingsClient role="volunteer" />;
}
