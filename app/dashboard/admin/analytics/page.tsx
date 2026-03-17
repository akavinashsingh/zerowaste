import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminAnalyticsClient from "@/components/dashboard/AdminAnalyticsClient";

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect(`/dashboard/${session.user.role}`);

  return <AdminAnalyticsClient />;
}
