import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import { connectMongo } from "@/lib/mongodb";
import User from "@/models/User";
import VolunteerProfileClient from "@/components/dashboard/VolunteerProfileClient";

export default async function VolunteerProfilePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "volunteer") {
    redirect(`/dashboard/${session.user.role}`);
  }

  await connectMongo();
  const user = await User.findById(session.user.id).select("isAvailable").lean();
  const isAvailable = (user as { isAvailable?: boolean } | null)?.isAvailable !== false;

  return <VolunteerProfileClient sessionUser={{ ...session.user, isAvailable }} />;
}
