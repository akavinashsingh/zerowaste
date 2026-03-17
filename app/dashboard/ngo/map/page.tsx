import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NgoMapClient from "@/components/dashboard/NgoMapClient";

export default async function NgoMapPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ngo") redirect(`/dashboard/${session.user.role}`);

  return (
    <NgoMapClient
      userLocation={session.user.location ?? null}
      userId={session.user.id}
    />
  );
}
