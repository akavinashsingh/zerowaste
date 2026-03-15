import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DonorProfileClient from "@/components/dashboard/DonorProfileClient";

export default async function DonorProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "donor") {
    redirect(`/dashboard/${session.user.role}`);
  }

  return <DonorProfileClient sessionUser={session.user} />;
}
