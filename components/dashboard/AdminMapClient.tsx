"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { RefreshCw } from "lucide-react";

const AdminLiveMap = dynamic(() => import("@/components/maps/AdminLiveMap"), { ssr: false });

type Person = { _id: string; name: string; role: "ngo" | "volunteer"; location?: { lat: number; lng: number } };
type Listing = {
  _id: string;
  donorName: string;
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  foodItems: Array<{ name: string; quantity: string; unit: string }>;
  location?: { lat?: number; lng?: number; address?: string };
  claimedBy?: { name?: string };
  assignedVolunteer?: { name?: string };
};

export default function AdminMapClient() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [ngos, setNgos] = useState<Person[]>([]);
  const [volunteers, setVolunteers] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listingsRes, usersRes] = await Promise.all([
        fetch("/api/admin/listings?limit=200&status=available,claimed,picked_up", { cache: "no-store" }),
        fetch("/api/admin/users?limit=200", { cache: "no-store" }),
      ]);
      const listingsData = (await listingsRes.json()) as { listings?: Listing[] };
      const usersData = (await usersRes.json()) as { users?: Array<Person & { role: string }> };

      setListings(listingsData.listings ?? []);
      const users = usersData.users ?? [];
      setNgos(users.filter((u) => u.role === "ngo") as Person[]);
      setVolunteers(users.filter((u) => u.role === "volunteer") as Person[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const activeListings = listings.filter((l) => ["available", "claimed", "picked_up"].includes(l.status));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .amap { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .amap-inner { max-width:1300px; margin:0 auto; }
        .amap-topbar { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .amap-left { display:flex; flex-direction:column; gap:4px; }
        .amap-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); width:fit-content; }
        .amap-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .amap-sub { font-size:0.875rem; color:#6b6560; font-weight:300; }
        .amap-actions { display:flex; align-items:center; gap:0.75rem; }
        .amap-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .amap-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .amap-legend { display:flex; gap:1.25rem; flex-wrap:wrap; margin-bottom:1rem; }
        .amap-legend-item { display:flex; align-items:center; gap:6px; font-size:0.78rem; color:#6b6560; font-weight:500; }
        .amap-legend-dot { width:10px; height:10px; border-radius:50%; }
        .amap-map-wrap { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .amap-stats { display:grid; grid-template-columns:repeat(auto-fill,minmax(140px,1fr)); gap:0.875rem; margin-bottom:1.25rem; }
        .amap-stat { background:white; border-radius:14px; border:1px solid rgba(44,40,32,0.08); padding:0.875rem 1rem; }
        .amap-stat-val { font-family:'Fraunces',serif; font-size:1.5rem; font-weight:900; color:#2c2820; }
        .amap-stat-label { font-size:0.72rem; color:#a09a94; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; margin-top:2px; }
        .amap-loading { height:520px; background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:20px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media(max-width:900px) { .amap{padding:1.5rem 1rem 6rem} }
      `}</style>

      <div className="amap">
        <div className="amap-inner">
          <div className="amap-topbar">
            <div className="amap-left">
              <Link href="/dashboard/admin" className="amap-back">← Overview</Link>
              <div className="amap-title">Live Map</div>
              <div className="amap-sub">Real-time view of active listings and users</div>
            </div>
            <div className="amap-actions">
              <button className="amap-refresh-btn" onClick={() => void fetchData()} disabled={loading}>
                <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
              </button>
            </div>
          </div>

          <div className="amap-stats">
            <div className="amap-stat">
              <div className="amap-stat-val">{activeListings.length}</div>
              <div className="amap-stat-label">Active Listings</div>
            </div>
            <div className="amap-stat">
              <div className="amap-stat-val">{ngos.length}</div>
              <div className="amap-stat-label">NGOs</div>
            </div>
            <div className="amap-stat">
              <div className="amap-stat-val">{volunteers.length}</div>
              <div className="amap-stat-label">Volunteers</div>
            </div>
          </div>

          <div className="amap-legend">
            <div className="amap-legend-item"><div className="amap-legend-dot" style={{ background: "#1a5c38" }} /> Listings</div>
            <div className="amap-legend-item"><div className="amap-legend-dot" style={{ background: "#1e40af" }} /> NGOs</div>
            <div className="amap-legend-item"><div className="amap-legend-dot" style={{ background: "#c8601a" }} /> Volunteers</div>
          </div>

          <div className="amap-map-wrap">
            {loading ? (
              <div className="amap-loading" />
            ) : (
              <AdminLiveMap listings={activeListings} ngos={ngos} volunteers={volunteers} />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
