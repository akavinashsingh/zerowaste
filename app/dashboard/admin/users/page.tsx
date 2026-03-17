import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminUsersClient from "@/components/dashboard/AdminUsersClient";

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect(`/dashboard/${session.user.role}`);

  return <AdminUsersClient />;
}
