"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

import NotificationBell from "@/components/NotificationBell";

type NavUser = {
  name?: string | null;
  role?: string;
};

const roleColors: Record<string, string> = {
  donor: "bg-emerald-100 text-emerald-800",
  ngo: "bg-blue-100 text-blue-800",
  volunteer: "bg-purple-100 text-purple-800",
  admin: "bg-red-100 text-red-800",
};

export default function DashboardNavbar({ user }: { user: NavUser }) {
  return (
    <nav className="sticky top-0 z-40 border-b border-[color:var(--border)] bg-[color:var(--surface)]/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-10">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-[color:var(--accent)]"
        >
          ZeroWaste
        </Link>

        <div className="flex items-center gap-3">
          {user.name && (
            <span className="hidden text-sm font-medium text-[color:var(--foreground)] sm:block">
              {user.name}
            </span>
          )}
          {user.role && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${roleColors[user.role] ?? "bg-stone-100 text-stone-800"}`}
            >
              {user.role}
            </span>
          )}
          <NotificationBell />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-full border border-[color:var(--border)] bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
