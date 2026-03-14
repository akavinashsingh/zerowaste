import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { authOptions } from "@/lib/auth";
import DashboardNavbar from "@/components/DashboardNavbar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <DashboardNavbar user={{ name: session.user.name, role: session.user.role }} />
      <main>{children}</main>
    </div>
  );
}
