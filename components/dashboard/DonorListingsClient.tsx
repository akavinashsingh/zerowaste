"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus, Package, CheckCircle2, Clock, XCircle,
  MapPin, Calendar, Users, Truck, AlertTriangle,
  Flame, Leaf, Box, Filter, KeyRound, RefreshCw,
} from "lucide-react";

type FoodItem = { name: string; quantity: string; unit: string };
type Listing = {
  _id: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  quantityMeals?: number;
  totalMeals?: number;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  images: string[];
  location: { address: string };
  claimedBy?: { name: string; phone: string } | null;
  assignedVolunteer?: { name: string } | null;
  createdAt: string;
};

const STATUS_META = {
  available: { label: "Available", color: "#1a5c38", bg: "#e8f5ee", dot: "#22c55e" },
  claimed: { label: "Claimed", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  picked_up: { label: "Picked Up", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
  expired: { label: "Expired", color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

const FOOD_TYPE_META = {
  cooked: { label: "Cooked", icon: <Flame size={12} />, color: "#c8601a", bg: "#fff7ed" },
  packaged: { label: "Packaged", icon: <Box size={12} />, color: "#1e40af", bg: "#dbeafe" },
  raw: { label: "Raw", icon: <Leaf size={12} />, color: "#1a5c38", bg: "#e8f5ee" },
};

const STATUS_FILTERS = ["all", "available", "claimed", "picked_up", "delivered", "expired"] as const;
type StatusFilter = (typeof STATUS_FILTERS)[number];

function timeUntil(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { text: "Expired", urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h < 1) return { text: `${m}m left`, urgent: true };
  if (h < 3) return { text: `${h}h ${m}m left`, urgent: true };
  return { text: `${h}h ${m}m left`, urgent: false };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

type OTPInfo = { code: string | null; minutesLeft?: number; loading: boolean };

export default function DonorListingsClient({ onNewListing }: { onNewListing?: () => void }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [otpMap, setOtpMap] = useState<Record<string, OTPInfo>>({});

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/listings/my", { cache: "no-store" });
      const data = (await res.json()) as { listings?: Listing[] };
      setListings(data.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  async function fetchOTP(listingId: string) {
    setOtpMap((prev) => ({ ...prev, [listingId]: { code: null, loading: true } }));
    try {
      const res = await fetch(`/api/otp/view?listingId=${listingId}&type=pickup`);
      const data = (await res.json()) as { code?: string | null; minutesLeft?: number };
      setOtpMap((prev) => ({ ...prev, [listingId]: { code: data.code ?? null, minutesLeft: data.minutesLeft, loading: false } }));
    } catch {
      setOtpMap((prev) => ({ ...prev, [listingId]: { code: null, loading: false } }));
    }
  }

  const filtered = statusFilter === "all" ? listings : listings.filter((l) => l.status === statusFilter);

  const stats = {
    total: listings.length,
    active: listings.filter((l) => l.status === "available" || l.status === "claimed").length,
    delivered: listings.filter((l) => l.status === "delivered").length,
    expired: listings.filter((l) => l.status === "expired").length,
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .dl { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .dl-inner { max-width:1100px; margin:0 auto; }
        .dl-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .dl-title-group { display:flex; flex-direction:column; gap:4px; }
        .dl-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:0.5rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); width:fit-content; }
        .dl-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .dl-sub { font-size:0.875rem; color:#6b6560; font-weight:300; }
        .dl-post-btn { display:inline-flex; align-items:center; gap:8px; padding:0.7rem 1.4rem; background:#1a5c38; color:white; border:none; border-radius:14px; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; cursor:pointer; box-shadow:0 4px 14px rgba(26,92,56,0.28); transition:all 0.2s; text-decoration:none; }
        .dl-post-btn:hover { background:#2d7a50; transform:translateY(-1px); }

        .dl-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:1.75rem; }
        .dl-stat { background:white; border-radius:16px; padding:1.1rem 1.25rem; border:1px solid rgba(44,40,32,0.08); }
        .dl-stat-icon { width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; margin-bottom:0.75rem; }
        .dl-stat-val { font-family:'Fraunces',serif; font-size:1.75rem; font-weight:900; letter-spacing:-0.04em; color:#2c2820; line-height:1; }
        .dl-stat-lbl { font-size:0.75rem; color:#6b6560; margin-top:3px; }

        .dl-filters { display:flex; align-items:center; gap:0.5rem; margin-bottom:1.5rem; flex-wrap:wrap; }
        .dl-filter-label { display:flex; align-items:center; gap:5px; font-size:0.75rem; font-weight:700; letter-spacing:0.08em; text-transform:uppercase; color:#a09a94; margin-right:4px; }
        .dl-filter-btn { padding:5px 14px; border-radius:100px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; white-space:nowrap; }
        .dl-filter-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .dl-filter-btn.active { background:#1a5c38; border-color:#1a5c38; color:white; }

        .dl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.25rem; }
        .dl-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.22s; }
        .dl-card:hover { transform:translateY(-3px); box-shadow:0 10px 32px rgba(44,40,32,0.10); }
        .dl-card-img { width:100%; height:130px; object-fit:cover; display:block; }
        .dl-card-img-ph { width:100%; height:130px; background:linear-gradient(135deg,#e8f5ee,#d4edde); display:flex; align-items:center; justify-content:center; font-size:2.5rem; }
        .dl-card-body { padding:1rem 1.2rem; }
        .dl-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:0.65rem; }
        .dl-card-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:700; color:#2c2820; letter-spacing:-0.01em; line-height:1.3; }
        .dl-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; flex-shrink:0; }
        .dl-badge-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }
        .dl-tags { display:flex; flex-wrap:wrap; gap:4px; margin-bottom:0.75rem; }
        .dl-tag { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:8px; font-size:0.68rem; font-weight:600; }
        .dl-meta { font-size:0.75rem; color:#6b6560; display:flex; flex-direction:column; gap:4px; margin-bottom:0.75rem; }
        .dl-meta-row { display:flex; align-items:center; gap:6px; }
        .dl-chip { display:flex; align-items:center; gap:6px; padding:5px 10px; border-radius:10px; font-size:0.72rem; font-weight:600; margin-top:4px; }
        .dl-footer { padding:0.75rem 1.2rem; border-top:1px solid rgba(44,40,32,0.06); display:flex; align-items:center; justify-content:space-between; }
        .dl-footer-date { font-size:0.72rem; color:#a09a94; }
        .dl-expiry { font-size:0.72rem; font-weight:600; }
        .dl-expiry.urgent { color:#dc2626; animation:pulse-text 2s ease-in-out infinite; }
        .dl-expiry.ok { color:#1a5c38; }
        @keyframes pulse-text { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .dl-otp-box { margin-top:8px; padding:10px 12px; border-radius:12px; background:#fff7ed; border:1.5px solid rgba(234,88,12,0.2); display:flex; align-items:center; justify-content:space-between; gap:8px; }
        .dl-otp-label { font-size:0.68rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#c2410c; }
        .dl-otp-code { font-family:monospace; font-size:1.35rem; font-weight:800; letter-spacing:0.22em; color:#9a3412; }
        .dl-otp-timer { font-size:0.65rem; color:#c2410c; opacity:0.75; margin-top:1px; }
        .dl-otp-btn { display:inline-flex; align-items:center; gap:4px; padding:5px 10px; border-radius:8px; border:1.5px solid rgba(234,88,12,0.25); background:white; font-family:'DM Sans',sans-serif; font-size:0.72rem; font-weight:600; color:#c2410c; cursor:pointer; white-space:nowrap; transition:all 0.15s; }
        .dl-otp-btn:hover { background:#fff7ed; }
        .dl-empty { text-align:center; padding:4rem 2rem; background:white; border-radius:20px; border:1.5px dashed rgba(44,40,32,0.12); }
        .dl-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.4; }
        .dl-empty-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:700; color:#2c2820; margin-bottom:0.5rem; }
        .dl-empty-sub { font-size:0.85rem; color:#a09a94; font-weight:300; }
        .dl-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; border-radius:14px; animation:shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media(max-width:900px) { .dl-stats{grid-template-columns:repeat(2,1fr)} .dl{padding:1.5rem 1rem 6rem} }
        @media(max-width:540px) { .dl-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="dl">
        <div className="dl-inner">
          <div className="dl-header">
            <div className="dl-title-group">
              <Link href="/dashboard/donor" className="dl-back">← Dashboard</Link>
              <div className="dl-title">My Listings</div>
              <div className="dl-sub">All your food donation listings in one place.</div>
            </div>
            <Link href="/dashboard/donor" className="dl-post-btn" onClick={onNewListing}>
              <Plus size={15} /> Post New Listing
            </Link>
          </div>

          <div className="dl-stats">
            {[
              { icon: <Package size={16} />, iconBg: "#e8f5ee", iconColor: "#1a5c38", val: stats.total, lbl: "Total Posted" },
              { icon: <Clock size={16} />, iconBg: "#fef3c7", iconColor: "#92400e", val: stats.active, lbl: "Active Now" },
              { icon: <CheckCircle2 size={16} />, iconBg: "#ede9fe", iconColor: "#5b21b6", val: stats.delivered, lbl: "Delivered" },
              { icon: <XCircle size={16} />, iconBg: "#fee2e2", iconColor: "#991b1b", val: stats.expired, lbl: "Expired" },
            ].map((s) => (
              <div key={s.lbl} className="dl-stat">
                <div className="dl-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
                <div className="dl-stat-val">{s.val}</div>
                <div className="dl-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          <div className="dl-filters">
            <span className="dl-filter-label"><Filter size={13} /> Filter</span>
            {STATUS_FILTERS.map((sf) => (
              <button
                key={sf}
                className={`dl-filter-btn ${statusFilter === sf ? "active" : ""}`}
                onClick={() => setStatusFilter(sf)}
              >
                {sf === "all" ? "All" : STATUS_META[sf as keyof typeof STATUS_META]?.label ?? sf}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="dl-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "white", border: "1px solid rgba(44,40,32,0.08)" }}>
                  <div className="dl-skeleton" style={{ height: 130 }} />
                  <div style={{ padding: "1rem 1.2rem" }}>
                    <div className="dl-skeleton" style={{ height: 16, width: "60%", marginBottom: 10 }} />
                    <div className="dl-skeleton" style={{ height: 12, width: "40%", marginBottom: 8 }} />
                    <div className="dl-skeleton" style={{ height: 12, width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="dl-empty">
              <div className="dl-empty-icon">🍱</div>
              <div className="dl-empty-title">{statusFilter === "all" ? "No listings yet" : `No ${STATUS_META[statusFilter as keyof typeof STATUS_META]?.label ?? statusFilter} listings`}</div>
              <div className="dl-empty-sub">{statusFilter === "all" ? "Post your first surplus food listing to get started." : "Try a different filter."}</div>
            </div>
          ) : (
            <div className="dl-grid">
              {filtered.map((listing) => {
                const sm = STATUS_META[listing.status];
                const fm = FOOD_TYPE_META[listing.foodType];
                const expiry = timeUntil(listing.expiresAt);
                const foodTitle = listing.foodItems.map((f) => f.name).join(", ");
                const meals = listing.quantityMeals ?? listing.totalMeals ?? 0;
                return (
                  <div key={listing._id} className="dl-card">
                    {listing.images?.[0]
                      ? <Image src={listing.images[0]} alt={foodTitle} className="dl-card-img" width={400} height={130} unoptimized />
                      : <div className="dl-card-img-ph">🍽️</div>
                    }
                    <div className="dl-card-body">
                      <div className="dl-card-top">
                        <div className="dl-card-title">{foodTitle}</div>
                        <div className="dl-badge" style={{ background: sm.bg, color: sm.color }}>
                          <span className="dl-badge-dot" style={{ background: sm.dot }} />
                          {sm.label}
                        </div>
                      </div>
                      <div className="dl-tags">
                        <span className="dl-tag" style={{ background: fm.bg, color: fm.color }}>{fm.icon} {fm.label}</span>
                        <span className="dl-tag" style={{ background: "#f5f3ef", color: "#6b6560" }}><Users size={11} /> {meals} meals</span>
                        <span className="dl-tag" style={{ background: "#f5f3ef", color: "#6b6560" }}><Package size={11} /> {listing.totalQuantity}</span>
                      </div>
                      <div className="dl-meta">
                        <div className="dl-meta-row"><MapPin size={12} style={{ color: "#a09a94", flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.location.address}</span></div>
                        <div className="dl-meta-row"><Calendar size={12} style={{ color: "#a09a94", flexShrink: 0 }} />Posted {fmtDate(listing.createdAt)}</div>
                      </div>
                      {listing.claimedBy && (
                        <div className="dl-chip" style={{ background: "#f0fdf4", border: "1px solid rgba(26,92,56,0.12)", color: "#1a5c38" }}>
                          <CheckCircle2 size={12} /> Claimed by {listing.claimedBy.name}
                        </div>
                      )}
                      {listing.assignedVolunteer && (
                        <div className="dl-chip" style={{ background: "#eff6ff", border: "1px solid rgba(29,78,216,0.12)", color: "#1e40af", marginTop: 4 }}>
                          <Truck size={12} /> Volunteer: {listing.assignedVolunteer.name}
                        </div>
                      )}
                      {listing.assignedVolunteer && listing.status === "claimed" && (() => {
                        const otp = otpMap[listing._id];
                        if (!otp) {
                          return (
                            <button className="dl-otp-btn" style={{ marginTop: 8, width: "100%", justifyContent: "center" }} onClick={() => void fetchOTP(listing._id)}>
                              <KeyRound size={12} /> Show Pickup Code
                            </button>
                          );
                        }
                        if (otp.loading) {
                          return (
                            <div className="dl-otp-box">
                              <span className="dl-otp-label">Pickup Code</span>
                              <span style={{ fontSize: "0.75rem", color: "#c2410c" }}>Loading…</span>
                            </div>
                          );
                        }
                        return (
                          <div className="dl-otp-box">
                            <div>
                              <div className="dl-otp-label"><KeyRound size={10} style={{ display: "inline", marginRight: 3 }} />Pickup Code — share with volunteer</div>
                              <div className="dl-otp-code">{otp.code ?? "—"}</div>
                              {otp.minutesLeft !== undefined && <div className="dl-otp-timer">Expires in {otp.minutesLeft} min</div>}
                            </div>
                            <button className="dl-otp-btn" onClick={() => void fetchOTP(listing._id)} title="Refresh OTP">
                              <RefreshCw size={11} />
                            </button>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="dl-footer">
                      <div className="dl-footer-date">Expires {fmtDate(listing.expiresAt)}</div>
                      <div className={`dl-expiry ${expiry.urgent ? "urgent" : "ok"}`}>
                        {expiry.urgent && <AlertTriangle size={10} style={{ display: "inline", marginRight: 2 }} />}
                        {expiry.text}
                      </div>
                    </div>
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
