import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NotificationsClient from "@/components/dashboard/NotificationsClient";

export default async function NgoNotificationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ngo") redirect(`/dashboard/${session.user.role}`);
  return <NotificationsClient role="ngo" />;
}
