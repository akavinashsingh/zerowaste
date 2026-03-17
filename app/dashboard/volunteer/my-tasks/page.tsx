import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import VolunteerMyTasksClient from "@/components/dashboard/VolunteerMyTasksClient";

export default async function VolunteerMyTasksPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "volunteer") redirect(`/dashboard/${session.user.role}`);

  return (
    <VolunteerMyTasksClient
      sessionUser={{
        id: session.user.id,
        name: session.user.name,
        location: session.user.location ?? undefined,
      }}
    />
  );
}
