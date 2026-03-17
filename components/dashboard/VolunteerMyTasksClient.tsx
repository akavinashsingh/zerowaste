"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, Package, CheckCircle2, Loader2, RefreshCw, Map } from "lucide-react";
import dynamic from "next/dynamic";

const RouteMap = dynamic(() => import("@/components/maps/RouteMap"), { ssr: false });

type FoodItem = { name: string; quantity: string; unit: string };
type Contact = { _id?: string; name: string; phone: string; address: string; location?: { lat: number; lng: number } };
type Task = {
  _id: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: string;
  expiresAt: string;
  status: "claimed" | "picked_up" | "delivered";
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  donorId?: Contact;
  claimedBy?: Contact;
  location: { lat: number; lng: number; address: string };
  volunteerAssignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
};

type SessionUser = {
  id: string;
  name?: string | null;
  location?: { lat: number; lng: number };
};

const STATUS_META = {
  claimed: { label: "Assigned", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  picked_up: { label: "Picked Up", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

export default function VolunteerMyTasksClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [routeTask, setRouteTask] = useState<Task | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/listings/my-tasks", { cache: "no-store" });
      const data = (await res.json()) as { tasks?: Task[] };
      setTasks((data.tasks ?? []) as Task[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  async function updateStatus(id: string, status: "picked_up" | "delivered") {
    setUpdating(id);
    try {
      const res = await fetch(`/api/listings/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => t._id === id ? { ...t, status } : t));
      }
    } finally {
      setUpdating(null);
    }
  }

  const active = tasks.filter((t) => t.status !== "delivered");
  const completed = tasks.filter((t) => t.status === "delivered");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .vm { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .vm-inner { max-width:1000px; margin:0 auto; }
        .vm-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .vm-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.75rem; flex-wrap:wrap; gap:1rem; }
        .vm-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .vm-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .vm-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .vm-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .vm-section-label { font-size:0.7rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#a09a94; margin-bottom:0.875rem; margin-top:1.75rem; }
        .vm-section-label:first-of-type { margin-top:0; }
        .vm-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.25rem; }
        .vm-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.2s; }
        .vm-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(44,40,32,0.08); }
        .vm-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0.75rem; gap:8px; }
        .vm-card-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:700; color:#2c2820; line-height:1.3; }
        .vm-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; flex-shrink:0; }
        .vm-badge-dot { width:6px; height:6px; border-radius:50%; }
        .vm-meta { font-size:0.78rem; color:#6b6560; display:flex; flex-direction:column; gap:4px; margin-bottom:0.875rem; }
        .vm-meta-row { display:flex; align-items:center; gap:6px; }
        .vm-btn-row { display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:0.75rem; }
        .vm-route-btn { display:inline-flex; align-items:center; gap:5px; padding:7px 12px; border-radius:10px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; flex:1; justify-content:center; }
        .vm-route-btn:hover { border-color:#1e40af; color:#1e40af; }
        .vm-status-btn { flex:2; display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:8px 12px; border-radius:10px; border:none; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:white; cursor:pointer; transition:all 0.15s; }
        .vm-status-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .vm-empty { text-align:center; padding:3rem 2rem; background:white; border-radius:18px; border:1.5px dashed rgba(44,40,32,0.12); }
        .vm-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.35; }
        .vm-empty-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:700; color:#2c2820; margin-bottom:0.4rem; }
        .vm-empty-sub { font-size:0.82rem; color:#a09a94; font-weight:300; }
        .vm-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:20px; height:200px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        .vm-modal-overlay { position:fixed; inset:0; background:rgba(44,40,32,0.5); backdrop-filter:blur(6px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .vm-modal-box { background:white; border-radius:24px; width:100%; max-width:600px; overflow:hidden; box-shadow:0 24px 80px rgba(44,40,32,0.25); }
        .vm-modal-header { display:flex; align-items:center; justify-content:space-between; padding:1.25rem 1.5rem; border-bottom:1px solid rgba(44,40,32,0.08); }
        .vm-modal-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:800; color:#2c2820; }
        .vm-modal-close { width:30px; height:30px; border-radius:50%; border:none; background:rgba(44,40,32,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6b6560; }
        .vm-modal-body { height:400px; }
        @media(max-width:900px) { .vm{padding:1.5rem 1rem 6rem} }
        @media(max-width:540px) { .vm-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="vm">
        <div className="vm-inner">
          <Link href="/dashboard/volunteer" className="vm-back">← Dashboard</Link>

          <div className="vm-header">
            <div>
              <div className="vm-title">My Tasks</div>
              <div className="vm-sub">{active.length} active · {completed.length} completed</div>
            </div>
            <button className="vm-refresh-btn" onClick={() => void fetchTasks()} disabled={loading}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>

          {loading ? (
            <div className="vm-grid">{[1, 2, 3].map((i) => <div key={i} className="vm-skeleton" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="vm-empty">
              <div className="vm-empty-icon">🚗</div>
              <div className="vm-empty-title">No tasks yet</div>
              <div className="vm-empty-sub">Accept tasks from Available Tasks to see them here.</div>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <div className="vm-section-label">Active Tasks</div>
                  <div className="vm-grid">
                    {active.map((task) => {
                      const sm = STATUS_META[task.status];
                      return (
                        <div key={task._id} className="vm-card">
                          <div className="vm-card-top">
                            <div className="vm-card-title">{task.foodItems.map((f) => f.name).join(", ")}</div>
                            <div className="vm-badge" style={{ background: sm.bg, color: sm.color }}>
                              <span className="vm-badge-dot" style={{ background: sm.dot }} />{sm.label}
                            </div>
                          </div>
                          <div className="vm-meta">
                            <div className="vm-meta-row"><Package size={12} style={{ color: "#a09a94" }} />{task.totalQuantity}</div>
                            <div className="vm-meta-row"><Clock size={12} style={{ color: "#a09a94" }} />Expires {fmtDate(task.expiresAt)}</div>
                            <div className="vm-meta-row" style={{ fontWeight: 500 }}>Pickup: {task.donorName} · {task.donorPhone}</div>
                            {task.claimedBy && <div className="vm-meta-row" style={{ fontWeight: 500 }}>Drop: {task.claimedBy.name} · {task.claimedBy.phone}</div>}
                          </div>
                          <div className="vm-btn-row">
                            <button className="vm-route-btn" onClick={() => setRouteTask(task)}>
                              <Map size={13} /> Route
                            </button>
                            {task.status === "claimed" && (
                              <button
                                className="vm-status-btn"
                                style={{ background: "#1e40af" }}
                                disabled={updating === task._id}
                                onClick={() => void updateStatus(task._id, "picked_up")}
                              >
                                {updating === task._id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
                                {updating === task._id ? "Updating..." : "Mark Picked Up"}
                              </button>
                            )}
                            {task.status === "picked_up" && (
                              <button
                                className="vm-status-btn"
                                style={{ background: "#5b21b6" }}
                                disabled={updating === task._id}
                                onClick={() => void updateStatus(task._id, "delivered")}
                              >
                                {updating === task._id ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <CheckCircle2 size={13} />}
                                {updating === task._id ? "Updating..." : "Mark Delivered"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {completed.length > 0 && (
                <>
                  <div className="vm-section-label">Completed Deliveries</div>
                  <div className="vm-grid">
                    {completed.map((task) => (
                      <div key={task._id} className="vm-card" style={{ opacity: 0.8 }}>
                        <div className="vm-card-top">
                          <div className="vm-card-title">{task.foodItems.map((f) => f.name).join(", ")}</div>
                          <div className="vm-badge" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                            <span className="vm-badge-dot" style={{ background: "#8b5cf6" }} />Delivered
                          </div>
                        </div>
                        <div className="vm-meta">
                          <div className="vm-meta-row"><Package size={12} style={{ color: "#a09a94" }} />{task.totalQuantity}</div>
                          {task.deliveredAt && <div className="vm-meta-row"><CheckCircle2 size={12} style={{ color: "#5b21b6" }} />Delivered {fmtDate(task.deliveredAt)}</div>}
                          <div className="vm-meta-row">Donor: {task.donorName}</div>
                          {task.claimedBy && <div className="vm-meta-row">NGO: {task.claimedBy.name}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {routeTask && (
        <div className="vm-modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setRouteTask(null); }}>
          <div className="vm-modal-box">
            <div className="vm-modal-header">
              <div className="vm-modal-title">Route: {routeTask.foodItems.map((f) => f.name).join(", ")}</div>
              <button className="vm-modal-close" onClick={() => setRouteTask(null)}>✕</button>
            </div>
            <div className="vm-modal-body">
              <RouteMap
                pickup={{ lat: routeTask.location.lat, lng: routeTask.location.lng, label: routeTask.donorName }}
                dropoff={routeTask.claimedBy?.location
                  ? { lat: routeTask.claimedBy.location.lat, lng: routeTask.claimedBy.location.lng, label: routeTask.claimedBy.name }
                  : { lat: routeTask.location.lat, lng: routeTask.location.lng, label: "Drop-off pending" }
                }
                volunteer={sessionUser.location ?? undefined}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
