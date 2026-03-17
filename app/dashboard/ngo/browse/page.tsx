import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import NgoBrowseClient from "@/components/dashboard/NgoBrowseClient";

export default async function NgoBrowsePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ngo") redirect(`/dashboard/${session.user.role}`);

  const sessionUser = {
    id: session.user.id,
    name: session.user.name,
    location: session.user.location ?? undefined,
  };

  return <NgoBrowseClient sessionUser={sessionUser} />;
}
