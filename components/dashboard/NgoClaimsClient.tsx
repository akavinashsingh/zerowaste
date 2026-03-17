"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Clock, Phone, Truck, Package } from "lucide-react";

type FoodItem = { name: string; quantity: string; unit: string };
type Listing = {
  _id: string;
  donorName: string;
  donorPhone: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  assignedVolunteer?: { name: string; phone: string } | null;
  claimedAt?: string;
};

const STATUS_META = {
  available: { label: "Available", color: "#1a5c38", bg: "#e8f5ee", dot: "#22c55e" },
  claimed: { label: "Claimed", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  picked_up: { label: "Picked Up", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
  expired: { label: "Expired", color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function NgoClaimsClient() {
  const [claims, setClaims] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchClaims = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/listings/claimed", { cache: "no-store" });
      const data = (await res.json()) as { listings?: Listing[] };
      setClaims(data.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchClaims();
  }, [fetchClaims]);

  const active = claims.filter((c) => c.status !== "delivered" && c.status !== "expired");
  const completed = claims.filter((c) => c.status === "delivered");

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .nc { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .nc-inner { max-width:1000px; margin:0 auto; }
        .nc-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .nc-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; margin-bottom:4px; }
        .nc-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-bottom:2rem; }
        .nc-section-label { font-size:0.7rem; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#a09a94; margin-bottom:0.875rem; margin-top:2rem; }
        .nc-section-label:first-of-type { margin-top:0; }
        .nc-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.25rem; margin-bottom:0.5rem; }
        .nc-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); padding:1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.2s; }
        .nc-card:hover { transform:translateY(-2px); box-shadow:0 8px 24px rgba(44,40,32,0.09); }
        .nc-card-top { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:0.75rem; gap:8px; }
        .nc-card-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:700; color:#2c2820; line-height:1.3; }
        .nc-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; flex-shrink:0; }
        .nc-badge-dot { width:6px; height:6px; border-radius:50%; }
        .nc-meta { font-size:0.78rem; color:#6b6560; display:flex; flex-direction:column; gap:5px; margin-bottom:0.875rem; }
        .nc-meta-row { display:flex; align-items:center; gap:6px; }
        .nc-chip { display:flex; align-items:center; gap:7px; padding:7px 11px; border-radius:11px; font-size:0.75rem; font-weight:600; margin-top:4px; }
        .nc-empty { text-align:center; padding:3rem 2rem; background:white; border-radius:18px; border:1.5px dashed rgba(44,40,32,0.12); }
        .nc-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.35; }
        .nc-empty-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:700; color:#2c2820; margin-bottom:0.4rem; }
        .nc-empty-sub { font-size:0.82rem; color:#a09a94; font-weight:300; }
        .nc-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:20px; height:160px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media(max-width:900px) { .nc{padding:1.5rem 1rem 6rem} }
        @media(max-width:540px) { .nc-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="nc">
        <div className="nc-inner">
          <Link href="/dashboard/ngo" className="nc-back">← Dashboard</Link>
          <div className="nc-title">My Claims</div>
          <div className="nc-sub">{active.length} active · {completed.length} completed</div>

          {loading ? (
            <div className="nc-grid">{[1, 2, 3].map((i) => <div key={i} className="nc-skeleton" />)}</div>
          ) : claims.length === 0 ? (
            <div className="nc-empty">
              <div className="nc-empty-icon">📋</div>
              <div className="nc-empty-title">No claims yet</div>
              <div className="nc-empty-sub">Browse available food and claim listings to see them here.</div>
            </div>
          ) : (
            <>
              {active.length > 0 && (
                <>
                  <div className="nc-section-label">Active Claims</div>
                  <div className="nc-grid">
                    {active.map((c) => {
                      const sm = STATUS_META[c.status];
                      return (
                        <div key={c._id} className="nc-card">
                          <div className="nc-card-top">
                            <div className="nc-card-title">{c.foodItems.map((f) => f.name).join(", ")}</div>
                            <div className="nc-badge" style={{ background: sm.bg, color: sm.color }}>
                              <span className="nc-badge-dot" style={{ background: sm.dot }} />{sm.label}
                            </div>
                          </div>
                          <div className="nc-meta">
                            <div className="nc-meta-row"><Package size={12} style={{ color: "#a09a94" }} />{c.totalQuantity}</div>
                            <div className="nc-meta-row"><Clock size={12} style={{ color: "#a09a94" }} />Expires {fmtDate(c.expiresAt)}</div>
                            <div className="nc-meta-row"><Phone size={12} style={{ color: "#a09a94" }} />Donor: {c.donorName} · {c.donorPhone}</div>
                          </div>
                          {c.assignedVolunteer ? (
                            <div className="nc-chip" style={{ background: "#eff6ff", border: "1px solid rgba(29,78,216,0.15)", color: "#1e40af" }}>
                              <Truck size={13} /> Volunteer: {c.assignedVolunteer.name} · {c.assignedVolunteer.phone}
                            </div>
                          ) : (
                            <div className="nc-chip" style={{ background: "#f5f3ef", border: "1px solid rgba(44,40,32,0.08)", color: "#a09a94" }}>
                              <Truck size={13} /> Awaiting volunteer assignment
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {completed.length > 0 && (
                <>
                  <div className="nc-section-label">Completed Deliveries</div>
                  <div className="nc-grid">
                    {completed.map((c) => (
                      <div key={c._id} className="nc-card" style={{ opacity: 0.8 }}>
                        <div className="nc-card-top">
                          <div className="nc-card-title">{c.foodItems.map((f) => f.name).join(", ")}</div>
                          <div className="nc-badge" style={{ background: "#ede9fe", color: "#5b21b6" }}>
                            <span className="nc-badge-dot" style={{ background: "#8b5cf6" }} />Delivered
                          </div>
                        </div>
                        <div className="nc-meta">
                          <div className="nc-meta-row"><Package size={12} style={{ color: "#a09a94" }} />{c.totalQuantity}</div>
                          <div className="nc-meta-row"><Phone size={12} style={{ color: "#a09a94" }} />From {c.donorName}</div>
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
    </>
  );
}
