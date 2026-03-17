"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MapPin, Clock, Package, Loader2, RefreshCw, Truck } from "lucide-react";

type FoodItem = { name: string; quantity: string; unit: string };
type Task = {
  _id: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: string;
  expiresAt: string;
  status: string;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  location: { lat: number; lng: number; address: string };
  claimedBy?: { name: string; address: string; phone: string } | null;
  distanceToPickup?: number;
  distanceToDrop?: number;
};

type SessionUser = {
  id: string;
  name?: string | null;
  location?: { lat: number; lng: number };
};

const FOOD_TYPE_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  cooked: { color: "#c8601a", bg: "#fff7ed", label: "🍳 Cooked" },
  packaged: { color: "#1e40af", bg: "#dbeafe", label: "📦 Packaged" },
  raw: { color: "#1a5c38", bg: "#e8f5ee", label: "🥦 Raw" },
};

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { text: "Expired", urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const urgent = h < 3;
  return { text: `${h}h ${m}m left`, urgent };
}

export default function VolunteerTasksClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/listings/tasks";
      if (sessionUser.location) {
        url += `?lat=${sessionUser.location.lat}&lng=${sessionUser.location.lng}`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { tasks?: Task[] };
      setTasks(data.tasks ?? []);
    } finally {
      setLoading(false);
    }
  }, [sessionUser.location]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  async function acceptTask(id: string) {
    setAccepting(id);
    try {
      const res = await fetch(`/api/listings/${id}/assign-volunteer`, { method: "POST" });
      if (res.ok) {
        setTasks((prev) => prev.filter((t) => t._id !== id));
      }
    } finally {
      setAccepting(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .vt { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .vt-inner { max-width:1100px; margin:0 auto; }
        .vt-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .vt-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.75rem; flex-wrap:wrap; gap:1rem; }
        .vt-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .vt-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .vt-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .vt-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .vt-no-loc-banner { background:#fff7ed; border:1px solid rgba(200,96,26,0.15); border-radius:14px; padding:0.875rem 1.25rem; font-size:0.82rem; color:#c8601a; margin-bottom:1.5rem; display:flex; align-items:center; gap:8px; }
        .vt-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1.25rem; }
        .vt-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.22s; }
        .vt-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(44,40,32,0.09); }
        .vt-card-top { display:flex; align-items:flex-start; gap:10px; margin-bottom:0.875rem; }
        .vt-food-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:8px; font-size:0.72rem; font-weight:700; flex-shrink:0; }
        .vt-expiry { display:inline-flex; align-items:center; gap:4px; padding:4px 9px; border-radius:8px; font-size:0.72rem; font-weight:700; margin-left:auto; flex-shrink:0; }
        .vt-expiry.urgent { background:#fef2f2; color:#dc2626; }
        .vt-expiry.ok { background:#f0fdf4; color:#1a5c38; }
        .vt-card-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:700; color:#2c2820; line-height:1.3; margin-bottom:0.75rem; }
        .vt-route { display:grid; grid-template-columns:1fr 1fr; gap:0.75rem; margin-bottom:0.875rem; }
        .vt-route-section { background:#f5f3ef; border-radius:12px; padding:0.75rem; }
        .vt-route-label { font-size:0.65rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#a09a94; margin-bottom:4px; }
        .vt-route-addr { font-size:0.78rem; color:#2c2820; font-weight:500; line-height:1.4; }
        .vt-route-dist { font-size:0.7rem; color:#1e40af; font-weight:700; margin-top:3px; }
        .vt-accept-btn { width:100%; padding:0.75rem; border-radius:14px; border:none; background:#c8601a; color:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; justify-content:center; gap:7px; }
        .vt-accept-btn:hover:not(:disabled) { background:#b5521a; transform:translateY(-1px); }
        .vt-accept-btn:disabled { opacity:0.6; cursor:not-allowed; }
        .vt-empty { text-align:center; padding:4rem 2rem; background:white; border-radius:20px; border:1.5px dashed rgba(44,40,32,0.12); }
        .vt-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.4; }
        .vt-empty-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:700; color:#2c2820; margin-bottom:0.5rem; }
        .vt-empty-sub { font-size:0.85rem; color:#a09a94; font-weight:300; }
        .vt-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:20px; height:260px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media(max-width:900px) { .vt{padding:1.5rem 1rem 6rem} }
        @media(max-width:540px) { .vt-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="vt">
        <div className="vt-inner">
          <Link href="/dashboard/volunteer" className="vt-back">← Dashboard</Link>

          <div className="vt-header">
            <div>
              <div className="vt-title">Available Tasks</div>
              <div className="vt-sub">{tasks.length} task{tasks.length !== 1 ? "s" : ""} waiting for a volunteer</div>
            </div>
            <button className="vt-refresh-btn" onClick={() => void fetchTasks()} disabled={loading}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
          </div>

          {!sessionUser.location && (
            <div className="vt-no-loc-banner">
              <MapPin size={14} /> Set your location in <Link href="/dashboard/volunteer/profile" style={{ fontWeight: 700, color: "#c8601a" }}>Profile</Link> to see distance info and sorted results.
            </div>
          )}

          {loading ? (
            <div className="vt-grid">{[1, 2, 3, 4].map((i) => <div key={i} className="vt-skeleton" />)}</div>
          ) : tasks.length === 0 ? (
            <div className="vt-empty">
              <div className="vt-empty-icon"><Truck size={40} /></div>
              <div className="vt-empty-title">No tasks available</div>
              <div className="vt-empty-sub">All tasks are assigned. Check back soon for new pickups!</div>
            </div>
          ) : (
            <div className="vt-grid">
              {tasks.map((task) => {
                const fm = FOOD_TYPE_COLORS[task.foodType] ?? FOOD_TYPE_COLORS.cooked;
                const exp = countdown(task.expiresAt);
                return (
                  <div key={task._id} className="vt-card">
                    <div className="vt-card-top">
                      <span className="vt-food-badge" style={{ background: fm.bg, color: fm.color }}>{fm.label}</span>
                      <span className={`vt-expiry ${exp.urgent ? "urgent" : "ok"}`}>
                        <Clock size={10} />{exp.text}
                      </span>
                    </div>

                    <div className="vt-card-title">{task.foodItems.map((f) => f.name).join(", ")}</div>

                    <div className="vt-route">
                      <div className="vt-route-section">
                        <div className="vt-route-label">📦 Pickup from</div>
                        <div className="vt-route-addr">{task.donorName}</div>
                        <div className="vt-route-addr" style={{ color: "#6b6560", fontSize: "0.72rem" }}>{task.donorAddress}</div>
                        {task.distanceToPickup !== undefined && (
                          <div className="vt-route-dist">{task.distanceToPickup.toFixed(1)} km away</div>
                        )}
                      </div>
                      <div className="vt-route-section">
                        <div className="vt-route-label">🤝 Drop-off at</div>
                        {task.claimedBy ? (
                          <>
                            <div className="vt-route-addr">{task.claimedBy.name}</div>
                            <div className="vt-route-addr" style={{ color: "#6b6560", fontSize: "0.72rem" }}>{task.claimedBy.address}</div>
                            {task.distanceToDrop !== undefined && (
                              <div className="vt-route-dist">{task.distanceToDrop.toFixed(1)} km away</div>
                            )}
                          </>
                        ) : (
                          <div className="vt-route-addr" style={{ color: "#a09a94" }}>NGO details pending</div>
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: "0.875rem", fontSize: "0.75rem", color: "#6b6560" }}>
                      <Package size={12} style={{ display: "inline", marginRight: 4 }} />{task.totalQuantity}
                    </div>

                    <button
                      className="vt-accept-btn"
                      disabled={accepting === task._id}
                      onClick={() => void acceptTask(task._id)}
                    >
                      {accepting === task._id
                        ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Accepting...</>
                        : <><Truck size={14} /> Accept Task</>}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
