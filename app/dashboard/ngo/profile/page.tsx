import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import NgoProfileClient from "@/components/dashboard/NgoProfileClient";
import { authOptions } from "@/lib/auth";

export default async function NgoProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ngo") {
    redirect(`/dashboard/${session.user.role}`);
  }

  return <NgoProfileClient sessionUser={session.user} />;
}