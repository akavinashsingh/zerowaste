
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";
import {
  LayoutDashboard, ListChecks, Package, Users, Settings,
  LogOut, ChevronRight, Sparkles, MapPin, Bell,
  Truck, HandHeart, ShieldCheck, BarChart3, Menu, X,
  ClipboardList, UserCircle2
} from "lucide-react";

type Role = "donor" | "ngo" | "volunteer" | "admin";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string | number;
  highlight?: boolean;
}

interface NavGroup {
  group?: string;
  items: NavItem[];
}

function getNav(role: Role): NavGroup[] {
  const base = `/dashboard/${role}`;

  const maps: Record<Role, NavGroup[]> = {
    donor: [
      {
        items: [
          { label: "Dashboard", href: base, icon: <LayoutDashboard size={17} /> },
          { label: "My Listings", href: `${base}/listings`, icon: <Package size={17} /> },
          { label: "AI Forecast", href: `${base}/predictions`, icon: <Sparkles size={17} />, highlight: true },
        ],
      },
      {
        group: "Account",
        items: [
          { label: "Profile", href: `${base}/profile`, icon: <UserCircle2 size={17} /> },
          { label: "Settings", href: `${base}/settings`, icon: <Settings size={17} /> },
        ],
      },
    ],
    ngo: [
      {
        items: [
          { label: "Dashboard", href: base, icon: <LayoutDashboard size={17} /> },
          { label: "Browse Food", href: `${base}/browse`, icon: <ListChecks size={17} /> },
          { label: "My Claims", href: `${base}/claims`, icon: <ClipboardList size={17} /> },
          { label: "Predicted Surplus", href: `${base}/predictions`, icon: <Sparkles size={17} />, highlight: true },
          { label: "Live Map", href: `${base}/map`, icon: <MapPin size={17} /> },
        ],
      },
      {
        group: "Account",
        items: [
          { label: "Profile", href: `${base}/profile`, icon: <UserCircle2 size={17} /> },
          { label: "Settings", href: `${base}/settings`, icon: <Settings size={17} /> },
        ],
      },
    ],
    volunteer: [
      {
        items: [
          { label: "Dashboard", href: base, icon: <LayoutDashboard size={17} /> },
          { label: "Available Tasks", href: `${base}/tasks`, icon: <Truck size={17} /> },
          { label: "My Tasks", href: `${base}/my-tasks`, icon: <HandHeart size={17} /> },
        ],
      },
      {
        group: "Account",
        items: [
          { label: "Profile", href: `${base}/profile`, icon: <UserCircle2 size={17} /> },
          { label: "Settings", href: `${base}/settings`, icon: <Settings size={17} /> },
        ],
      },
    ],
    admin: [
      {
        items: [
          { label: "Overview", href: base, icon: <LayoutDashboard size={17} /> },
          { label: "Users", href: `${base}/users`, icon: <Users size={17} /> },
          { label: "Listings", href: `${base}/listings`, icon: <ListChecks size={17} /> },
          { label: "Live Map", href: `${base}/map`, icon: <MapPin size={17} /> },
          { label: "Analytics", href: `${base}/analytics`, icon: <BarChart3 size={17} /> },
          { label: "Moderation", href: `${base}/moderation`, icon: <ShieldCheck size={17} /> },
        ],
      },
      {
        group: "Account",
        items: [
          { label: "Settings", href: `${base}/settings`, icon: <Settings size={17} /> },
        ],
      },
    ],
  };

  return maps[role];
}

const ROLE_META: Record<Role, { label: string; emoji: string; color: string; bg: string }> = {
  donor: { label: "Donor", emoji: "🍽️", color: "#1a5c38", bg: "#e8f5ee" },
  ngo: { label: "NGO", emoji: "🤝", color: "#1e40af", bg: "#dbeafe" },
  volunteer: { label: "Volunteer", emoji: "🚗", color: "#c8601a", bg: "#fff7ed" },
  admin: { label: "Admin", emoji: "🛡️", color: "#4c1d95", bg: "#ede9fe" },
};

interface SidebarProps {
  role: Role;
  userName: string;
  userEmail?: string;
  notificationCount?: number;
}

export default function Sidebar({ role, userName, userEmail, notificationCount = 0 }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const nav = getNav(role);
  const roleMeta = ROLE_META[role];

  const initials = userName.trim().split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase() || "?";

  function isActive(href: string) {
    if (href === `/dashboard/${role}`) return pathname === href;
    return pathname.startsWith(href);
  }

  const renderSidebarContent = () => (
    <div className="sb-inner">
      <div className="sb-logo-wrap">
        <Link href="/" className="sb-logo">
          <div className="sb-logo-mark">🌿</div>
          <span className="sb-logo-text">FeedForward</span>
        </Link>
      </div>

      <nav className="sb-nav">
        {nav.map((group, gi) => (
          <div key={gi} className="sb-group">
            {group.group && (
              <div className="sb-group-label">{group.group}</div>
            )}
            {group.items.map(item => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`sb-link ${active ? "active" : ""} ${item.highlight ? "highlight" : ""}`}
                  onClick={() => setMobileOpen(false)}
                >
                  <span className={`sb-link-icon ${active ? "active" : ""} ${item.highlight ? "highlight" : ""}`}>
                    {item.icon}
                  </span>
                  <span className="sb-link-label">{item.label}</span>
                  {item.badge && (
                    <span className="sb-badge">{item.badge}</span>
                  )}
                  {item.highlight && !active && (
                    <span className="sb-ai-pip" />
                  )}
                  {active && <ChevronRight size={13} className="sb-link-arrow" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {notificationCount > 0 && (
        <Link href={`/dashboard/${role}/notifications`} className="sb-notif-strip">
          <div className="sb-notif-icon">
            <Bell size={14} />
            <span className="sb-notif-count">{notificationCount > 99 ? "99+" : notificationCount}</span>
          </div>
          <div className="sb-notif-text">
            <div className="sb-notif-title">{notificationCount} new notification{notificationCount > 1 ? "s" : ""}</div>
            <div className="sb-notif-sub">Tap to view all</div>
          </div>
          <ChevronRight size={13} style={{ color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
        </Link>
      )}

      <div className="sb-user-card">
        <div className="sb-user-avatar">{initials}</div>
        <div className="sb-user-info">
          <div className="sb-user-name">{userName}</div>
          {userEmail && <div className="sb-user-email">{userEmail}</div>}
          <div
            className="sb-user-role"
            style={{ background: roleMeta.bg, color: roleMeta.color }}
          >
            {roleMeta.emoji} {roleMeta.label}
          </div>
        </div>
        <button
          className="sb-logout-btn"
          onClick={() => signOut({ callbackUrl: "/login" })}
          title="Sign out"
        >
          <LogOut size={15} />
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        .sb-sidebar { width: 256px; height: 100vh; position: fixed; left: 0; top: 0; background: #1c1a17; display: flex; flex-direction: column; z-index: 50; border-right: 1px solid rgba(255,255,255,0.05); }
        .sb-inner { display: flex; flex-direction: column; height: 100%; padding: 0 0 1rem; overflow-y: auto; scrollbar-width: none; }
        .sb-inner::-webkit-scrollbar { display: none; }

        .sb-logo-wrap { padding: 1.4rem 1.25rem 1.1rem; border-bottom: 1px solid rgba(255,255,255,0.06); margin-bottom: 0.5rem; flex-shrink: 0; }
        .sb-logo { display: flex; align-items: center; gap: 10px; text-decoration: none; }
        .sb-logo-mark { width: 34px; height: 34px; background: #1a5c38; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1rem; box-shadow: 0 2px 10px rgba(26,92,56,0.4); flex-shrink: 0; }
        .sb-logo-text { font-family: 'Fraunces', serif; font-size: 1.1rem; font-weight: 900; color: white; letter-spacing: -0.03em; }

        .sb-nav { flex: 1; padding: 0 0.875rem; display: flex; flex-direction: column; gap: 0.125rem; }
        .sb-group { margin-bottom: 0.75rem; }
        .sb-group-label { font-size: 0.65rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(255,255,255,0.25); padding: 0.5rem 0.75rem 0.35rem; font-family: 'DM Sans', sans-serif; }

        .sb-link { display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.75rem; border-radius: 12px; text-decoration: none; transition: all 0.18s; position: relative; color: rgba(255,255,255,0.5); font-family: 'DM Sans', sans-serif; font-size: 0.875rem; font-weight: 500; }
        .sb-link:hover { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.85); }
        .sb-link.active { background: rgba(26,92,56,0.35); color: white; font-weight: 600; }
        .sb-link.highlight:not(.active) { color: rgba(134,239,172,0.8); }
        .sb-link.highlight:not(.active):hover { background: rgba(26,92,56,0.2); color: #86efac; }

        .sb-link-icon { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background: rgba(255,255,255,0.06); transition: all 0.18s; }
        .sb-link:hover .sb-link-icon { background: rgba(255,255,255,0.10); }
        .sb-link-icon.active { background: #1a5c38; box-shadow: 0 2px 8px rgba(26,92,56,0.5); }
        .sb-link-icon.highlight:not(.active) { background: rgba(26,92,56,0.25); color: #86efac; }
        .sb-link-label { flex: 1; }
        .sb-link-arrow { color: rgba(255,255,255,0.3); flex-shrink: 0; }

        .sb-badge { min-width: 20px; height: 20px; padding: 0 5px; background: #dc2626; color: white; border-radius: 100px; font-size: 0.65rem; font-weight: 800; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; }

        .sb-ai-pip { width: 6px; height: 6px; border-radius: 50%; background: #86efac; animation: pip-pulse 2s ease-in-out infinite; flex-shrink: 0; }
        @keyframes pip-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }

        .sb-notif-strip { display: flex; align-items: center; gap: 10px; margin: 0 0.875rem 0.75rem; padding: 0.75rem 1rem; background: linear-gradient(135deg, rgba(26,92,56,0.4), rgba(45,122,80,0.3)); border: 1px solid rgba(26,92,56,0.4); border-radius: 14px; text-decoration: none; transition: all 0.18s; }
        .sb-notif-strip:hover { background: linear-gradient(135deg, rgba(26,92,56,0.55), rgba(45,122,80,0.45)); }
        .sb-notif-icon { position: relative; width: 32px; height: 32px; background: rgba(255,255,255,0.1); border-radius: 9px; display: flex; align-items: center; justify-content: center; color: white; flex-shrink: 0; }
        .sb-notif-count { position: absolute; top: -4px; right: -4px; min-width: 16px; height: 16px; background: #ef4444; color: white; border-radius: 100px; font-size: 0.6rem; font-weight: 800; display: flex; align-items: center; justify-content: center; padding: 0 3px; font-family: 'DM Sans', sans-serif; border: 1.5px solid #1c1a17; }
        .sb-notif-title { font-size: 0.78rem; font-weight: 600; color: white; font-family: 'DM Sans', sans-serif; }
        .sb-notif-sub { font-size: 0.68rem; color: rgba(255,255,255,0.45); font-family: 'DM Sans', sans-serif; }

        .sb-user-card { margin: 0 0.875rem; padding: 0.875rem 1rem; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .sb-user-avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #1a5c38, #2d7a50); display: flex; align-items: center; justify-content: center; font-family: 'Fraunces', serif; font-size: 0.9rem; font-weight: 900; color: white; flex-shrink: 0; box-shadow: 0 2px 8px rgba(26,92,56,0.35); letter-spacing: -0.02em; }
        .sb-user-info { flex: 1; min-width: 0; }
        .sb-user-name { font-size: 0.825rem; font-weight: 600; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'DM Sans', sans-serif; letter-spacing: -0.01em; }
        .sb-user-email { font-size: 0.7rem; color: rgba(255,255,255,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-family: 'DM Sans', sans-serif; margin-bottom: 4px; }
        .sb-user-role { display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 100px; font-size: 0.65rem; font-weight: 700; letter-spacing: 0.03em; font-family: 'DM Sans', sans-serif; }
        .sb-logout-btn { width: 30px; height: 30px; border-radius: 8px; border: none; background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.4); display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.18s; flex-shrink: 0; }
        .sb-logout-btn:hover { background: rgba(239,68,68,0.2); color: #fca5a5; }

        .sb-mobile-trigger { display: none; position: fixed; top: 1rem; left: 1rem; z-index: 200; width: 40px; height: 40px; border-radius: 12px; background: #1c1a17; border: 1px solid rgba(255,255,255,0.1); color: white; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,0.3); }
        .sb-mobile-overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(4px); z-index: 149; animation: fade-in 0.2s ease; }
        @keyframes fade-in { from { opacity: 0 } to { opacity: 1 } }
        .sb-mobile-drawer { display: none; position: fixed; top: 0; left: 0; width: 256px; height: 100vh; background: #1c1a17; z-index: 150; border-right: 1px solid rgba(255,255,255,0.06); animation: slide-in 0.25s ease; }
        @keyframes slide-in { from { transform: translateX(-100%) } to { transform: translateX(0) } }

        .sb-page-wrap { margin-left: 256px; min-height: 100vh; }

        @media (max-width: 1024px) {
          .sb-sidebar { display: none; }
          .sb-mobile-trigger { display: flex; }
          .sb-page-wrap { margin-left: 0; }
        }
        @media (max-width: 1024px) {
          .sb-mobile-overlay.open { display: block; }
          .sb-mobile-drawer.open { display: flex; flex-direction: column; }
        }
      `}</style>

      <aside className="sb-sidebar">
        {renderSidebarContent()}
      </aside>

      <button
        className="sb-mobile-trigger"
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {mobileOpen && (
        <div
          className="sb-mobile-overlay open"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {mobileOpen && (
        <div className="sb-mobile-drawer open">
          <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                width: 30, height: 30, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer"
              }}
            >
              <X size={15} />
            </button>
          </div>
          {renderSidebarContent()}
        </div>
      )}
    </>
  );
}

export function DashboardLayout({
  children,
  role,
  userName,
  userEmail,
  notificationCount,
}: {
  children: React.ReactNode;
  role: Role;
  userName: string;
  userEmail?: string;
  notificationCount?: number;
}) {
  return (
    <>
      <Sidebar
        role={role}
        userName={userName}
        userEmail={userEmail}
        notificationCount={notificationCount}
      />
      <div className="sb-page-wrap">
        {children}
      </div>
    </>
  );
}
