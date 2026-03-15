
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Handshake,
  HeartHandshake,
  Package,
  Users,
  Settings,
  LogOut,
} from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import Image from "next/image";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Listings", href: "/dashboard/listings", icon: Package },
  { name: "Donations", href: "/dashboard/donations", icon: HeartHandshake },
  { name: "Partnerships", href: "/dashboard/partnerships", icon: Handshake },
  { name: "Team", href: "/dashboard/team", icon: Users },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
];

const RoleBadge = ({ role }: { role: string }) => {
  const roleStyles: { [key: string]: string } = {
    NGO: "bg-blue-100 text-blue-800",
    Donor: "bg-green-100 text-green-800",
    Volunteer: "bg-yellow-100 text-yellow-800",
  };
  return (
    <span
      className={`px-2 py-1 text-xs font-medium rounded-full ${
        roleStyles[role] || "bg-gray-100 text-gray-800"
      }`}
    >
      {role}
    </span>
  );
};

const UserAvatar = ({ name, role }: { name: string; role: string }) => {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white font-bold">
        {initials}
      </div>
      <div className="flex flex-col">
        <span className="font-semibold text-sm text-gray-800">{name}</span>
        <RoleBadge role={role} />
      </div>
    </div>
  );
};

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200">
      <div className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="ZeroWaste Logo" width={32} height={32} />
          <span className="text-xl font-bold text-gray-800">ZeroWaste</span>
        </Link>
      </div>
      <nav className="flex-1 px-4 py-4">
        <ul>
          {navItems.map((item) => (
            <li key={item.name}>
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  pathname === item.href
                    ? "bg-green-600 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <div className="p-4 border-t border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <UserAvatar name={session.user.name || "User"} role={session.user.role || "Role"} />
        </div>
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
