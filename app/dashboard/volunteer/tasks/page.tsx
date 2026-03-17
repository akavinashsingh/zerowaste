import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import VolunteerTasksClient from "@/components/dashboard/VolunteerTasksClient";

export default async function VolunteerTasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "volunteer") redirect(`/dashboard/${session.user.role}`);

  return (
    <VolunteerTasksClient
      sessionUser={{
        id: session.user.id,
        name: session.user.name,
        location: session.user.location ?? undefined,
      }}
    />
  );
}
