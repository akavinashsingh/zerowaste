"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Bell, CheckCheck, Package } from "lucide-react";

type Role = "donor" | "ngo" | "volunteer" | "admin";

type Notification = {
  _id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

const ROLE_ACCENT: Record<Role, string> = {
  donor: "#1a5c38",
  ngo: "#1e40af",
  volunteer: "#c8601a",
  admin: "#4c1d95",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

function groupByDay(notifications: Notification[]) {
  const groups: Record<string, Notification[]> = {};
  for (const n of notifications) {
    const d = new Date(n.createdAt);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) {
      label = "Today";
    } else if (d.toDateString() === yesterday.toDateString()) {
      label = "Yesterday";
    } else {
      label = d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    }

    (groups[label] ??= []).push(n);
  }
  return groups;
}

export default function NotificationsClient({ role }: { role: Role }) {
  const accent = ROLE_ACCENT[role];
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = (await res.json()) as { notifications?: Notification[] };
      setNotifications(data.notifications ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  async function markAllRead() {
    setMarkingAll(true);
    try {
      await fetch("/api/notifications", { method: "PATCH" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  async function markOneRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const groups = groupByDay(notifications);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .nt { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .nt-inner { max-width:720px; margin:0 auto; }
        .nt-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .nt-title-row { display:flex; flex-direction:column; gap:4px; }
        .nt-back { display:inline-flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:0.75rem; padding:5px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); transition:all 0.15s; width:fit-content; }
        .nt-back:hover { color:#2c2820; }
        .nt-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .nt-sub { font-size:0.875rem; color:#6b6560; font-weight:300; }
        .nt-mark-all { display:inline-flex; align-items:center; gap:6px; padding:8px 16px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .nt-mark-all:hover:not(:disabled) { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .nt-mark-all:disabled { opacity:0.5; cursor:not-allowed; }
        .nt-group-label { font-size:0.7rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#a09a94; margin-bottom:0.75rem; margin-top:1.5rem; }
        .nt-group-label:first-child { margin-top:0; }
        .nt-item { background:white; border-radius:16px; border:1px solid rgba(44,40,32,0.07); padding:1rem 1.25rem; margin-bottom:0.625rem; display:flex; align-items:flex-start; gap:12px; transition:all 0.18s; cursor:pointer; }
        .nt-item:hover { box-shadow:0 4px 14px rgba(44,40,32,0.08); }
        .nt-item.unread { border-left:3px solid var(--accent); background:linear-gradient(to right, #f8fffe, white); }
        .nt-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:6px; }
        .nt-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .nt-content { flex:1; min-width:0; }
        .nt-msg { font-size:0.875rem; color:#2c2820; line-height:1.5; font-weight:500; }
        .nt-item.read .nt-msg { color:#6b6560; font-weight:400; }
        .nt-time { font-size:0.72rem; color:#a09a94; margin-top:4px; }
        .nt-empty { text-align:center; padding:4rem 2rem; background:white; border-radius:20px; border:1.5px dashed rgba(44,40,32,0.12); }
        .nt-empty-icon { font-size:3rem; margin-bottom:1rem; opacity:0.35; }
        .nt-empty-title { font-family:'Fraunces',serif; font-size:1.2rem; font-weight:700; color:#2c2820; margin-bottom:0.5rem; }
        .nt-empty-sub { font-size:0.875rem; color:#a09a94; font-weight:300; }
        .nt-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:16px; height:72px; margin-bottom:0.625rem; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
      <style>{`:root { --accent: ${accent}; }`}</style>

      <div className="nt">
        <div className="nt-inner">
          <div className="nt-header">
            <div className="nt-title-row">
              <Link href={`/dashboard/${role}`} className="nt-back">← Dashboard</Link>
              <div className="nt-title">Notifications</div>
              <div className="nt-sub">
                {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}` : "All caught up!"}
              </div>
            </div>
            {unreadCount > 0 && (
              <button
                className="nt-mark-all"
                onClick={() => void markAllRead()}
                disabled={markingAll}
              >
                <CheckCheck size={14} />
                {markingAll ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>

          {loading ? (
            [1, 2, 3, 4, 5].map((i) => <div key={i} className="nt-skeleton" />)
          ) : notifications.length === 0 ? (
            <div className="nt-empty">
              <div className="nt-empty-icon"><Bell /></div>
              <div className="nt-empty-title">No notifications yet</div>
              <div className="nt-empty-sub">You&apos;ll see updates about your listings and activity here.</div>
            </div>
          ) : (
            Object.entries(groups).map(([label, items]) => (
              <div key={label}>
                <div className="nt-group-label">{label}</div>
                {items.map((n) => (
                  <div
                    key={n._id}
                    className={`nt-item ${n.read ? "read" : "unread"}`}
                    onClick={() => { if (!n.read) void markOneRead(n._id); }}
                  >
                    <div
                      className="nt-icon"
                      style={{ background: n.read ? "#f5f3ef" : `${accent}18`, color: n.read ? "#a09a94" : accent }}
                    >
                      <Package size={16} />
                    </div>
                    <div className="nt-content">
                      <div className="nt-msg">{n.message}</div>
                      <div className="nt-time">{timeAgo(n.createdAt)}</div>
                    </div>
                    {!n.read && (
                      <div className="nt-dot" style={{ background: accent }} />
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}
