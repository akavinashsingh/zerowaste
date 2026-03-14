import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import AdminDashboardClient from "@/components/dashboard/AdminDashboardClient";
import { authOptions } from "@/lib/auth";

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect(`/dashboard/${session.user.role}`);
  }

  return <AdminDashboardClient />;
}
