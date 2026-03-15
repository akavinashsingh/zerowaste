import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { DashboardLayout as SidebarLayout } from "@/components/dashboard/Sidebar";
import { authOptions } from "@/lib/auth";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;

  if (!["donor", "ngo", "volunteer", "admin"].includes(role)) {
    redirect("/login");
  }

  return (
    <SidebarLayout
      role={role}
      userName={session.user.name ?? "User"}
      userEmail={session.user.email ?? undefined}
      notificationCount={3}
    >
      {children}
    </SidebarLayout>
  );
}

