import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import VolunteerDashboardClient from "@/components/dashboard/VolunteerDashboardClient";
import { authOptions } from "@/lib/auth";

export default async function VolunteerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "volunteer") {
    redirect(`/dashboard/${session.user.role}`);
  }

  return <VolunteerDashboardClient sessionUser={session.user} />;
}
