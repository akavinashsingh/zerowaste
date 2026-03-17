import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminListingsClient from "@/components/dashboard/AdminListingsClient";

export default async function AdminListingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect(`/dashboard/${session.user.role}`);

  return <AdminListingsClient />;
}
