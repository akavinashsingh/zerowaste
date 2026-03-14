"use client";

import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";

import { useSocket } from "@/hooks/useSocket";

type AppNotification = {
  _id: string;
  type: string;
  message: string;
  listingId?: string;
  read: boolean;
  createdAt: string;
};

function timeAgo(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function NotificationBell() {
  const { data: session } = useSession();
  const { socketRef, connected } = useSocket();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId) return;

    fetch("/api/notifications")
      .then((res) => res.json())
      .then((data: { notifications?: AppNotification[] }) => {
        setNotifications(data.notifications ?? []);
      })
      .catch(() => {
        // silent — non-critical
      });
  }, [session?.user?.id]);

  // Listen for incoming socket notifications
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !connected) return;

    const handler = (notification: AppNotification) => {
      setNotifications((current) => [notification, ...current].slice(0, 20));
    };

    socket.on("notification", handler);
    return () => {
      socket.off("notification", handler);
    };
  }, [socketRef, connected]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((current) => current.map((n) => ({ ...n, read: true })));
    } catch {
      // silent
    }
  }

  async function markOneRead(id: string) {
    if (notifications.find((n) => n._id === id)?.read) return;
    try {
      await fetch(`/api/notifications/${id}`, { method: "PATCH" });
      setNotifications((current) => current.map((n) => (n._id === id ? { ...n, read: true } : n)));
    } catch {
      // silent
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative rounded-full border border-[color:var(--border)] bg-white/70 p-2.5 transition hover:bg-white"
        aria-label="Notifications"
      >
        {/* Bell icon */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-5 w-5 text-[color:var(--foreground)]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-3xl border border-[color:var(--border)] bg-white shadow-xl">
          <div className="flex items-center justify-between border-b border-[color:var(--border)] px-4 py-3">
            <h3 className="text-sm font-semibold text-[color:var(--foreground)]">Notifications</h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs text-[color:var(--accent)] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 divide-y divide-[color:var(--border)] overflow-y-auto">
            {notifications.length === 0 ? (
              <li className="px-4 py-8 text-center text-sm text-[color:var(--muted)]">No notifications yet</li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n._id}
                  className={`cursor-pointer px-4 py-3 transition hover:bg-stone-50 ${n.read ? "" : "bg-blue-50/60"}`}
                  onClick={() => void markOneRead(n._id)}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" aria-hidden="true" />
                    )}
                    <div className={!n.read ? "" : "pl-4"}>
                      <p className="text-sm text-[color:var(--foreground)]">{n.message}</p>
                      <p className="mt-0.5 text-xs text-[color:var(--muted)]">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
