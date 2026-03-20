"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  MapPin, RefreshCw, Loader2, Clock, Map, LayoutGrid, Filter,
} from "lucide-react";
import ListingsMap from "@/components/maps/ListingsMap";

type FoodItem = { name: string; quantity: string; unit: string };
type Listing = {
  _id: string;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  images: string[];
  location: { lat: number; lng: number; address: string };
  status: string;
  distanceKm?: number;
  createdAt: string;
};

type SessionUser = {
  id: string;
  name?: string | null;
  location?: { lat: number; lng: number };
};

type FoodFilter = "all" | "cooked" | "packaged" | "raw";
type SortMode = "newest" | "expiring" | "nearest";

const FOOD_META: Record<FoodFilter, { label: string; color: string; bg: string }> = {
  all: { label: "All Types", color: "#2c2820", bg: "#f3f0ea" },
  cooked: { label: "Cooked", color: "#c8601a", bg: "#fff7ed" },
  packaged: { label: "Packaged", color: "#1e40af", bg: "#dbeafe" },
  raw: { label: "Raw", color: "#1a5c38", bg: "#e8f5ee" },
};

function countdown(iso: string) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { text: "Expired", urgent: true };
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h < 3) return { text: `${h}h ${m}m left`, urgent: true };
  return { text: `${h}h ${m}m left`, urgent: false };
}

export default function NgoBrowseClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [claimMsg, setClaimMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [foodFilter, setFoodFilter] = useState<FoodFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [viewMode, setViewMode] = useState<"card" | "map">("card");
  const [showNoNearby, setShowNoNearby] = useState(false);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    setShowNoNearby(false);
    try {
      const loc = sessionUser.location;
      let url = "/api/listings?";
      if (loc) url += `lat=${loc.lat}&lng=${loc.lng}&radiusKm=50`;

      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { listings?: Listing[] };
      const nearby = data.listings ?? [];

      if (nearby.length === 0 && loc) {
        setShowNoNearby(true);
        const all = await fetch("/api/listings", { cache: "no-store" });
        const allData = (await all.json()) as { listings?: Listing[] };
        setListings(allData.listings ?? []);
      } else {
        setListings(nearby);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionUser.location]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  async function claimListing(id: string) {
    setClaiming(id);
    setClaimMsg(null);
    try {
      const res = await fetch(`/api/listings/${id}/claim`, { method: "POST" });
      const data = (await res.json()) as { listing?: unknown; warning?: string; error?: string; code?: string };

      if (!res.ok) {
        setClaimMsg({ text: data.error ?? "Failed to claim listing.", ok: false });
        return;
      }

      if (data.warning) {
        // Soft failure: listing was NOT claimed (no volunteers available etc.)
        setClaimMsg({ text: data.warning, ok: false });
        return;
      }

      // Success: listing claimed (and volunteer assigned)
      setListings((prev) => prev.filter((l) => l._id !== id));
      setClaimMsg({ text: "Listing claimed! A volunteer has been assigned.", ok: true });
      window.setTimeout(() => setClaimMsg(null), 4000);
    } catch {
      setClaimMsg({ text: "Network error. Please try again.", ok: false });
    } finally {
      setClaiming(null);
    }
  }

  const filtered = useMemo(() => {
    let list = foodFilter === "all" ? listings : listings.filter((l) => l.foodType === foodFilter);
    if (sortMode === "nearest" && sessionUser.location) {
      list = [...list].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    } else if (sortMode === "expiring") {
      list = [...list].sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    }
    return list;
  }, [listings, foodFilter, sortMode, sessionUser.location]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .nb { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .nb-inner { max-width:1100px; margin:0 auto; }
        .nb-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .nb-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .nb-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .nb-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .nb-actions { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
        .nb-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .nb-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .nb-view-toggle { display:flex; background:white; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); overflow:hidden; }
        .nb-view-btn { padding:0.55rem 0.875rem; border:none; background:transparent; cursor:pointer; display:flex; align-items:center; gap:5px; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; color:#6b6560; transition:all 0.15s; }
        .nb-view-btn.active { background:#1e40af; color:white; }

        .nb-toolbar { display:flex; align-items:center; gap:0.75rem; margin-bottom:1.5rem; flex-wrap:wrap; }
        .nb-filter-group { display:flex; gap:0.4rem; flex-wrap:wrap; }
        .nb-filter-btn { padding:5px 13px; border-radius:100px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .nb-filter-btn.active { background:#1e40af; border-color:#1e40af; color:white; }
        .nb-sort-select { padding:5px 12px; border-radius:10px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; color:#6b6560; cursor:pointer; outline:none; }

        .nb-banner { background:#eff6ff; border:1px solid rgba(29,78,216,0.15); border-radius:14px; padding:0.875rem 1.25rem; font-size:0.82rem; color:#1e40af; margin-bottom:1.5rem; display:flex; align-items:center; gap:8px; }

        .nb-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:1.25rem; }
        .nb-card { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); transition:all 0.22s; }
        .nb-card:hover { transform:translateY(-3px); box-shadow:0 10px 32px rgba(44,40,32,0.10); }
        .nb-card-img { width:100%; height:130px; object-fit:cover; display:block; }
        .nb-card-img-ph { width:100%; height:130px; background:linear-gradient(135deg,#dbeafe,#bfdbfe); display:flex; align-items:center; justify-content:center; font-size:2.5rem; }
        .nb-card-body { padding:1rem 1.2rem; }
        .nb-card-title { font-family:'Fraunces',serif; font-size:0.95rem; font-weight:700; color:#2c2820; letter-spacing:-0.01em; margin-bottom:0.5rem; }
        .nb-food-tag { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:8px; font-size:0.68rem; font-weight:600; margin-bottom:0.75rem; }
        .nb-meta { font-size:0.75rem; color:#6b6560; display:flex; flex-direction:column; gap:4px; margin-bottom:0.75rem; }
        .nb-meta-row { display:flex; align-items:center; gap:5px; }
        .nb-expiry { font-size:0.72rem; font-weight:700; padding:4px 8px; border-radius:8px; }
        .nb-expiry.urgent { background:#fef2f2; color:#dc2626; }
        .nb-expiry.ok { background:#f0fdf4; color:#1a5c38; }
        .nb-claim-btn { width:100%; padding:10px; border-radius:12px; border:none; background:#1e40af; color:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; cursor:pointer; transition:all 0.18s; display:flex; align-items:center; justify-content:center; gap:6px; margin-top:0.75rem; }
        .nb-claim-btn:hover:not(:disabled) { background:#1d4ed8; }
        .nb-claim-btn:disabled { opacity:0.6; cursor:not-allowed; }

        .nb-empty { text-align:center; padding:4rem 2rem; background:white; border-radius:20px; border:1.5px dashed rgba(44,40,32,0.12); }
        .nb-empty-icon { font-size:2.5rem; margin-bottom:0.75rem; opacity:0.4; }
        .nb-empty-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:700; color:#2c2820; margin-bottom:0.5rem; }
        .nb-empty-sub { font-size:0.85rem; color:#a09a94; font-weight:300; }

        .nb-map-wrap { height:75vh; border-radius:20px; overflow:hidden; border:1px solid rgba(44,40,32,0.08); }

        .nb-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:20px; height:260px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @media(max-width:900px) { .nb{padding:1.5rem 1rem 6rem} }
        @media(max-width:540px) { .nb-grid{grid-template-columns:1fr} }
      `}</style>

      <div className="nb">
        <div className="nb-inner">
          <Link href="/dashboard/ngo" className="nb-back">← Dashboard</Link>

          {claimMsg && (
            <div style={{
              padding: "0.875rem 1.25rem", borderRadius: 14, marginBottom: "1rem",
              fontSize: "0.875rem", fontWeight: 600,
              background: claimMsg.ok ? "#f0fdf4" : "#fef2f2",
              color: claimMsg.ok ? "#1a5c38" : "#dc2626",
              border: `1px solid ${claimMsg.ok ? "rgba(26,92,56,0.2)" : "rgba(220,38,38,0.2)"}`,
            }}>
              {claimMsg.ok ? "✓ " : "⚠ "}{claimMsg.text}
            </div>
          )}

          <div className="nb-header">
            <div>
              <div className="nb-title">Browse Available Food</div>
              <div className="nb-sub">
                {listings.length > 0 ? `${filtered.length} listing${filtered.length !== 1 ? "s" : ""} available` : "Searching for food near you..."}
              </div>
            </div>
            <div className="nb-actions">
              <button className="nb-refresh-btn" onClick={() => void fetchListings()} disabled={loading}>
                <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
              </button>
              <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              <div className="nb-view-toggle">
                <button className={`nb-view-btn ${viewMode === "card" ? "active" : ""}`} onClick={() => setViewMode("card")}>
                  <LayoutGrid size={14} /> Cards
                </button>
                <button className={`nb-view-btn ${viewMode === "map" ? "active" : ""}`} onClick={() => setViewMode("map")}>
                  <Map size={14} /> Map
                </button>
              </div>
            </div>
          </div>

          {!sessionUser.location && (
            <div className="nb-banner">
              <MapPin size={14} /> Set your location in <Link href="/dashboard/ngo/profile" style={{ fontWeight: 700, color: "#1e40af" }}>Profile</Link> to see nearby listings and distances.
            </div>
          )}

          {showNoNearby && (
            <div className="nb-banner">
              <MapPin size={14} /> No listings found within 50km. Showing all available listings.
            </div>
          )}

          <div className="nb-toolbar">
            <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "#a09a94" }}>
              <Filter size={12} /> Type
            </span>
            <div className="nb-filter-group">
              {(["all", "cooked", "packaged", "raw"] as FoodFilter[]).map((f) => (
                <button key={f} className={`nb-filter-btn ${foodFilter === f ? "active" : ""}`} onClick={() => setFoodFilter(f)}>
                  {FOOD_META[f].label}
                </button>
              ))}
            </div>
            <select className="nb-sort-select" value={sortMode} onChange={(e) => setSortMode(e.target.value as SortMode)}>
              <option value="newest">Newest first</option>
              <option value="expiring">Expiring soon</option>
              {sessionUser.location && <option value="nearest">Nearest first</option>}
            </select>
          </div>

          {loading ? (
            <div className="nb-grid">
              {[1, 2, 3, 4, 5, 6].map((i) => <div key={i} className="nb-skeleton" />)}
            </div>
          ) : viewMode === "map" ? (
            <div className="nb-map-wrap">
              <ListingsMap
                listings={filtered.map((l) => ({ ...l, status: l.status as "available" | "claimed" | "picked_up" | "delivered" | "expired" }))}
                userLocation={sessionUser.location}
                onListingClick={(listing) => void claimListing(listing._id)}
              />
            </div>
          ) : filtered.length === 0 ? (
            <div className="nb-empty">
              <div className="nb-empty-icon">🥗</div>
              <div className="nb-empty-title">No food available right now</div>
              <div className="nb-empty-sub">Check back soon — donors post listings throughout the day.</div>
            </div>
          ) : (
            <div className="nb-grid">
              {filtered.map((listing) => {
                const fm = FOOD_META[listing.foodType];
                const exp = countdown(listing.expiresAt);
                return (
                  <div key={listing._id} className="nb-card">
                    {listing.images?.[0]
                      ? <Image src={listing.images[0]} alt="" className="nb-card-img" width={400} height={130} unoptimized />
                      : <div className="nb-card-img-ph">🥗</div>
                    }
                    <div className="nb-card-body">
                      <div className="nb-card-title">{listing.foodItems.map((f) => f.name).join(", ")}</div>
                      <span className="nb-food-tag" style={{ background: fm.bg, color: fm.color }}>{fm.label}</span>
                      <div className="nb-meta">
                        <div className="nb-meta-row"><MapPin size={12} style={{ color: "#a09a94", flexShrink: 0 }} /><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{listing.location.address}</span></div>
                        <div className="nb-meta-row" style={{ justifyContent: "space-between" }}>
                          <span>From: <strong>{listing.donorName}</strong></span>
                          {listing.distanceKm !== undefined && <span style={{ color: "#1e40af", fontWeight: 600 }}>{listing.distanceKm.toFixed(1)} km</span>}
                        </div>
                        <div className="nb-meta-row"><span>{listing.totalQuantity}</span></div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span className={`nb-expiry ${exp.urgent ? "urgent" : "ok"}`}>
                          <Clock size={11} style={{ display: "inline", marginRight: 3 }} />{exp.text}
                        </span>
                      </div>
                      <button
                        className="nb-claim-btn"
                        disabled={claiming === listing._id}
                        onClick={() => void claimListing(listing._id)}
                      >
                        {claiming === listing._id ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Claiming...</> : "Claim This Food"}
                      </button>
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
