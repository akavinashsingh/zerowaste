import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NgoClaimsClient from "@/components/dashboard/NgoClaimsClient";

export default async function NgoClaimsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ngo") redirect(`/dashboard/${session.user.role}`);
  return <NgoClaimsClient />;
}
