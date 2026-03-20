"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import RouteMap, { getRouteMetrics } from "@/components/maps/RouteMap";

type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";

type Contact = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  location?: { lat: number; lng: number };
};

type FoodItem = { name: string; quantity: string; unit: string };

type Task = {
  _id: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: string;
  expiresAt: string;
  status: ListingStatus;
  donorId?: Contact;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  claimedBy?: Contact;
  location: { lat: number; lng: number; address: string };
  volunteerAssignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  distanceToPickup?: number;
  distanceToDrop?: number;
  payoutAmount?: number;
};

type SessionUser = {
  id: string;
  name?: string | null;
  location?: { lat: number; lng: number };
};

type Tab = "available" | "active" | "completed";
type Toast = { id: number; message: string; type: "success" | "error" };

let toastId = 0;

const foodTypeColors: Record<string, string> = {
  cooked: "#1a5c38",
  raw: "#c8601a",
  packaged: "#1e40af",
  produce: "#854d0e",
  dairy: "#6b21a8",
  bakery: "#9f1239",
  beverages: "#0e7490",
  other: "#374151",
};

function getFoodColor(type: string) {
  return foodTypeColors[type.toLowerCase()] ?? foodTypeColors.other;
}

function getCountdownLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}m left` : `${minutes}m left`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function VolunteerDashboardClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [routeTask, setRouteTask] = useState<Task | null>(null);
  const [otpModal, setOtpModal] = useState<{ taskId: string; type: "pickup" | "delivery" } | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const volunteerLocation = sessionUser.location;

  function addToast(message: string, type: "success" | "error") {
    const id = ++toastId;
    setToasts((c) => [...c, { id, message, type }]);
    window.setTimeout(() => setToasts((c) => c.filter((t) => t.id !== id)), 4000);
  }

  function dismissToast(id: number) {
    setToasts((c) => c.filter((t) => t.id !== id));
  }

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const tasksUrl = volunteerLocation
        ? `/api/listings/tasks?lat=${volunteerLocation.lat}&lng=${volunteerLocation.lng}`
        : "/api/listings/tasks";

      const [tasksRes, myTasksRes, walletRes] = await Promise.all([
        fetch(tasksUrl, { cache: "no-store" }),
        fetch("/api/listings/my-tasks", { cache: "no-store" }),
        fetch("/api/wallet", { cache: "no-store" }),
      ]);

      const tasksData = (await tasksRes.json()) as { tasks?: Task[] };
      const myTasksData = (await myTasksRes.json()) as { tasks?: Task[] };
      const walletData = (await walletRes.json()) as { balance?: number };

      setAvailableTasks(tasksData.tasks ?? []);
      setMyTasks(myTasksData.tasks ?? []);
      setWalletBalance(walletData.balance ?? 0);
    } catch {
      addToast("Unable to load tasks.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [volunteerLocation]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  async function handleAcceptTask(taskId: string) {
    setIsAccepting((s) => ({ ...s, [taskId]: true }));
    const taskSnapshot = availableTasks.find((t) => t._id === taskId);
    setAvailableTasks((c) => c.filter((t) => t._id !== taskId));
    try {
      const res = await fetch(`/api/listings/${taskId}/assign-volunteer`, { method: "POST" });
      const data = (await res.json()) as { listing?: Task; error?: string };
      if (!res.ok || !data.listing) throw new Error(data.error ?? "Failed to accept task.");
      setMyTasks((c) => [data.listing!, ...c]);
      setActiveTab("active");
      addToast("Task accepted! Head to the pickup location.", "success");
    } catch (err) {
      if (taskSnapshot) setAvailableTasks((c) => [taskSnapshot, ...c]);
      addToast(err instanceof Error ? err.message : "Failed to accept task.", "error");
    } finally {
      setIsAccepting((s) => ({ ...s, [taskId]: false }));
    }
  }

  function handleOtpSuccess(taskId: string, newStatus: "picked_up" | "delivered") {
    setOtpModal(null);
    setMyTasks((c) => c.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)));
    addToast(
      newStatus === "picked_up"
        ? "Pickup confirmed! Head to the NGO for drop-off."
        : "Delivery complete! Great work.",
      "success",
    );
  }

  const activeTasks = myTasks.filter((t) => t.status === "claimed" || t.status === "picked_up");
  const completedTasks = myTasks.filter((t) => t.status === "delivered");
  const routeMetrics =
    routeTask?.claimedBy?.location
      ? getRouteMetrics(
          { lat: routeTask.location.lat, lng: routeTask.location.lng },
          { lat: routeTask.claimedBy.location.lat, lng: routeTask.claimedBy.location.lng },
        )
      : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');

        .vd { font-family:'DM Sans',sans-serif; background:#fafaf9; min-height:100vh; padding:2rem 1.5rem 6rem; }
        .vd-inner { max-width:1040px; margin:0 auto; }

        /* Header */
        .vd-header { margin-bottom:2rem; }
        .vd-eyebrow { font-size:0.72rem; font-weight:700; letter-spacing:0.16em; text-transform:uppercase; color:#c8601a; margin-bottom:0.35rem; }
        .vd-title { font-family:'Fraunces',serif; font-size:clamp(1.6rem,3.5vw,2.25rem); font-weight:900; color:#2c2820; letter-spacing:-0.035em; line-height:1.1; }
        .vd-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:0.25rem; }
        .vd-header-row { display:flex; align-items:flex-start; justify-content:space-between; gap:1.5rem; flex-wrap:wrap; }
        .vd-header-actions { display:flex; gap:0.625rem; align-items:center; flex-shrink:0; margin-top:0.25rem; }
        .vd-btn-ghost { display:inline-flex; align-items:center; gap:5px; height:36px; padding:0 14px; border-radius:100px; border:1px solid rgba(44,40,32,0.12); background:white; font-size:0.78rem; font-weight:600; color:#2c2820; cursor:pointer; text-decoration:none; font-family:'DM Sans',sans-serif; transition:background 0.15s; }
        .vd-btn-ghost:hover { background:#f5f3ef; }
        .vd-btn-danger { background:#fef2f2; border-color:rgba(220,38,38,0.2); color:#dc2626; }
        .vd-btn-danger:hover { background:#fee2e2; }

        /* Location warning */
        .vd-loc-warn { background:#fffbeb; border:1px solid rgba(234,179,8,0.3); border-radius:12px; padding:0.75rem 1rem; font-size:0.8rem; color:#92400e; margin-bottom:1.5rem; }
        .vd-loc-warn a { font-weight:700; color:#92400e; }

        /* Stats */
        .vd-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:0.875rem; margin-bottom:2rem; }
        .vd-stat { background:white; border-radius:18px; padding:1.1rem 1.25rem; border:1px solid rgba(44,40,32,0.08); }
        .vd-stat-val { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; letter-spacing:-0.04em; color:#2c2820; line-height:1; }
        .vd-stat-val.green { color:#1a5c38; }
        .vd-stat-val.orange { color:#c8601a; }
        .vd-stat-val.blue { color:#1e40af; }
        .vd-stat-lbl { font-size:0.72rem; color:#6b6560; margin-top:5px; font-weight:400; }

        /* Tabs */
        .vd-tabs { display:flex; gap:0.5rem; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; }
        .vd-tab { height:38px; padding:0 18px; border-radius:100px; font-size:0.82rem; font-weight:600; cursor:pointer; border:1px solid rgba(44,40,32,0.12); background:white; color:#6b6560; font-family:'DM Sans',sans-serif; transition:all 0.15s; white-space:nowrap; }
        .vd-tab.active { background:#2c2820; color:white; border-color:#2c2820; }
        .vd-tab-count { display:inline-flex; align-items:center; justify-content:center; width:18px; height:18px; border-radius:100px; font-size:0.65rem; font-weight:700; margin-left:6px; background:rgba(200,96,26,0.15); color:#c8601a; }
        .vd-tab.active .vd-tab-count { background:rgba(255,255,255,0.2); color:white; }
        .vd-tab-refresh { margin-left:auto; }

        /* Cards grid */
        .vd-grid { display:grid; gap:1rem; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); }

        /* Available task card */
        .vd-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; display:flex; flex-direction:column; }
        .vd-card-top { padding:1.1rem 1.25rem 0.75rem; }
        .vd-card-badges { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; margin-bottom:0.75rem; }
        .vd-food-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:100px; font-size:0.68rem; font-weight:700; letter-spacing:0.04em; text-transform:uppercase; }
        .vd-expiry { font-size:0.72rem; font-weight:600; color:#6b6560; background:#f5f3ef; padding:3px 9px; border-radius:100px; }
        .vd-expiry.urgent { color:#dc2626; background:#fef2f2; }
        .vd-card-title { font-size:0.9rem; font-weight:600; color:#2c2820; margin-bottom:0.25rem; line-height:1.3; }
        .vd-card-qty { font-size:0.75rem; color:#6b6560; margin-bottom:0.75rem; }

        /* Route strip */
        .vd-route { background:#f5f3ef; border-radius:12px; padding:0.75rem 1rem; margin-bottom:0.875rem; }
        .vd-route-row { display:flex; align-items:flex-start; gap:0.6rem; }
        .vd-route-row + .vd-route-row { margin-top:0.5rem; padding-top:0.5rem; border-top:1px solid rgba(44,40,32,0.07); }
        .vd-route-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-top:4px; }
        .vd-route-dot.pickup { background:#c8601a; }
        .vd-route-dot.dropoff { background:#1a5c38; }
        .vd-route-label { font-size:0.65rem; font-weight:700; color:#a09a94; text-transform:uppercase; letter-spacing:0.08em; }
        .vd-route-name { font-size:0.78rem; font-weight:600; color:#2c2820; }
        .vd-route-addr { font-size:0.72rem; color:#6b6560; }
        .vd-route-km { font-size:0.68rem; font-weight:700; color:#c8601a; margin-top:2px; }

        /* Payout chip */
        .vd-payout { display:inline-flex; align-items:center; gap:4px; padding:4px 10px; border-radius:8px; background:#f0fdf4; border:1px solid rgba(22,163,74,0.15); font-size:0.75rem; font-weight:700; color:#15803d; margin-bottom:0.875rem; }

        /* Card footer */
        .vd-card-footer { padding:0.875rem 1.25rem; border-top:1px solid rgba(44,40,32,0.06); display:flex; gap:0.5rem; flex-direction:column; }
        .vd-btn-primary { height:40px; border-radius:10px; background:#c8601a; color:white; border:none; font-size:0.82rem; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.15s; width:100%; }
        .vd-btn-primary:hover { background:#a04d14; }
        .vd-btn-primary:disabled { opacity:0.55; cursor:not-allowed; }
        .vd-btn-secondary { height:38px; border-radius:10px; background:transparent; border:1.5px solid rgba(44,40,32,0.12); color:#2c2820; font-size:0.78rem; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:background 0.15s; width:100%; }
        .vd-btn-secondary:hover { background:#f5f3ef; }
        .vd-btn-blue { background:#1e40af; }
        .vd-btn-blue:hover { background:#1e3a8a; }
        .vd-btn-purple { background:#7c3aed; }
        .vd-btn-purple:hover { background:#6d28d9; }

        /* Active task status strip */
        .vd-status-strip { padding:0.5rem 1.25rem; display:flex; align-items:center; gap:0.5rem; }
        .vd-status-pill { display:inline-flex; align-items:center; gap:5px; padding:3px 10px; border-radius:100px; font-size:0.7rem; font-weight:700; }
        .vd-status-pill.claimed { background:#fff7ed; color:#c8601a; }
        .vd-status-pill.picked_up { background:#eff6ff; color:#1e40af; }
        .vd-status-pill.delivered { background:#f0fdf4; color:#15803d; }
        .vd-status-dot { width:6px; height:6px; border-radius:50%; animation:vd-pulse 1.8s ease-in-out infinite; }
        .vd-status-pill.claimed .vd-status-dot { background:#c8601a; }
        .vd-status-pill.picked_up .vd-status-dot { background:#1e40af; }
        @keyframes vd-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

        /* Contact row */
        .vd-contacts { padding:0 1.25rem 0.875rem; display:flex; flex-direction:column; gap:0.5rem; }
        .vd-contact { display:flex; align-items:center; gap:0.6rem; background:#f5f3ef; border-radius:10px; padding:0.5rem 0.75rem; }
        .vd-contact-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; font-size:0.8rem; flex-shrink:0; }
        .vd-contact-icon.donor { background:#fff7ed; }
        .vd-contact-icon.ngo { background:#f0fdf4; }
        .vd-contact-body { flex:1; min-width:0; }
        .vd-contact-name { font-size:0.78rem; font-weight:600; color:#2c2820; }
        .vd-contact-detail { font-size:0.68rem; color:#6b6560; }

        /* Completed card */
        .vd-completed-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.1rem 1.25rem; }
        .vd-completed-header { display:flex; align-items:flex-start; justify-content:space-between; gap:0.75rem; margin-bottom:0.75rem; }
        .vd-earned-chip { display:inline-flex; align-items:center; padding:4px 10px; border-radius:8px; background:#f0fdf4; font-family:'Fraunces',serif; font-size:0.9rem; font-weight:900; color:#15803d; letter-spacing:-0.02em; }
        .vd-completed-meta { display:flex; flex-direction:column; gap:0.35rem; margin-top:0.625rem; }
        .vd-meta-row { display:flex; align-items:center; gap:5px; font-size:0.75rem; color:#6b6560; }
        .vd-meta-row span { font-weight:600; color:#2c2820; }

        /* Empty state */
        .vd-empty { text-align:center; padding:3rem 2rem; background:white; border-radius:20px; border:1.5px dashed rgba(44,40,32,0.1); }
        .vd-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.5; }
        .vd-empty-title { font-size:0.875rem; font-weight:600; color:#2c2820; margin-bottom:0.25rem; }
        .vd-empty-sub { font-size:0.78rem; color:#a09a94; }

        /* Skeleton */
        .vd-skeleton { animation:vd-shimmer 1.4s ease-in-out infinite; background:linear-gradient(90deg,#f0ece8 25%,#e8e4e0 50%,#f0ece8 75%); background-size:200% 100%; border-radius:10px; }
        @keyframes vd-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .vd-skel-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.25rem; }

        /* Toast */
        .vd-toasts { position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999; display:flex; flex-direction:column; gap:0.5rem; }
        .vd-toast { display:flex; align-items:center; gap:10px; padding:0.75rem 1rem; border-radius:12px; font-size:0.82rem; font-weight:600; box-shadow:0 8px 32px rgba(0,0,0,0.18); font-family:'DM Sans',sans-serif; }
        .vd-toast.success { background:#1a5c38; color:white; }
        .vd-toast.error { background:#dc2626; color:white; }
        .vd-toast-close { background:none; border:none; color:inherit; opacity:0.7; cursor:pointer; font-size:1rem; padding:0; margin-left:auto; }

        @media(max-width:700px) {
          .vd-stats { grid-template-columns:1fr 1fr; }
          .vd-grid { grid-template-columns:1fr; }
        }
        @media(max-width:420px) {
          .vd-stats { grid-template-columns:1fr 1fr; }
        }
      `}</style>

      <div className="vd">
        <div className="vd-inner">

          {/* Header */}
          <div className="vd-header">
            <div className="vd-header-row">
              <div>
                <div className="vd-eyebrow">Volunteer Dashboard</div>
                <div className="vd-title">
                  {sessionUser.name ? `Hello, ${sessionUser.name.split(" ")[0]}` : "My Tasks"}
                </div>
                <div className="vd-sub">Pick up surplus food and deliver it to NGOs in need.</div>
              </div>
              <div className="vd-header-actions">
                <Link href="/dashboard/volunteer/earnings" className="vd-btn-ghost">
                  ₹ Earnings
                </Link>
                <Link href="/dashboard/volunteer/profile" className="vd-btn-ghost">
                  Profile
                </Link>
                <button
                  type="button"
                  className="vd-btn-ghost vd-btn-danger"
                  onClick={() => void signOut({ callbackUrl: "/login" })}
                >
                  Logout
                </button>
              </div>
            </div>
          </div>

          {/* Location warning */}
          {!volunteerLocation && (
            <div className="vd-loc-warn">
              📍 Add your location in your{" "}
              <Link href="/dashboard/volunteer/profile">profile</Link>{" "}
              to see distances to pickup points.
            </div>
          )}

          {/* Stats */}
          <div className="vd-stats">
            <div className="vd-stat">
              <div className="vd-stat-val orange">{isLoading ? "—" : availableTasks.length}</div>
              <div className="vd-stat-lbl">Tasks available</div>
            </div>
            <div className="vd-stat">
              <div className="vd-stat-val blue">{isLoading ? "—" : activeTasks.length}</div>
              <div className="vd-stat-lbl">Active tasks</div>
            </div>
            <div className="vd-stat">
              <div className="vd-stat-val green">{isLoading ? "—" : completedTasks.length}</div>
              <div className="vd-stat-lbl">Completed</div>
            </div>
            <div className="vd-stat">
              <div className="vd-stat-val green">
                {walletBalance !== null ? `₹${walletBalance.toLocaleString("en-IN")}` : "—"}
              </div>
              <div className="vd-stat-lbl">Wallet balance</div>
            </div>
          </div>

          {/* Tabs */}
          <div className="vd-tabs">
            {(["available", "active", "completed"] as Tab[]).map((tab) => {
              const count = tab === "available" ? availableTasks.length : tab === "active" ? activeTasks.length : completedTasks.length;
              const label = tab === "available" ? "Available" : tab === "active" ? "Active" : "Completed";
              return (
                <button
                  key={tab}
                  type="button"
                  className={`vd-tab${activeTab === tab ? " active" : ""}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {label}
                  {!isLoading && count > 0 && (
                    <span className="vd-tab-count">{count}</span>
                  )}
                </button>
              );
            })}
            <button
              type="button"
              className="vd-tab vd-tab-refresh"
              onClick={() => void loadAll()}
            >
              ↻ Refresh
            </button>
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="vd-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="vd-skel-card">
                  <div className="vd-skeleton" style={{ height: 14, width: "40%", marginBottom: 12 }} />
                  <div className="vd-skeleton" style={{ height: 18, width: "70%", marginBottom: 8 }} />
                  <div className="vd-skeleton" style={{ height: 12, width: "55%", marginBottom: 20 }} />
                  <div className="vd-skeleton" style={{ height: 80, marginBottom: 12 }} />
                  <div className="vd-skeleton" style={{ height: 40 }} />
                </div>
              ))}
            </div>
          ) : activeTab === "available" ? (
            availableTasks.length ? (
              <div className="vd-grid">
                {availableTasks.map((task) => {
                  const foodColor = getFoodColor(task.foodType);
                  const diffMs = new Date(task.expiresAt).getTime() - Date.now();
                  const isUrgent = diffMs < 60 * 60 * 1000;
                  return (
                    <div key={task._id} className="vd-card">
                      <div className="vd-card-top">
                        <div className="vd-card-badges">
                          <span
                            className="vd-food-badge"
                            style={{ background: `${foodColor}18`, color: foodColor }}
                          >
                            {task.foodType}
                          </span>
                          <span className={`vd-expiry${isUrgent ? " urgent" : ""}`}>
                            ⏱ {getCountdownLabel(task.expiresAt)}
                          </span>
                        </div>

                        <div className="vd-card-title">
                          {task.foodItems.map((f) => f.name).join(", ")}
                        </div>
                        <div className="vd-card-qty">
                          {task.foodItems.map((f) => `${f.quantity} ${f.unit}`).join(" · ")}
                        </div>

                        <div className="vd-route">
                          <div className="vd-route-row">
                            <div className="vd-route-dot pickup" style={{ marginTop: 5 }} />
                            <div>
                              <div className="vd-route-label">Pickup from</div>
                              <div className="vd-route-name">{task.donorId?.name ?? task.donorName}</div>
                              <div className="vd-route-addr">{task.location.address}</div>
                              {task.distanceToPickup !== undefined && (
                                <div className="vd-route-km">~{task.distanceToPickup} km away</div>
                              )}
                            </div>
                          </div>
                          <div className="vd-route-row">
                            <div className="vd-route-dot dropoff" style={{ marginTop: 5 }} />
                            <div>
                              <div className="vd-route-label">Drop-off at</div>
                              <div className="vd-route-name">{task.claimedBy?.name ?? "NGO"}</div>
                              <div className="vd-route-addr">{task.claimedBy?.address ?? "Address not set"}</div>
                              {task.distanceToDrop !== undefined && (
                                <div className="vd-route-km">~{task.distanceToDrop} km to drop-off</div>
                              )}
                            </div>
                          </div>
                        </div>

                        {task.payoutAmount != null && (
                          <div className="vd-payout">
                            💰 Earn ₹{task.payoutAmount} for this delivery
                          </div>
                        )}
                      </div>

                      <div className="vd-card-footer">
                        <button
                          type="button"
                          className="vd-btn-primary"
                          disabled={isAccepting[task._id]}
                          onClick={() => void handleAcceptTask(task._id)}
                        >
                          {isAccepting[task._id] ? "Accepting…" : "Accept Task"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="vd-empty">
                <div className="vd-empty-icon">🍱</div>
                <div className="vd-empty-title">No tasks available right now</div>
                <div className="vd-empty-sub">Check back soon — new listings appear as donors post food.</div>
              </div>
            )
          ) : activeTab === "active" ? (
            activeTasks.length ? (
              <div className="vd-grid">
                {activeTasks.map((task) => (
                  <ActiveTaskCard
                    key={task._id}
                    task={task}
                    onOpenOtp={(type) => setOtpModal({ taskId: task._id, type })}
                    onViewRoute={(t) => setRouteTask(t)}
                  />
                ))}
              </div>
            ) : (
              <div className="vd-empty">
                <div className="vd-empty-icon">🚴</div>
                <div className="vd-empty-title">No active tasks</div>
                <div className="vd-empty-sub">Accept a task from the Available tab to get started.</div>
              </div>
            )
          ) : (
            completedTasks.length ? (
              <div className="vd-grid">
                {completedTasks.map((task) => (
                  <CompletedTaskCard key={task._id} task={task} />
                ))}
              </div>
            ) : (
              <div className="vd-empty">
                <div className="vd-empty-icon">🏆</div>
                <div className="vd-empty-title">No deliveries yet</div>
                <div className="vd-empty-sub">Complete your first delivery to see it here.</div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Toasts */}
      <div className="vd-toasts">
        {toasts.map((toast) => (
          <div key={toast.id} className={`vd-toast ${toast.type}`}>
            {toast.message}
            <button type="button" className="vd-toast-close" onClick={() => dismissToast(toast.id)}>✕</button>
          </div>
        ))}
      </div>

      {/* OTP Modal */}
      {otpModal && (
        <OtpVerifyModal
          taskId={otpModal.taskId}
          type={otpModal.type}
          onSuccess={(newStatus) => handleOtpSuccess(otpModal.taskId, newStatus)}
          onClose={() => setOtpModal(null)}
        />
      )}

      {/* Route Map Modal */}
      {routeTask && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: "1rem" }}>
          <div style={{ width: "100%", maxWidth: 820, background: "white", borderRadius: 24, padding: "1.5rem", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.15rem", fontWeight: 900, color: "#2c2820", letterSpacing: "-0.02em" }}>
                  Route: Pickup → Drop-off
                </div>
                {routeMetrics && (
                  <div style={{ fontSize: "0.78rem", color: "#6b6560", marginTop: 3 }}>
                    {routeMetrics.distanceKm.toFixed(2)} km · ETA {routeMetrics.etaLabel}
                  </div>
                )}
              </div>
              <button
                type="button"
                style={{ height: 34, padding: "0 14px", borderRadius: 100, border: "1px solid rgba(44,40,32,0.12)", background: "white", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans',sans-serif" }}
                onClick={() => setRouteTask(null)}
              >
                Close
              </button>
            </div>

            {routeTask.claimedBy?.location ? (
              <RouteMap
                pickup={{ lat: routeTask.location.lat, lng: routeTask.location.lng, label: `${routeTask.donorName} (Pickup)` }}
                dropoff={{ lat: routeTask.claimedBy.location.lat, lng: routeTask.claimedBy.location.lng, label: `${routeTask.claimedBy.name} (Drop-off)` }}
                volunteer={volunteerLocation}
              />
            ) : (
              <div style={{ background: "#f5f3ef", borderRadius: 14, padding: "2rem", textAlign: "center", fontSize: "0.82rem", color: "#6b6560" }}>
                <div style={{ fontWeight: 600, color: "#2c2820", marginBottom: 4 }}>Pickup location only</div>
                <div>{routeTask.location.address}</div>
                <div style={{ marginTop: 8, color: "#a09a94" }}>NGO drop-off coordinates not set.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function ActiveTaskCard({
  task,
  onOpenOtp,
  onViewRoute,
}: {
  task: Task;
  onOpenOtp: (type: "pickup" | "delivery") => void;
  onViewRoute: (task: Task) => void;
}) {
  const foodColor = getFoodColor(task.foodType);

  return (
    <div className="vd-card">
      <div className="vd-status-strip">
        <span className={`vd-status-pill ${task.status}`}>
          <span className="vd-status-dot" />
          {task.status === "claimed" ? "Awaiting Pickup" : "En Route to NGO"}
        </span>
        <span
          className="vd-food-badge"
          style={{ background: `${foodColor}18`, color: foodColor, marginLeft: "auto" }}
        >
          {task.foodType}
        </span>
      </div>

      <div className="vd-card-top" style={{ paddingTop: "0.5rem" }}>
        <div className="vd-card-title">{task.foodItems.map((f) => f.name).join(", ")}</div>
        <div className="vd-card-qty">{task.foodItems.map((f) => `${f.quantity} ${f.unit}`).join(" · ")}</div>

        {task.payoutAmount != null && (
          <div className="vd-payout" style={{ marginBottom: "0.625rem" }}>
            💰 ₹{task.payoutAmount} payout on delivery
          </div>
        )}
      </div>

      <div className="vd-contacts">
        <div className="vd-contact">
          <div className="vd-contact-icon donor">🏠</div>
          <div className="vd-contact-body">
            <div className="vd-contact-name">{task.donorId?.name ?? task.donorName}</div>
            <div className="vd-contact-detail">{task.donorId?.phone ?? task.donorPhone} · Donor</div>
          </div>
        </div>
        {task.claimedBy && (
          <div className="vd-contact">
            <div className="vd-contact-icon ngo">🏢</div>
            <div className="vd-contact-body">
              <div className="vd-contact-name">{task.claimedBy.name}</div>
              <div className="vd-contact-detail">{task.claimedBy.phone} · NGO</div>
            </div>
          </div>
        )}
      </div>

      <div className="vd-card-footer">
        <button type="button" className="vd-btn-secondary" onClick={() => onViewRoute(task)}>
          View Route Map
        </button>
        {task.status === "claimed" && (
          <button type="button" className="vd-btn-primary vd-btn-blue" onClick={() => onOpenOtp("pickup")}>
            Mark as Picked Up (OTP)
          </button>
        )}
        {task.status === "picked_up" && (
          <button type="button" className="vd-btn-primary vd-btn-purple" onClick={() => onOpenOtp("delivery")}>
            Mark as Delivered (OTP)
          </button>
        )}
      </div>
    </div>
  );
}

function CompletedTaskCard({ task }: { task: Task }) {
  const foodColor = getFoodColor(task.foodType);

  return (
    <div className="vd-completed-card">
      <div className="vd-completed-header">
        <div>
          <div className="vd-card-title" style={{ marginBottom: 2 }}>
            {task.foodItems.map((f) => f.name).join(", ")}
          </div>
          <span
            className="vd-food-badge"
            style={{ background: `${foodColor}18`, color: foodColor }}
          >
            {task.foodType}
          </span>
        </div>
        {task.payoutAmount != null ? (
          <div className="vd-earned-chip">+₹{task.payoutAmount}</div>
        ) : (
          <span style={{ display: "inline-flex", padding: "3px 10px", borderRadius: 100, background: "#f0fdf4", fontSize: "0.7rem", fontWeight: 700, color: "#15803d" }}>
            Delivered
          </span>
        )}
      </div>

      <div className="vd-completed-meta">
        <div className="vd-meta-row">
          🏠 Donor: <span>{task.donorId?.name ?? task.donorName}</span>
        </div>
        <div className="vd-meta-row">
          🏢 NGO: <span>{task.claimedBy?.name ?? "—"}</span>
        </div>
        {task.deliveredAt && (
          <div className="vd-meta-row">
            ✅ Delivered: <span>{formatShortDate(task.deliveredAt)}</span>
          </div>
        )}
        {task.deliveredAt && (
          <div className="vd-meta-row">
            🕐 Time: <span>{formatDateTime(task.deliveredAt)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function OtpVerifyModal({
  taskId,
  type,
  onSuccess,
  onClose,
}: {
  taskId: string;
  type: "pickup" | "delivery";
  onSuccess: (newStatus: "picked_up" | "delivered") => void;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const inputRefs = useState(() => Array.from({ length: 6 }, () => ({ current: null as HTMLInputElement | null })))[0];

  const isPickup = type === "pickup";
  const party = isPickup ? "Donor" : "NGO";
  const code = digits.join("");
  const accentColor = isPickup ? "#1e40af" : "#7c3aed";

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) inputRefs[index + 1].current?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs[5].current?.focus();
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: taskId, code, type }),
      });
      const data = (await res.json()) as { status?: string; error?: string; attemptsLeft?: number };
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        if (typeof data.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft);
        setDigits(["", "", "", "", "", ""]);
        inputRefs[0].current?.focus();
        return;
      }
      onSuccess(data.status as "picked_up" | "delivered");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.55)", padding: "1rem", fontFamily: "'DM Sans',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 360, background: "white", borderRadius: 24, padding: "1.75rem", boxShadow: "0 32px 80px rgba(0,0,0,0.25)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontSize: "0.68rem", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: accentColor, marginBottom: 4 }}>
              OTP Verification
            </div>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", fontWeight: 900, color: "#2c2820", letterSpacing: "-0.025em" }}>
              {isPickup ? "Confirm Pickup" : "Confirm Delivery"}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ height: 32, padding: "0 12px", borderRadius: 100, border: "1px solid rgba(44,40,32,0.12)", background: "transparent", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer", color: "#6b6560" }}
          >
            Cancel
          </button>
        </div>

        <p style={{ fontSize: "0.82rem", color: "#6b6560", marginBottom: "1.5rem", lineHeight: 1.55 }}>
          Ask the <strong style={{ color: "#2c2820" }}>{party}</strong> to show you their OTP and enter it below.
        </p>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: "1.25rem" }} onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs[i].current = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                style={{
                  width: 44, height: 52, borderRadius: 12, border: `2px solid ${d ? accentColor : "rgba(44,40,32,0.15)"}`,
                  background: d ? `${accentColor}08` : "#f5f3ef", textAlign: "center", fontSize: "1.4rem",
                  fontWeight: 900, color: "#2c2820", outline: "none", fontFamily: "'Fraunces',serif",
                  transition: "border-color 0.15s",
                }}
              />
            ))}
          </div>

          {error && (
            <div style={{ background: "#fef2f2", border: "1px solid rgba(220,38,38,0.2)", borderRadius: 10, padding: "0.625rem 0.875rem", fontSize: "0.8rem", color: "#dc2626", marginBottom: "1rem" }}>
              {error}
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <strong> ({attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left)</strong>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            style={{
              width: "100%", height: 46, borderRadius: 12, border: "none", background: code.length === 6 && !loading ? accentColor : "#d1cdc9",
              color: "white", fontSize: "0.875rem", fontWeight: 700, cursor: code.length === 6 && !loading ? "pointer" : "not-allowed",
              fontFamily: "'DM Sans',sans-serif", transition: "background 0.15s",
            }}
          >
            {loading ? "Verifying…" : `Confirm ${isPickup ? "Pickup" : "Delivery"}`}
          </button>
        </form>
      </div>
    </div>
  );
}
