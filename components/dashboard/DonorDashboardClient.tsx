"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Plus, Package, CheckCircle2, Clock, XCircle,
  ChevronRight, MapPin, Loader2, Upload, X,
  Flame, Leaf, Box, Calendar, Users, Truck,
  AlertTriangle, Sparkles, Trash2
} from "lucide-react";
import { useSocket } from "@/hooks/useSocket";

/* -- types -- */
type FoodItem = { name: string; quantity: string; unit: string };

type NgoFoodDemand = {
  _id: string;
  ngoName: string;
  mealsRequired: number;
  foodType?: string;
  urgency: "low" | "medium" | "high";
  status: "open" | "accepted" | "fulfilled" | "expired";
  acceptedByName?: string;
  deliveryId?: string;
  deliveryStatus?: "open" | "assigned" | "picked_up" | "delivered";
  location: { lat: number; lng: number; address: string };
  distanceKm?: number;
  createdAt: string;
};
type PartialClaim = { ngoName: string; claimedItems: FoodItem[]; claimedAt: string };
type Listing = {
  _id: string;
  foodItems: FoodItem[];
  remainingItems?: FoodItem[];
  partialClaims?: PartialClaim[];
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

type DonorStats = {
  total: number;
  active: number;
  delivered: number;
  expired: number;
};

/* -- helpers -- */
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

const UNITS = ["kg", "g", "litres", "pcs", "packets", "boxes", "servings"];

/* =================================================================
   DONOR DASHBOARD
================================================================= */
export default function DonorDashboard({
  donorName,
  donorAddress = "",
  donorLat,
  donorLng,
}: {
  donorName: string;
  donorAddress?: string;
  donorLat?: number;
  donorLng?: number;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [stats, setStats] = useState<DonorStats>({ total: 0, active: 0, delivered: 0, expired: 0 });
  const [loadingListings, setLoadingListings] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [ngoDemands, setNgoDemands] = useState<NgoFoodDemand[]>([]);
  const [demandsLoading, setDemandsLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [demandError, setDemandError] = useState<string | null>(null);
  const [otpView, setOtpView] = useState<{ deliveryId: string; code: string | null; loading: boolean } | null>(null);
  const { socketRef } = useSocket();

  const fetchListings = useCallback(async () => {
    setLoadingListings(true);
    try {
      const res = await fetch("/api/listings/my", { cache: "no-store" });
      const data = (await res.json()) as { listings?: Listing[] };
      const normalized = data.listings ?? [];
      setListings(normalized);
      setStats({
        total: normalized.length,
        active: normalized.filter((l) => l.status === "available" || l.status === "claimed").length,
        delivered: normalized.filter((l) => l.status === "delivered").length,
        expired: normalized.filter((l) => l.status === "expired").length,
      });
    } finally {
      setLoadingListings(false);
    }
  }, []);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  const fetchDemands = useCallback(async () => {
    setDemandsLoading(true);
    try {
      const url =
        donorLat && donorLng
          ? `/api/demands?lat=${donorLat}&lng=${donorLng}&radius=50&status=open`
          : "/api/demands?status=open";
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { demands?: NgoFoodDemand[] };
      setNgoDemands(data.demands ?? []);
    } finally {
      setDemandsLoading(false);
    }
  }, [donorLat, donorLng]);

  useEffect(() => {
    void fetchDemands();
  }, [fetchDemands]);

  // Real-time: refresh when volunteer is assigned or listing status changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    const refresh = () => void fetchListings();
    socket.on("volunteer_assigned", refresh);
    socket.on("listing_status", refresh);

    // Real-time: update demand card when volunteer is assigned (status changes)
    const onDeliveryStatus = (data: { demandId: string; deliveryId: string; status: string }) => {
      setNgoDemands((prev) =>
        prev.map((d) =>
          d._id === data.demandId || d.deliveryId === data.deliveryId
            ? { ...d, deliveryStatus: data.status as NgoFoodDemand["deliveryStatus"] }
            : d,
        ),
      );
    };
    socket.on("demand_delivery_status", onDeliveryStatus);

    // Real-time: prepend new NGO demand when received via socket
    const onNgoDemand = (raw: {
      demandId: string;
      ngoName: string;
      mealsRequired: number;
      foodType?: string | null;
      urgency: "low" | "medium" | "high";
      distanceKm?: number;
      address: string;
      createdAt: string;
    }) => {
      const demand: NgoFoodDemand = {
        _id: raw.demandId,
        ngoName: raw.ngoName,
        mealsRequired: raw.mealsRequired,
        foodType: raw.foodType ?? undefined,
        urgency: raw.urgency,
        status: "open",
        location: { lat: 0, lng: 0, address: raw.address },
        distanceKm: raw.distanceKm,
        createdAt: raw.createdAt,
      };
      setNgoDemands((prev) => [demand, ...prev]);
    };
    socket.on("ngo_demand", onNgoDemand);

    return () => {
      socket.off("volunteer_assigned", refresh);
      socket.off("listing_status", refresh);
      socket.off("ngo_demand", onNgoDemand);
      socket.off("demand_delivery_status", onDeliveryStatus);
    };
  }, [socketRef, fetchListings]);

  async function handleAcceptDemand(demandId: string) {
    setAcceptingId(demandId);
    setDemandError(null);
    try {
      const res = await fetch(`/api/demands/${demandId}/accept`, { method: "POST" });
      const data = (await res.json()) as { id?: string; deliveryId?: string; acceptedByName?: string; error?: string };
      if (!res.ok) {
        setDemandError(data.error ?? "Failed to accept demand.");
        return;
      }
      setNgoDemands((prev) =>
        prev.map((d) =>
          d._id === demandId
            ? { ...d, status: "accepted" as const, acceptedByName: data.acceptedByName ?? "you", deliveryId: data.deliveryId }
            : d,
        ),
      );
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleViewOtp(deliveryId: string) {
    setOtpView({ deliveryId, code: null, loading: true });
    try {
      const res = await fetch(`/api/otp/view?listingId=${deliveryId}&type=pickup`, { cache: "no-store" });
      const data = (await res.json()) as { code?: string | null };
      setOtpView({ deliveryId, code: data.code ?? null, loading: false });
    } catch {
      setOtpView({ deliveryId, code: null, loading: false });
    }
  }

  async function handleDelete(listingId: string) {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    setDeletingId(listingId);
    try {
      const res = await fetch(`/api/listings/${listingId}`, { method: "DELETE" });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l._id !== listingId));
        setStats((prev) => ({ ...prev, total: prev.total - 1, active: Math.max(0, prev.active - 1) }));
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,300&family=DM+Sans:wght@300;400;500;600&display=swap');
        .dd { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .dd-inner { max-width:1100px; margin:0 auto; }

        .dd-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:2rem; flex-wrap:wrap; gap:1rem; }
        .dd-greeting { font-family:'Fraunces',serif; font-size:clamp(1.6rem,3vw,2.2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; line-height:1.1; }
        .dd-greeting span { font-style:italic; color:#1a5c38; }
        .dd-sub { font-size:0.875rem; color:#6b6560; margin-top:4px; font-weight:300; }
        .dd-post-btn { display:inline-flex; align-items:center; gap:8px; padding:0.75rem 1.5rem; background:#1a5c38; color:white; border:none; border-radius:14px; font-family:'DM Sans',sans-serif; font-size:0.9rem; font-weight:600; cursor:pointer; box-shadow:0 4px 14px rgba(26,92,56,0.28); transition:all 0.2s; }
        .dd-post-btn:hover { background:#2d7a50; transform:translateY(-1px); box-shadow:0 6px 20px rgba(26,92,56,0.32); }
        .dd-post-btn:active { transform:translateY(0); }

        .dd-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:1rem; margin-bottom:2rem; }
        .dd-stat { background:white; border-radius:18px; padding:1.25rem 1.5rem; border:1px solid rgba(44,40,32,0.08); box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.2s; }
        .dd-stat:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(44,40,32,0.09); }
        .dd-stat-icon { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; margin-bottom:0.875rem; }
        .dd-stat-val { font-family:'Fraunces',serif; font-size:2rem; font-weight:900; letter-spacing:-0.04em; color:#2c2820; line-height:1; }
        .dd-stat-lbl { font-size:0.78rem; color:#6b6560; margin-top:4px; font-weight:400; }

        .dd-sec-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; }
        .dd-sec-title { font-family:'Fraunces',serif; font-size:1.2rem; font-weight:800; color:#2c2820; letter-spacing:-0.02em; }
        .dd-sec-count { font-size:0.78rem; color:#a09a94; font-weight:500; }

        .dd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1.25rem; }
        .dd-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.22s; }
        .dd-card:hover { transform:translateY(-3px); box-shadow:0 10px 32px rgba(44,40,32,0.10); }

        .dd-card-img { width:100%; height:140px; object-fit:cover; display:block; }
        .dd-card-img-placeholder { width:100%; height:140px; background:linear-gradient(135deg,#e8f5ee,#d4edde); display:flex; align-items:center; justify-content:center; font-size:3rem; }

        .dd-card-body { padding:1.1rem 1.25rem; }
        .dd-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; margin-bottom:0.75rem; }
        .dd-card-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:700; color:#2c2820; letter-spacing:-0.01em; line-height:1.3; }

        .dd-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 9px; border-radius:100px; font-size:0.7rem; font-weight:700; flex-shrink:0; }
        .dd-badge-dot { width:6px; height:6px; border-radius:50%; flex-shrink:0; }

        .dd-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:0.875rem; }
        .dd-tag { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:8px; font-size:0.7rem; font-weight:600; }

        .dd-card-meta { display:flex; flex-direction:column; gap:5px; font-size:0.78rem; color:#6b6560; margin-bottom:0.875rem; }
        .dd-card-meta-row { display:flex; align-items:center; gap:6px; }

        .dd-card-footer { padding:0.875rem 1.25rem; border-top:1px solid rgba(44,40,32,0.06); display:flex; align-items:center; justify-content:space-between; }
        .dd-card-footer-text { font-size:0.75rem; color:#a09a94; }
        .dd-expiry { font-size:0.75rem; font-weight:600; }
        .dd-expiry.urgent { color:#dc2626; animation:pulse-text 2s ease-in-out infinite; }
        .dd-expiry.ok { color:#1a5c38; }
        @keyframes pulse-text { 0%,100%{opacity:1} 50%{opacity:0.6} }

        .dd-ngo-chip { display:flex; align-items:center; gap:6px; padding:6px 10px; background:#f0fdf4; border:1px solid rgba(26,92,56,0.12); border-radius:10px; font-size:0.75rem; color:#1a5c38; font-weight:600; margin-top:6px; }

        .dd-empty { text-align:center; padding:4rem 2rem; background:white; border-radius:20px; border:1.5px dashed rgba(44,40,32,0.12); }
        .dd-empty-icon { font-size:3rem; margin-bottom:1rem; opacity:0.4; }
        .dd-empty-title { font-family:'Fraunces',serif; font-size:1.2rem; font-weight:700; color:#2c2820; margin-bottom:0.5rem; }
        .dd-empty-sub { font-size:0.875rem; color:#a09a94; font-weight:300; }

        .dd-ai-banner { background:linear-gradient(135deg,#1a5c38,#2d7a50); border-radius:20px; padding:1.5rem; margin-bottom:2rem; display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap; }
        .dd-ai-left { display:flex; align-items:center; gap:12px; }
        .dd-ai-icon { width:44px; height:44px; background:rgba(255,255,255,0.15); border-radius:12px; display:flex; align-items:center; justify-content:center; font-size:1.4rem; flex-shrink:0; }
        .dd-ai-title { font-family:'Fraunces',serif; font-size:1rem; font-weight:700; color:white; margin-bottom:2px; }
        .dd-ai-sub { font-size:0.78rem; color:rgba(255,255,255,0.7); font-weight:300; }
        .dd-ai-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1.1rem; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:10px; color:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; cursor:pointer; text-decoration:none; transition:all 0.2s; white-space:nowrap; }
        .dd-ai-btn:hover { background:rgba(255,255,255,0.25); }

        .dd-fab { display:none; position:fixed; bottom:1.5rem; right:1.5rem; z-index:50; width:56px; height:56px; border-radius:50%; background:#1a5c38; border:none; color:white; font-size:1.5rem; cursor:pointer; box-shadow:0 4px 20px rgba(26,92,56,0.4); align-items:center; justify-content:center; }

        .dd-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; border-radius:14px; animation:shimmer 1.5s infinite; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }

        .dd-demands-sec { margin-top:2.5rem; }
        .dd-demands-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1rem; }
        .dd-demand-card { background:white; border-radius:18px; border:1px solid rgba(44,40,32,0.08); padding:1.1rem 1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.2s; }
        .dd-demand-card:hover { transform:translateY(-2px); box-shadow:0 6px 18px rgba(44,40,32,0.09); }
        .dd-demand-top { display:flex; align-items:flex-start; justify-content:space-between; gap:0.5rem; margin-bottom:0.6rem; }
        .dd-demand-ngo { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:800; color:#2c2820; }
        .dd-demand-meals { font-size:0.78rem; color:#6b6560; margin-top:2px; }
        .dd-demand-urgency { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; flex-shrink:0; }
        .dd-demand-urgency.high { background:#fee2e2; color:#991b1b; }
        .dd-demand-urgency.medium { background:#fef3c7; color:#92400e; }
        .dd-demand-urgency.low { background:#dcfce7; color:#166534; }
        .dd-demand-meta { font-size:0.75rem; color:#6b6560; display:flex; flex-direction:column; gap:3px; margin-top:0.5rem; }
        .dd-demand-meals-big { font-family:'Fraunces',serif; font-size:1.5rem; font-weight:900; color:#1e40af; line-height:1; }
        .dd-demand-accept { width:100%; margin-top:0.75rem; padding:0.6rem; background:#1e40af; color:#fff; border:none; border-radius:10px; font-size:0.82rem; font-weight:700; cursor:pointer; transition:background 0.15s; }
        .dd-demand-accept:hover:not(:disabled) { background:#1d4ed8; }
        .dd-demand-accept:disabled { opacity:0.55; cursor:not-allowed; }
        .dd-demand-accepted-chip { display:flex; align-items:center; gap:6px; margin-top:0.75rem; padding:7px 10px; background:#dcfce7; border:1px solid rgba(22,101,52,0.15); border-radius:10px; font-size:0.76rem; color:#166534; font-weight:600; }
        .dd-demand-taken-chip { display:flex; align-items:center; gap:6px; margin-top:0.75rem; padding:7px 10px; background:#f3f0ea; border:1px solid rgba(44,40,32,0.10); border-radius:10px; font-size:0.76rem; color:#8a837d; font-weight:600; }

        @media(max-width:900px) {
          .dd-stats { grid-template-columns:repeat(2,1fr); }
          .dd-fab { display:flex; }
          .dd-post-btn { display:none; }
          .dd { padding:1.5rem 1rem 6rem; }
        }
        @media(max-width:540px) {
          .dd-stats { grid-template-columns:repeat(2,1fr); }
          .dd-grid { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="dd">
        <div className="dd-inner">
          <div className="dd-header">
            <div>
              <div className="dd-greeting">
                Good work,<br /><span>{donorName}.</span>
              </div>
              <div className="dd-sub">Here&apos;s a summary of your food donations.</div>
            </div>
            <button className="dd-post-btn" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Post Surplus Food
            </button>
          </div>

          <div className="dd-stats">
            {[
              { icon: <Package size={18} />, iconBg: "#e8f5ee", iconColor: "#1a5c38", val: stats.total, lbl: "Total Posted" },
              { icon: <Clock size={18} />, iconBg: "#fef3c7", iconColor: "#92400e", val: stats.active, lbl: "Active Now" },
              { icon: <CheckCircle2 size={18} />, iconBg: "#ede9fe", iconColor: "#5b21b6", val: stats.delivered, lbl: "Delivered" },
              { icon: <XCircle size={18} />, iconBg: "#fee2e2", iconColor: "#991b1b", val: stats.expired, lbl: "Expired" },
            ].map((s) => (
              <div key={s.lbl} className="dd-stat">
                <div className="dd-stat-icon" style={{ background: s.iconBg, color: s.iconColor }}>{s.icon}</div>
                <div className="dd-stat-val">{s.val}</div>
                <div className="dd-stat-lbl">{s.lbl}</div>
              </div>
            ))}
          </div>

          <div className="dd-ai-banner">
            <div className="dd-ai-left">
              <div className="dd-ai-icon">🤖</div>
              <div>
                <div className="dd-ai-title">AI Waste Prediction</div>
                <div className="dd-ai-sub">Get a 7-day forecast of your expected surplus based on your history</div>
              </div>
            </div>
            <Link href="/dashboard/donor/predictions" className="dd-ai-btn">
              <Sparkles size={13} /> View Forecast <ChevronRight size={13} />
            </Link>
          </div>

          <div className="dd-sec-head">
            <div className="dd-sec-title">My Listings</div>
            <div className="dd-sec-count">{listings.length} total</div>
          </div>

          {loadingListings ? (
            <div className="dd-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ borderRadius: 20, overflow: "hidden", background: "white", border: "1px solid rgba(44,40,32,0.08)" }}>
                  <div className="dd-skeleton" style={{ height: 140 }} />
                  <div style={{ padding: "1.1rem 1.25rem" }}>
                    <div className="dd-skeleton" style={{ height: 18, width: "60%", marginBottom: 10 }} />
                    <div className="dd-skeleton" style={{ height: 13, width: "40%", marginBottom: 8 }} />
                    <div className="dd-skeleton" style={{ height: 13, width: "80%" }} />
                  </div>
                </div>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="dd-empty">
              <div className="dd-empty-icon">🍱</div>
              <div className="dd-empty-title">No listings yet</div>
              <div className="dd-empty-sub">Post your first surplus food listing to get started.</div>
            </div>
          ) : (
            <div className="dd-grid">
              {listings.map((listing) => {
                const sm = STATUS_META[listing.status];
                const fm = FOOD_TYPE_META[listing.foodType];
                const expiry = timeUntil(listing.expiresAt);
                const foodTitle = listing.foodItems.map((f) => f.name).join(", ");
                const meals = listing.quantityMeals ?? listing.totalMeals ?? 0;
                return (
                  <div key={listing._id} className="dd-card">
                    {listing.images?.[0]
                      ? <Image src={listing.images[0]} alt={foodTitle} className="dd-card-img" width={640} height={280} unoptimized />
                      : <div className="dd-card-img-placeholder">🍽️</div>
                    }
                    <div className="dd-card-body">
                      <div className="dd-card-top">
                        <div className="dd-card-title">{foodTitle}</div>
                        <div className="dd-badge" style={{ background: sm.bg, color: sm.color }}>
                          <span className="dd-badge-dot" style={{ background: sm.dot }} />
                          {sm.label}
                        </div>
                      </div>

                      <div className="dd-tags">
                        <span className="dd-tag" style={{ background: fm.bg, color: fm.color }}>
                          {fm.icon} {fm.label}
                        </span>
                        <span className="dd-tag" style={{ background: "#f5f3ef", color: "#6b6560" }}>
                          <Users size={11} /> {meals} meals
                        </span>
                        <span className="dd-tag" style={{ background: "#f5f3ef", color: "#6b6560" }}>
                          <Package size={11} /> {listing.totalQuantity}
                        </span>
                      </div>

                      <div className="dd-card-meta">
                        <div className="dd-card-meta-row">
                          <MapPin size={13} style={{ color: "#a09a94", flexShrink: 0 }} />
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.location.address}</span>
                        </div>
                        <div className="dd-card-meta-row">
                          <Calendar size={13} style={{ color: "#a09a94", flexShrink: 0 }} />
                          Posted {fmtDate(listing.createdAt)}
                        </div>
                      </div>

                      {!!listing.partialClaims?.length && listing.status === "available" && (
                        <div style={{ background: "#fff7ed", border: "1px solid rgba(200,96,26,0.2)", borderRadius: 10, padding: "7px 10px", fontSize: "0.75rem", color: "#c8601a", marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, marginBottom: 3 }}>Remaining (partially claimed)</div>
                          {listing.foodItems.map((item, i) => (
                            <div key={i}>{item.name}: {item.quantity} {item.unit}</div>
                          ))}
                        </div>
                      )}
                      {listing.partialClaims && listing.partialClaims.length > 0 && (
                        <div style={{ background: "#f0fdf4", border: "1px solid rgba(22,101,52,0.15)", borderRadius: 10, padding: "7px 10px", fontSize: "0.75rem", color: "#166534", marginBottom: 6 }}>
                          <div style={{ fontWeight: 700, marginBottom: 3 }}>Partial claims ({listing.partialClaims.length})</div>
                          {listing.partialClaims.map((pc, i) => (
                            <div key={i}>{pc.ngoName}: {pc.claimedItems.map((ci) => `${ci.quantity} ${ci.unit} ${ci.name}`).join(", ")}</div>
                          ))}
                        </div>
                      )}
                      {listing.claimedBy && (
                        <div className="dd-ngo-chip">
                          <CheckCircle2 size={13} />
                          Claimed by {listing.claimedBy.name} · {listing.claimedBy.phone}
                        </div>
                      )}
                      {listing.assignedVolunteer && (
                        <div className="dd-ngo-chip" style={{ background: "#eff6ff", borderColor: "rgba(29,78,216,0.12)", color: "#1e40af", marginTop: 4 }}>
                          <Truck size={13} />
                          Volunteer: {listing.assignedVolunteer.name}
                        </div>
                      )}
                    </div>

                    <div className="dd-card-footer">
                      <div className="dd-card-footer-text">Expires {fmtDate(listing.expiresAt)}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className={`dd-expiry ${expiry.urgent ? "urgent" : "ok"}`}>
                          {expiry.urgent && <AlertTriangle size={11} style={{ display: "inline", marginRight: 3 }} />}
                          {expiry.text}
                        </div>
                        {listing.status === "available" && (
                          <button
                            onClick={() => void handleDelete(listing._id)}
                            disabled={deletingId === listing._id}
                            title="Delete listing"
                            style={{ background: "none", border: "none", cursor: "pointer", color: "#a09a94", padding: "2px 4px", borderRadius: 6, display: "flex", alignItems: "center", transition: "color 0.15s" }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#a09a94"; }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {/* NGO Demands Section */}
          <div className="dd-demands-sec">
            <div className="dd-sec-head">
              <div className="dd-sec-title">NGO Food Demands</div>
              <div className="dd-sec-count">{ngoDemands.length} open nearby</div>
            </div>

            {demandError && (
              <div style={{ marginBottom: "0.75rem", background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "8px 12px", fontSize: "0.8rem" }}>
                {demandError}
              </div>
            )}

            {demandsLoading ? (
              <div className="dd-demands-grid">
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ borderRadius: 18, overflow: "hidden", background: "white", border: "1px solid rgba(44,40,32,0.08)", padding: "1.1rem 1.25rem" }}>
                    <div className="dd-skeleton" style={{ height: 16, width: "55%", marginBottom: 8 }} />
                    <div className="dd-skeleton" style={{ height: 12, width: "80%", marginBottom: 6 }} />
                    <div className="dd-skeleton" style={{ height: 12, width: "40%" }} />
                  </div>
                ))}
              </div>
            ) : ngoDemands.length === 0 ? (
              <div className="dd-empty">
                <div className="dd-empty-icon">📋</div>
                <div className="dd-empty-title">No open demands nearby</div>
                <div className="dd-empty-sub">When NGOs post food requests in your area, they will appear here.</div>
              </div>
            ) : (
              <div className="dd-demands-grid">
                {ngoDemands.map((demand) => {
                  const isAccepted = demand.status === "accepted";
                  const isAcceptedByMe = isAccepted && demand.acceptedByName === "you";
                  return (
                    <div key={demand._id} className="dd-demand-card" style={isAccepted ? { opacity: 0.75 } : undefined}>
                      <div className="dd-demand-top">
                        <div>
                          <div className="dd-demand-ngo">{demand.ngoName}</div>
                          <div className="dd-demand-meals">needs food for people</div>
                        </div>
                        <span className={`dd-demand-urgency ${demand.urgency}`}>
                          {demand.urgency === "high" ? "🔴" : demand.urgency === "medium" ? "🟡" : "🟢"}{" "}
                          {demand.urgency.charAt(0).toUpperCase() + demand.urgency.slice(1)}
                        </span>
                      </div>

                      <div className="dd-demand-meals-big">{demand.mealsRequired} <span style={{ fontSize: "0.85rem", fontWeight: 400, color: "#6b6560" }}>meals</span></div>

                      <div className="dd-demand-meta">
                        {demand.foodType && (
                          <div>
                            <Package size={11} style={{ display: "inline", marginRight: 3 }} />
                            Prefers: {demand.foodType}
                          </div>
                        )}
                        <div>
                          <MapPin size={11} style={{ display: "inline", marginRight: 3 }} />
                          {demand.location.address}
                        </div>
                        {demand.distanceKm !== undefined && (
                          <div>{demand.distanceKm} km away</div>
                        )}
                        <div style={{ color: "#a09a94", fontSize: "0.7rem" }}>
                          Posted {fmtDate(demand.createdAt)}
                        </div>
                      </div>

                      {isAcceptedByMe ? (
                        <div>
                          <div className="dd-demand-accepted-chip">
                            <CheckCircle2 size={13} />
                            {demand.deliveryStatus === "assigned" || demand.deliveryStatus === "picked_up"
                              ? "Volunteer on the way"
                              : demand.deliveryStatus === "delivered"
                              ? "Delivered ✓"
                              : "You accepted — waiting for volunteer"}
                          </div>
                          {demand.deliveryId && (demand.deliveryStatus === "assigned") && (
                            <button
                              onClick={() => void handleViewOtp(demand.deliveryId!)}
                              style={{ marginTop: 6, width: "100%", padding: "0.55rem", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.78rem", fontWeight: 700, cursor: "pointer" }}
                            >
                              Show Pickup OTP to Volunteer
                            </button>
                          )}
                        </div>
                      ) : isAccepted ? (
                        <div className="dd-demand-taken-chip">
                          Already accepted by another donor
                        </div>
                      ) : (
                        <button
                          className="dd-demand-accept"
                          disabled={acceptingId === demand._id}
                          onClick={() => void handleAcceptDemand(demand._id)}
                        >
                          {acceptingId === demand._id ? (
                            <><Loader2 size={13} style={{ display: "inline", marginRight: 5, animation: "spin 1s linear infinite" }} />Accepting...</>
                          ) : (
                            "Accept Demand"
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <button className="dd-fab" onClick={() => setShowModal(true)}>
        <Plus size={22} />
      </button>

      {/* OTP overlay for demand pickup */}
      {otpView && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: "1.75rem 1.5rem", width: "100%", maxWidth: 340, textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 900, color: "#2c2820", marginBottom: 6 }}>Your Pickup OTP</div>
            <div style={{ fontSize: "0.8rem", color: "#6b6560", marginBottom: "1.25rem" }}>Show this code to the volunteer when they arrive to collect food.</div>
            {otpView.loading ? (
              <div style={{ fontSize: "2rem", color: "#a09a94" }}>Loading…</div>
            ) : otpView.code ? (
              <div style={{ fontFamily: "'Fraunces',serif", fontSize: "2.5rem", fontWeight: 900, letterSpacing: "0.15em", color: "#1e40af", background: "#eff6ff", borderRadius: 14, padding: "1rem", marginBottom: "1rem" }}>
                {otpView.code}
              </div>
            ) : (
              <div style={{ fontSize: "0.85rem", color: "#6b6560", marginBottom: "1rem" }}>No active OTP yet. The volunteer will trigger it when they accept the task.</div>
            )}
            <button
              onClick={() => setOtpView(null)}
              style={{ padding: "0.6rem 1.5rem", background: "#1e40af", color: "#fff", border: "none", borderRadius: 10, fontSize: "0.85rem", fontWeight: 700, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <PostFoodModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); void fetchListings(); }}
          defaultAddress={donorAddress}
          defaultLat={donorLat}
          defaultLng={donorLng}
        />
      )}
    </>
  );
}

/* =================================================================
   POST FOOD MODAL - 3-step wizard
================================================================= */
function PostFoodModal({
  onClose,
  onSuccess,
  defaultAddress = "",
  defaultLat,
  defaultLng,
}: {
  onClose: () => void;
  onSuccess: () => void;
  defaultAddress?: string;
  defaultLat?: number;
  defaultLng?: number;
}) {
  const [step, setStep] = useState(1);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([{ name: "", quantity: "", unit: "kg" }]);
  const [foodType, setFoodType] = useState<"cooked" | "packaged" | "raw">("cooked");
  const [totalQuantity, setTotalQuantity] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [address, setAddress] = useState(defaultAddress);
  const [lat, setLat] = useState(defaultLat ? String(defaultLat) : "");
  const [lng, setLng] = useState(defaultLng ? String(defaultLng) : "");
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function detectLoc() {
    if (!("geolocation" in navigator)) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const newLat = p.coords.latitude.toFixed(6);
        const newLng = p.coords.longitude.toFixed(6);
        setLat(newLat);
        setLng(newLng);
        // Reverse-geocode to get a human-readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = (await res.json()) as { display_name?: string };
          if (data.display_name) setAddress(data.display_name);
        } catch {
          // Reverse geocode failed — leave address as-is so user can type manually
        }
        setLocLoading(false);
      },
      () => setLocLoading(false),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url: string };
      setImages((prev) => [...prev, data.url]);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodItems,
          foodType,
          totalQuantity,
          expiresAt,
          images,
          location: { lat: Number(lat), lng: Number(lng), address },
        }),
      });
      if (!res.ok) {
        const d = (await res.json()) as { error?: string };
        throw new Error(d.error ?? "Failed");
      }
      onSuccess();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post listing");
    } finally {
      setSubmitting(false);
    }
  }

  const STEP_LABELS = ["Food Details", "Pickup Info", "Review & Post"];
  const canNext1 = foodItems.every((f) => f.name && f.quantity) && totalQuantity;
  const canNext2 = expiresAt && address && lat && lng;

  return (
    <>
      <style>{`
        .modal-overlay { position:fixed; inset:0; background:rgba(44,40,32,0.5); backdrop-filter:blur(6px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; animation:fade-in 0.2s ease; }
        @keyframes fade-in { from{opacity:0} to{opacity:1} }
        .modal-box { background:#faf8f4; border-radius:24px; width:100%; max-width:580px; max-height:90vh; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 24px 80px rgba(44,40,32,0.25); animation:slide-up 0.25s ease; }
        @keyframes slide-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .modal-header { padding:1.5rem 1.75rem 1rem; border-bottom:1px solid rgba(44,40,32,0.08); flex-shrink:0; }
        .modal-title-row { display:flex; align-items:center; justify-content:space-between; margin-bottom:1.25rem; }
        .modal-title { font-family:'Fraunces',serif; font-size:1.3rem; font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .modal-close { width:32px; height:32px; border-radius:50%; border:none; background:rgba(44,40,32,0.08); cursor:pointer; display:flex; align-items:center; justify-content:center; color:#6b6560; transition:all 0.15s; }
        .modal-close:hover { background:rgba(44,40,32,0.14); color:#2c2820; }
        .modal-stepper { display:flex; gap:0; }
        .modal-step { flex:1; display:flex; flex-direction:column; align-items:center; gap:6px; position:relative; }
        .modal-step:not(:last-child)::after { content:''; position:absolute; top:13px; left:50%; width:100%; height:2px; background:rgba(44,40,32,0.1); z-index:0; }
        .modal-step.done::after { background:#1a5c38; }
        .modal-step-dot { width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:0.7rem; font-weight:800; z-index:1; transition:all 0.2s; }
        .modal-step.active .modal-step-dot { background:#1a5c38; color:white; }
        .modal-step.done .modal-step-dot { background:#1a5c38; color:white; }
        .modal-step.inactive .modal-step-dot { background:rgba(44,40,32,0.10); color:#a09a94; }
        .modal-step-lbl { font-size:0.68rem; font-weight:600; color:#a09a94; white-space:nowrap; }
        .modal-step.active .modal-step-lbl { color:#1a5c38; }
        .modal-step.done .modal-step-lbl { color:#1a5c38; }

        .modal-body { padding:1.5rem 1.75rem; overflow-y:auto; flex:1; }
        .modal-footer { padding:1rem 1.75rem; border-top:1px solid rgba(44,40,32,0.08); display:flex; gap:0.75rem; justify-content:flex-end; flex-shrink:0; }

        .mf-label { font-size:0.78rem; font-weight:700; letter-spacing:0.06em; text-transform:uppercase; color:#a09a94; margin-bottom:0.6rem; display:block; }
        .mf-input { width:100%; height:48px; padding:0 14px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; color:#2c2820; outline:none; transition:all 0.18s; }
        .mf-input:focus { border-color:#1a5c38; box-shadow:0 0 0 3px rgba(26,92,56,0.1); }
        .mf-select { appearance:none; background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a09a94' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E"); background-repeat:no-repeat; background-position:right 12px center; padding-right:36px; cursor:pointer; }
        .mf-row { display:grid; grid-template-columns:1fr auto 80px; gap:8px; align-items:end; margin-bottom:8px; }
        .mf-add-btn { height:36px; padding:0 12px; border-radius:10px; border:1.5px dashed rgba(44,40,32,0.15); background:transparent; font-family:'DM Sans',sans-serif; font-size:0.8rem; font-weight:600; color:#6b6560; cursor:pointer; display:flex; align-items:center; gap:5px; transition:all 0.15s; width:100%; justify-content:center; margin-bottom:1rem; }
        .mf-add-btn:hover { border-color:#1a5c38; color:#1a5c38; background:#e8f5ee; }
        .mf-remove-btn { width:36px; height:48px; border:none; background:transparent; color:#a09a94; cursor:pointer; border-radius:10px; display:flex; align-items:center; justify-content:center; transition:all 0.15s; }
        .mf-remove-btn:hover { background:#fee2e2; color:#dc2626; }

        .mf-food-type-row { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; margin-bottom:1.25rem; }
        .mf-type-btn { padding:0.75rem; border-radius:14px; border:1.5px solid rgba(44,40,32,0.10); background:white; cursor:pointer; text-align:center; transition:all 0.15s; }
        .mf-type-btn.active { border-color:rgba(26,92,56,0.35); background:#e8f5ee; }
        .mf-type-icon { font-size:1.3rem; margin-bottom:4px; }
        .mf-type-lbl { font-size:0.78rem; font-weight:600; color:#2c2820; }

        .mf-loc-row { display:grid; grid-template-columns:1fr 1fr auto; gap:8px; }
        .mf-loc-btn { height:48px; padding:0 14px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; color:#1a5c38; font-family:'DM Sans',sans-serif; font-size:0.8rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:5px; white-space:nowrap; transition:all 0.15s; }
        .mf-loc-btn:hover { background:#e8f5ee; }

        .mf-img-row { display:flex; flex-wrap:wrap; gap:8px; }
        .mf-img-thumb { width:72px; height:72px; border-radius:12px; object-fit:cover; }
        .mf-img-add { width:72px; height:72px; border-radius:12px; border:1.5px dashed rgba(44,40,32,0.15); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:3px; cursor:pointer; background:white; transition:all 0.15s; color:#a09a94; font-size:0.6rem; font-weight:600; }
        .mf-img-add:hover { border-color:#1a5c38; color:#1a5c38; background:#e8f5ee; }

        .mf-review-row { display:flex; justify-content:space-between; padding:0.75rem 0; border-bottom:1px solid rgba(44,40,32,0.06); font-size:0.875rem; }
        .mf-review-label { color:#6b6560; font-weight:400; }
        .mf-review-value { color:#2c2820; font-weight:600; text-align:right; max-width:60%; }

        .mf-error { padding:10px 14px; border-radius:10px; background:#fef2f2; border:1px solid rgba(239,68,68,0.2); color:#dc2626; font-size:0.82rem; margin-bottom:1rem; }

        .btn-back { padding:0.6rem 1.2rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .btn-back:hover { border-color:#2c2820; color:#2c2820; }
        .btn-next { padding:0.6rem 1.4rem; border-radius:12px; background:#1a5c38; border:none; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; color:white; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 3px 10px rgba(26,92,56,0.25); transition:all 0.15s; }
        .btn-next:hover:not(:disabled) { background:#2d7a50; }
        .btn-next:disabled { opacity:0.5; cursor:not-allowed; }
      `}</style>

      <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="modal-box">
          <div className="modal-header">
            <div className="modal-title-row">
              <div className="modal-title">Post Surplus Food</div>
              <button className="modal-close" onClick={onClose}><X size={16} /></button>
            </div>
            <div className="modal-stepper">
              {STEP_LABELS.map((lbl, i) => {
                const n = i + 1;
                const cls = step === n ? "active" : step > n ? "done" : "inactive";
                return (
                  <div key={lbl} className={`modal-step ${cls}`}>
                    <div className="modal-step-dot">{step > n ? "✓" : n}</div>
                    <div className="modal-step-lbl">{lbl}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="modal-body">
            {step === 1 && (
              <div>
                <span className="mf-label">Food items</span>
                {foodItems.map((item, idx) => (
                  <div key={idx} className="mf-row">
                    <input className="mf-input" placeholder="Food name (e.g. Biryani)" value={item.name}
                      onChange={(e) => { const a = [...foodItems]; a[idx] = { ...a[idx], name: e.target.value }; setFoodItems(a); }} />
                    <input className="mf-input" placeholder="Qty" value={item.quantity} style={{ width: 70 }}
                      onChange={(e) => { const a = [...foodItems]; a[idx] = { ...a[idx], quantity: e.target.value }; setFoodItems(a); }} />
                    <select className="mf-input mf-select" value={item.unit}
                      onChange={(e) => { const a = [...foodItems]; a[idx] = { ...a[idx], unit: e.target.value }; setFoodItems(a); }}>
                      {UNITS.map((u) => <option key={u}>{u}</option>)}
                    </select>
                    {foodItems.length > 1 && (
                      <button className="mf-remove-btn" onClick={() => setFoodItems(foodItems.filter((_, i) => i !== idx))}><X size={14} /></button>
                    )}
                  </div>
                ))}
                <button className="mf-add-btn" onClick={() => setFoodItems([...foodItems, { name: "", quantity: "", unit: "kg" }])}>
                  <Plus size={13} /> Add another item
                </button>

                <span className="mf-label">Food type</span>
                <div className="mf-food-type-row">
                  {(["cooked", "packaged", "raw"] as const).map((t) => (
                    <button key={t} type="button" className={`mf-type-btn ${foodType === t ? "active" : ""}`} onClick={() => setFoodType(t)}>
                      <div className="mf-type-icon">{t === "cooked" ? "🍳" : t === "packaged" ? "📦" : "🥦"}</div>
                      <div className="mf-type-lbl">{t.charAt(0).toUpperCase() + t.slice(1)}</div>
                    </button>
                  ))}
                </div>

                <div>
                  <span className="mf-label">Total quantity</span>
                  <input className="mf-input" placeholder="e.g. 10 kg or 40 servings" value={totalQuantity} onChange={(e) => setTotalQuantity(e.target.value)} />
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <span className="mf-label">Pickup deadline</span>
                <input className="mf-input" type="datetime-local" value={expiresAt} style={{ marginBottom: "1.25rem" }}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={(e) => setExpiresAt(e.target.value)} />

                <span className="mf-label">Pickup address</span>
                <input className="mf-input" placeholder="Full address" value={address} style={{ marginBottom: "1.25rem" }}
                  onChange={(e) => setAddress(e.target.value)} />

                <div style={{ marginBottom: "1.25rem" }}>
                  <button type="button" className="mf-loc-btn" style={{ width: "100%", justifyContent: "center" }} onClick={() => void detectLoc()}>
                    {locLoading ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <MapPin size={13} />}
                    {locLoading ? "Detecting location…" : lat && lng ? "✓ Location set — tap to use current GPS" : "Detect my location"}
                  </button>
                </div>

                <span className="mf-label">Photos (optional)</span>
                <div className="mf-img-row">
                  {images.map((url, i) => <Image key={url + i} src={url} alt={`Uploaded food image ${i + 1}`} className="mf-img-thumb" width={72} height={72} unoptimized />)}
                  <label className="mf-img-add">
                    {uploading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : <Upload size={18} />}
                    {uploading ? "Uploading" : "Add photo"}
                    <input type="file" accept="image/*" style={{ display: "none" }}
                      onChange={(e) => { if (e.target.files?.[0]) void uploadImage(e.target.files[0]); }} />
                  </label>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <div style={{ background: "white", borderRadius: 16, padding: "1rem 1.25rem", border: "1px solid rgba(44,40,32,0.08)", marginBottom: "1rem" }}>
                  {[
                    { label: "Food items", value: foodItems.map((f) => `${f.name} (${f.quantity} ${f.unit})`).join(", ") },
                    { label: "Food type", value: foodType.charAt(0).toUpperCase() + foodType.slice(1) },
                    { label: "Total quantity", value: totalQuantity },
                    { label: "Pickup by", value: expiresAt ? new Date(expiresAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—" },
                    { label: "Location", value: address || (lat && lng ? `${lat}, ${lng}` : "Not set") },
                    { label: "Photos", value: images.length ? `${images.length} uploaded` : "None" },
                  ].map((r) => (
                    <div key={r.label} className="mf-review-row">
                      <span className="mf-review-label">{r.label}</span>
                      <span className="mf-review-value">{r.value}</span>
                    </div>
                  ))}
                </div>
                {error && <div className="mf-error">⚠ {error}</div>}
              </div>
            )}
          </div>

          <div className="modal-footer">
            {step > 1 && <button className="btn-back" onClick={() => setStep((s) => s - 1)}>← Back</button>}
            {step < 3 && (
              <button className="btn-next" disabled={step === 1 ? !canNext1 : !canNext2} onClick={() => setStep((s) => s + 1)}>
                Continue <ChevronRight size={14} />
              </button>
            )}
            {step === 3 && (
              <button className="btn-next" disabled={submitting} onClick={() => void handleSubmit()}>
                {submitting ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Posting...</> : <>🚀 Post Listing</>}
              </button>
            )}
          </div>
        </div>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </>
  );
}
