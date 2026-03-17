import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import AdminMapClient from "@/components/dashboard/AdminMapClient";

export default async function AdminMapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "admin") redirect(`/dashboard/${session.user.role}`);

  return <AdminMapClient />;
}
