import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import VolunteerProfileClient from "@/components/dashboard/VolunteerProfileClient";

export default async function VolunteerProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "volunteer") {
    redirect(`/dashboard/${session.user.role}`);
  }

  return <VolunteerProfileClient sessionUser={session.user} />;
}
