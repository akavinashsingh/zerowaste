import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NgoPredictionsClient from "@/components/dashboard/NgoPredictionsClient";

export default async function NgoPredictionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ngo") redirect(`/dashboard/${session.user.role}`);
  return <NgoPredictionsClient />;
}
