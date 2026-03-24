"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Sparkles, MapPin, RefreshCw, LogOut, Plus, X, Loader2 } from "lucide-react";

import ClaimQuantityModal from "@/components/dashboard/ClaimQuantityModal";
import ListingsMap from "@/components/maps/ListingsMap";
import { useSocket } from "@/hooks/useSocket";

type FoodTypeFilter = "all" | "cooked" | "packaged" | "raw";
type SortMode = "newest" | "expiring" | "nearest";
type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";
type DemandUrgency = "low" | "medium" | "high";
type DemandStatus = "open" | "accepted" | "fulfilled" | "expired";

type FoodDemand = {
  _id: string;
  ngoId: string;
  ngoName: string;
  mealsRequired: number;
  foodType?: string;
  urgency: DemandUrgency;
  status: DemandStatus;
  acceptedByName?: string;
  acceptedAt?: string;
  deliveryId?: string;
  deliveryStatus?: string;
  location: { lat: number; lng: number; address: string };
  createdAt: string;
};

type DonorContact = {
  _id: string;
  name: string;
  phone: string;
  address: string;
};

type VolunteerContact = {
  _id: string;
  name: string;
  phone: string;
};

type FoodItem = {
  name: string;
  quantity: string;
  unit: string;
};

type Listing = {
  _id: string;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  donorId?: DonorContact;
  foodItems: FoodItem[];
  remainingItems?: FoodItem[];
  partialClaims?: { ngoName: string; claimedItems: FoodItem[] }[];
  myClaimedItems?: FoodItem[];
  totalQuantity: string;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  images: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: ListingStatus;
  claimedBy?: string;
  claimedAt?: string;
  assignedVolunteer?: VolunteerContact;
  distanceKm?: number;
  createdAt: string;
};

type SessionUser = {
  id: string;
  name?: string | null;
  location?: {
    lat: number;
    lng: number;
  };
};

const statusMeta: Record<ListingStatus, { label: string; color: string; bg: string; dot: string }> = {
  available: { label: "Available", color: "#1a5c38", bg: "#e8f5ee", dot: "#22c55e" },
  claimed: { label: "Claimed", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  picked_up: { label: "Picked Up", color: "#1e40af", bg: "#dbeafe", dot: "#3b82f6" },
  delivered: { label: "Delivered", color: "#5b21b6", bg: "#ede9fe", dot: "#8b5cf6" },
  expired: { label: "Expired", color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
};

const foodMeta: Record<FoodTypeFilter, { label: string; color: string; bg: string }> = {
  all: { label: "All", color: "#2c2820", bg: "#f3f0ea" },
  cooked: { label: "Cooked", color: "#c8601a", bg: "#fff7ed" },
  packaged: { label: "Packaged", color: "#1e40af", bg: "#dbeafe" },
  raw: { label: "Raw", color: "#1a5c38", bg: "#e8f5ee" },
};

function getCountdownLabel(expiresAt: string, now: number) {
  const diffMs = new Date(expiresAt).getTime() - now;

  if (diffMs <= 0) {
    return "Expired";
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours <= 0) {
    return `Expires in ${minutes}m`;
  }

  return `Expires in ${hours}h ${minutes}m`;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function NgoDashboardClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [activeTab, setActiveTab] = useState<"available" | "claims" | "demands">("available");
  const [availableView, setAvailableView] = useState<"card" | "map">("card");
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [claimedListings, setClaimedListings] = useState<Listing[]>([]);
  const [myDemands, setMyDemands] = useState<FoodDemand[]>([]);
  const [demandsLoading, setDemandsLoading] = useState(false);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [deliveryOtp, setDeliveryOtp] = useState<{ deliveryId: string; code: string | null; loading: boolean } | null>(null);
  const [filterFoodType, setFilterFoodType] = useState<FoodTypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>(sessionUser.location ? "nearest" : "newest");
  const [isLoading, setIsLoading] = useState(true);
  const [claimModalListing, setClaimModalListing] = useState<Listing | null>(null);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [selectedMapListing, setSelectedMapListing] = useState<Listing | null>(null);

  const { socketRef } = useSocket();
  const ngoDisplayName = sessionUser.name?.trim() || "NGO";

  const ngoLocation = sessionUser.location;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const loadListings = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setBannerMessage(null);

    try {
      const nearbyUrl =
        ngoLocation
          ? `/api/listings?lat=${ngoLocation.lat}&lng=${ngoLocation.lng}&radiusKm=50`
          : "/api/listings";

      const [availableRes, claimedRes] = await Promise.all([
        fetch(nearbyUrl, { cache: "no-store" }),
        fetch("/api/listings/claimed", { cache: "no-store" }),
      ]);

      const availableData = (await availableRes.json()) as { listings?: Listing[]; error?: string };
      const claimedData = (await claimedRes.json()) as { listings?: Listing[]; error?: string };

      if (!availableRes.ok) {
        throw new Error(availableData.error || "Unable to load available listings.");
      }

      if (!claimedRes.ok) {
        throw new Error(claimedData.error || "Unable to load claimed listings.");
      }

      let visibleListings = availableData.listings ?? [];

      if (ngoLocation && visibleListings.length === 0) {
        const fallbackRes = await fetch("/api/listings", { cache: "no-store" });
        const fallbackData = (await fallbackRes.json()) as { listings?: Listing[]; error?: string };

        if (fallbackRes.ok) {
          visibleListings = fallbackData.listings ?? [];
          if (visibleListings.length > 0) {
            setBannerMessage("No nearby listings in 50 km. Showing all available listings.");
          }
        }
      }

      setAvailableListings(visibleListings);
      setClaimedListings(claimedData.listings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load listings.");
    } finally {
      setIsLoading(false);
    }
  }, [ngoLocation]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  const loadDemands = useCallback(async () => {
    setDemandsLoading(true);
    try {
      const res = await fetch("/api/demands?mine=true", { cache: "no-store" });
      const data = (await res.json()) as { demands?: FoodDemand[] };
      setMyDemands(data.demands ?? []);
    } finally {
      setDemandsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "demands") {
      void loadDemands();
    }
  }, [activeTab, loadDemands]);

  // Real-time: update demand card when a donor accepts or delivery status changes
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;

    const onDemandAccepted = (data: { demandId: string; donorName: string; acceptedAt?: string }) => {
      setMyDemands((prev) =>
        prev.map((d) =>
          d._id === data.demandId
            ? { ...d, status: "accepted" as const, acceptedByName: data.donorName, acceptedAt: data.acceptedAt }
            : d,
        ),
      );
    };

    const onDeliveryStatus = (data: { deliveryId: string; status: string; isDemand?: boolean }) => {
      if (!data.isDemand) return;
      setMyDemands((prev) =>
        prev.map((d) =>
          d.deliveryId === data.deliveryId
            ? { ...d, deliveryStatus: data.status, status: data.status === "delivered" ? ("fulfilled" as const) : d.status }
            : d,
        ),
      );
    };

    const onListingUpdated = (data: { listingId: string; foodItems: FoodItem[]; partialClaims?: { ngoName: string; claimedItems: FoodItem[] }[] }) => {
      setAvailableListings((prev) =>
        prev.map((l) =>
          l._id === data.listingId
            ? { ...l, foodItems: data.foodItems, partialClaims: data.partialClaims }
            : l,
        ),
      );
    };

    socket.on("demand_accepted", onDemandAccepted);
    socket.on("demand_delivery_status", onDeliveryStatus);
    socket.on("listing_updated", onListingUpdated);
    return () => {
      socket.off("demand_accepted", onDemandAccepted);
      socket.off("demand_delivery_status", onDeliveryStatus);
      socket.off("listing_updated", onListingUpdated);
    };
  }, [socketRef]);

  async function handleViewDeliveryOtp(deliveryId: string) {
    setDeliveryOtp({ deliveryId, code: null, loading: true });
    try {
      const res = await fetch(`/api/otp/view?listingId=${deliveryId}&type=delivery`);
      const data = (await res.json()) as { code?: string; error?: string };
      setDeliveryOtp({ deliveryId, code: data.code ?? null, loading: false });
    } catch {
      setDeliveryOtp({ deliveryId, code: null, loading: false });
    }
  }

  const filteredAvailableListings = useMemo(() => {
    const base = [...availableListings].filter((listing) => (filterFoodType === "all" ? true : listing.foodType === filterFoodType));

    if (sortMode === "expiring") {
      return base.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    }

    if (sortMode === "nearest") {
      return base.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    }

    return base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [availableListings, filterFoodType, sortMode]);

  const dashboardStats = useMemo(
    () => ({
      available: availableListings.filter((item) => item.status === "available").length,
      claimed: claimedListings.length,
      expiringSoon: availableListings.filter((item) => {
        const diff = new Date(item.expiresAt).getTime() - now;
        return diff > 0 && diff <= 3 * 60 * 60 * 1000;
      }).length,
    }),
    [availableListings, claimedListings.length, now],
  );

  function handleClaimSuccess(claimedListing: Listing) {
    const listingId = claimedListing._id;
    const isPartial = claimedListing.status === "available";

    if (isPartial) {
      // Partial claim: listing stays available — update quantities in place
      setAvailableListings((current) =>
        current.map((item) =>
          item._id === listingId
            ? { ...item, foodItems: claimedListing.foodItems, partialClaims: claimedListing.partialClaims }
            : item,
        ),
      );
      // Also surface it in My Claims so the NGO can track their reservation
      setClaimedListings((current) => {
        if (current.some((item) => item._id === listingId)) return current;
        return [{ ...claimedListing, myClaimedItems: claimedListing.myClaimedItems }, ...current];
      });
      setBannerMessage("Your portion has been reserved. The listing remains open for other NGOs.");
    } else {
      // Full claim: remove from available, add to claimed
      setAvailableListings((current) =>
        current.map((item) => (item._id === listingId ? { ...item, status: "claimed" } : item)),
      );
      setClaimedListings((current) => [claimedListing, ...current]);
      setBannerMessage("Listing claimed successfully.");
      window.setTimeout(() => {
        setAvailableListings((current) => current.filter((item) => item._id !== listingId));
      }, 700);
    }
    setClaimModalListing(null);
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,700;0,9..144,900;1,9..144,300&family=DM+Sans:wght@300;400;500;600&display=swap');
        .nd { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .nd-inner { max-width:1120px; margin:0 auto; }

        .nd-head { display:flex; align-items:flex-end; justify-content:space-between; gap:1rem; flex-wrap:wrap; margin-bottom:1.5rem; }
        .nd-title { font-family:'Fraunces',serif; font-size:clamp(1.7rem,3vw,2.25rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; line-height:1.1; }
        .nd-title span { color:#1e40af; font-style:italic; }
        .nd-sub { margin-top:6px; font-size:0.86rem; color:#6b6560; font-weight:300; }
        .nd-out { border:none; border-radius:14px; background:#1e40af; color:#fff; font-size:0.9rem; font-weight:600; padding:0.75rem 1.2rem; cursor:pointer; display:inline-flex; align-items:center; gap:8px; box-shadow:0 4px 14px rgba(30,64,175,0.30); }
        .nd-out:hover { background:#1d4ed8; }

        .nd-stats { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; margin-bottom:1.5rem; }
        .nd-stat { background:#fff; border-radius:18px; border:1px solid rgba(44,40,32,0.08); padding:1.2rem 1.4rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .nd-stat-lbl { font-size:0.72rem; color:#8a837d; text-transform:uppercase; letter-spacing:0.08em; font-weight:700; }
        .nd-stat-val { font-family:'Fraunces',serif; font-size:2rem; color:#2c2820; letter-spacing:-0.03em; margin-top:6px; line-height:1; }

        .nd-banner { background:linear-gradient(135deg,#1e40af,#1d4ed8); border-radius:20px; padding:1.25rem 1.4rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:0.8rem; margin-bottom:1.5rem; }
        .nd-banner-t { font-family:'Fraunces',serif; color:#fff; font-size:1rem; font-weight:700; }
        .nd-banner-s { color:rgba(255,255,255,0.75); font-size:0.78rem; }
        .nd-banner-btn { display:inline-flex; align-items:center; gap:5px; color:#fff; background:rgba(255,255,255,0.15); border:1px solid rgba(255,255,255,0.25); border-radius:10px; padding:0.55rem 0.9rem; text-decoration:none; font-size:0.8rem; font-weight:600; }

        .nd-alert { margin-bottom:1rem; border-radius:12px; padding:10px 14px; font-size:0.83rem; }
        .nd-alert.warn { background:#fef9c3; color:#854d0e; border:1px solid #fde68a; }
        .nd-alert.err { background:#fee2e2; color:#991b1b; border:1px solid #fecaca; }
        .nd-alert.ok { background:#dcfce7; color:#166534; border:1px solid #bbf7d0; }

        .nd-tabs { display:flex; flex-wrap:wrap; gap:0.6rem; margin-bottom:1rem; }
        .nd-tab { border:1px solid rgba(44,40,32,0.12); background:#fff; color:#6b6560; border-radius:999px; padding:0.5rem 1rem; font-size:0.82rem; font-weight:700; cursor:pointer; }
        .nd-tab.active { background:#1e40af; color:#fff; border-color:#1e40af; }

        .nd-filter { display:grid; gap:0.9rem; grid-template-columns:repeat(3,minmax(0,1fr)); background:#fff; border:1px solid rgba(44,40,32,0.08); border-radius:18px; padding:1rem; margin-bottom:1.1rem; }
        .nd-label { font-size:0.72rem; letter-spacing:0.08em; text-transform:uppercase; color:#8a837d; font-weight:700; margin-bottom:0.45rem; display:block; }
        .nd-select { width:100%; height:44px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:#faf8f4; padding:0 0.75rem; font-size:0.86rem; color:#2c2820; }
        .nd-view-toggle { display:flex; gap:0.45rem; align-items:flex-end; }

        .nd-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:1rem; }
        .nd-card { background:#fff; border:1px solid rgba(44,40,32,0.08); border-radius:20px; overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .nd-img { width:100%; height:160px; object-fit:cover; }
        .nd-img-ph { width:100%; height:160px; background:linear-gradient(135deg,#dbeafe,#bfdbfe); display:flex; align-items:center; justify-content:center; font-size:2.4rem; }
        .nd-body { padding:1rem 1.1rem; }
        .nd-top { display:flex; justify-content:space-between; align-items:flex-start; gap:0.6rem; margin-bottom:0.7rem; }
        .nd-h { font-family:'Fraunces',serif; color:#2c2820; font-size:1rem; font-weight:700; }
        .nd-m { color:#6b6560; font-size:0.78rem; margin-top:4px; }
        .nd-badge { display:inline-flex; align-items:center; gap:5px; padding:3px 8px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .nd-dot { width:6px; height:6px; border-radius:50%; }
        .nd-tags { display:flex; flex-wrap:wrap; gap:5px; margin-bottom:0.7rem; }
        .nd-tag { border-radius:8px; padding:3px 8px; font-size:0.68rem; font-weight:600; display:inline-flex; align-items:center; gap:4px; }
        .nd-items { color:#6b6560; font-size:0.78rem; line-height:1.5; margin-bottom:0.7rem; }
        .nd-meta { border-radius:12px; background:#f6f4f0; padding:9px 10px; font-size:0.74rem; color:#6b6560; margin-bottom:0.75rem; }
        .nd-claim { width:100%; border:none; border-radius:12px; padding:0.62rem 0.9rem; background:#1e40af; color:#fff; font-size:0.82rem; font-weight:700; cursor:pointer; }
        .nd-claim:disabled { opacity:0.55; cursor:not-allowed; }

        .nd-map { display:grid; gap:1rem; grid-template-columns:1.2fr 0.8fr; }
        .nd-pane { background:#fff; border:1px solid rgba(44,40,32,0.08); border-radius:20px; padding:1rem; }
        .nd-empty { background:#fff; border:1.5px dashed rgba(44,40,32,0.12); border-radius:20px; padding:3rem 1.5rem; text-align:center; color:#8a837d; font-size:0.86rem; }

        .nd-demand-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
        .nd-demand-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1.1rem; background:#1e40af; color:#fff; border:none; border-radius:12px; font-size:0.82rem; font-weight:700; cursor:pointer; }
        .nd-demand-btn:hover { background:#1d4ed8; }
        .nd-demand-card { background:#fff; border:1px solid rgba(44,40,32,0.08); border-radius:18px; padding:1.1rem 1.25rem; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .nd-demand-top { display:flex; align-items:flex-start; justify-content:space-between; gap:0.6rem; margin-bottom:0.6rem; }
        .nd-demand-meals { font-family:'Fraunces',serif; font-size:1.6rem; font-weight:900; color:#2c2820; line-height:1; }
        .nd-demand-meals-lbl { font-size:0.7rem; color:#8a837d; text-transform:uppercase; letter-spacing:0.06em; font-weight:700; margin-top:2px; }
        .nd-urgency { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:100px; font-size:0.7rem; font-weight:700; }
        .nd-urgency.high { background:#fee2e2; color:#991b1b; }
        .nd-urgency.medium { background:#fef3c7; color:#92400e; }
        .nd-urgency.low { background:#dcfce7; color:#166534; }
        .nd-demand-status { display:inline-flex; align-items:center; gap:4px; padding:3px 8px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .nd-demand-status.open { background:#dbeafe; color:#1e40af; }
        .nd-demand-status.accepted { background:#dcfce7; color:#166534; }
        .nd-demand-status.fulfilled { background:#ede9fe; color:#5b21b6; }
        .nd-demand-status.expired { background:#fee2e2; color:#991b1b; }
        .nd-demand-donor-chip { display:flex; align-items:center; gap:6px; margin-top:0.6rem; padding:7px 10px; background:#f0fdf4; border:1px solid rgba(22,101,52,0.15); border-radius:10px; font-size:0.75rem; color:#166534; font-weight:600; }
        .nd-demand-meta { font-size:0.76rem; color:#6b6560; margin-top:0.5rem; display:flex; flex-direction:column; gap:3px; }

        @media (max-width:1024px) {
          .nd { padding:1.5rem 1rem 5.5rem; }
          .nd-stats { grid-template-columns:repeat(2,1fr); }
          .nd-filter { grid-template-columns:1fr; }
          .nd-map { grid-template-columns:1fr; }
        }
      `}</style>

      <div className="nd">
        <div className="nd-inner">
          <div className="nd-head">
            <div>
              <div className="nd-title">Good work,<br /><span>{ngoDisplayName}.</span></div>
              <div className="nd-sub">Browse nearby surplus food, claim quickly, and coordinate pickups with volunteers.</div>
            </div>
            <button type="button" onClick={() => signOut({ callbackUrl: "/login" })} className="nd-out">
              <LogOut size={15} /> Logout
            </button>
          </div>

          <div className="nd-stats">
            <div className="nd-stat">
              <div className="nd-stat-lbl">Available Now</div>
              <div className="nd-stat-val">{dashboardStats.available}</div>
            </div>
            <div className="nd-stat">
              <div className="nd-stat-lbl">My Claims</div>
              <div className="nd-stat-val">{dashboardStats.claimed}</div>
            </div>
            <div className="nd-stat">
              <div className="nd-stat-lbl">Expiring in 3h</div>
              <div className="nd-stat-val">{dashboardStats.expiringSoon}</div>
            </div>
          </div>

          <div className="nd-banner">
            <div>
              <div className="nd-banner-t">Prediction Spotlight</div>
              <div className="nd-banner-s">Use surplus forecasts to pre-plan distribution routes for your team.</div>
            </div>
            <Link href="/dashboard/ngo/predictions" className="nd-banner-btn">
              <Sparkles size={12} /> View Forecast
            </Link>
          </div>

          {!ngoLocation ? (
            <div className="nd-alert warn">
              Please update your profile location to see donor distance and smarter sorting.
              <Link href="/dashboard/ngo/profile" style={{ marginLeft: 8, fontWeight: 700, textDecoration: "underline" }}>
                Update profile
              </Link>
            </div>
          ) : null}

          {error ? <div className="nd-alert err">{error}</div> : null}
          {!error && bannerMessage ? <div className="nd-alert ok">{bannerMessage}</div> : null}

          <div className="nd-tabs">
            <button type="button" onClick={() => setActiveTab("available")} className={`nd-tab ${activeTab === "available" ? "active" : ""}`}>
              Available Listings
            </button>
            <button type="button" onClick={() => setActiveTab("claims")} className={`nd-tab ${activeTab === "claims" ? "active" : ""}`}>
              My Claims
            </button>
            <button type="button" onClick={() => setActiveTab("demands")} className={`nd-tab ${activeTab === "demands" ? "active" : ""}`}>
              My Demands
            </button>
            <button type="button" onClick={() => void loadListings()} className="nd-tab">
              <RefreshCw size={13} style={{ display: "inline", marginRight: 6 }} /> Refresh
            </button>
          </div>

          {activeTab === "demands" ? (
            <>
              <div className="nd-demand-header">
                <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1rem", fontWeight: 800, color: "#2c2820" }}>
                  Food Demands
                </div>
                <button type="button" className="nd-demand-btn" onClick={() => setShowDemandModal(true)}>
                  <Plus size={14} /> Post Demand
                </button>
              </div>

              {demandsLoading ? (
                <div className="nd-empty">Loading your demands...</div>
              ) : myDemands.length === 0 ? (
                <div className="nd-empty">
                  <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, color: "#2c2820", marginBottom: 6 }}>No demands posted yet</div>
                  <div style={{ fontSize: "0.82rem", color: "#8a837d" }}>Post a demand to notify nearby donors of how many meals you need.</div>
                </div>
              ) : (
                <div className="nd-grid">
                  {myDemands.map((demand) => (
                    <div key={demand._id} className="nd-demand-card">
                      <div className="nd-demand-top">
                        <div>
                          <div className="nd-demand-meals">{demand.mealsRequired}</div>
                          <div className="nd-demand-meals-lbl">Meals Required</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, alignItems: "flex-end" }}>
                          <span className={`nd-urgency ${demand.urgency}`}>
                            {demand.urgency === "high" ? "🔴" : demand.urgency === "medium" ? "🟡" : "🟢"} {demand.urgency.charAt(0).toUpperCase() + demand.urgency.slice(1)}
                          </span>
                          <span className={`nd-demand-status ${demand.status}`}>
                            {demand.status === "accepted" ? "✓ Accepted" : demand.status.charAt(0).toUpperCase() + demand.status.slice(1)}
                          </span>
                        </div>
                      </div>
                      <div className="nd-demand-meta">
                        {demand.foodType && <div>Food type: {demand.foodType}</div>}
                        <div><MapPin size={11} style={{ display: "inline", marginRight: 3 }} />{demand.location.address}</div>
                        <div>Posted {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(demand.createdAt))}</div>
                      </div>
                      {demand.status === "accepted" && demand.acceptedByName && (
                        <div className="nd-demand-donor-chip">
                          <span style={{ fontSize: "0.9rem" }}>✅</span>
                          Accepted by {demand.acceptedByName}
                          {demand.acceptedAt && (
                            <span style={{ fontWeight: 400, color: "#4ade80", marginLeft: 4 }}>
                              · {new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(demand.acceptedAt))}
                            </span>
                          )}
                        </div>
                      )}
                      {demand.deliveryId && demand.deliveryStatus === "picked_up" && (
                        <button
                          type="button"
                          onClick={() => void handleViewDeliveryOtp(demand.deliveryId!)}
                          style={{
                            marginTop: "0.65rem",
                            width: "100%",
                            border: "none",
                            borderRadius: 12,
                            padding: "0.62rem 0.9rem",
                            background: "#7c3aed",
                            color: "#fff",
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Show Delivery OTP to Volunteer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : activeTab === "available" ? (
            <>
              <div className="nd-filter">
                <label>
                  <span className="nd-label">Filter Food Type</span>
                  <select value={filterFoodType} onChange={(event) => setFilterFoodType(event.target.value as FoodTypeFilter)} className="nd-select">
                    <option value="all">All</option>
                    <option value="cooked">Cooked</option>
                    <option value="packaged">Packaged</option>
                    <option value="raw">Raw</option>
                  </select>
                </label>

                <label>
                  <span className="nd-label">Sort By</span>
                  <select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)} className="nd-select">
                    <option value="newest">Newest</option>
                    <option value="nearest">Nearest First</option>
                    <option value="expiring">Expiring Soon</option>
                  </select>
                </label>

                <div className="nd-view-toggle">
                  <button type="button" onClick={() => setAvailableView("card")} className={`nd-tab ${availableView === "card" ? "active" : ""}`}>Card View</button>
                  <button type="button" onClick={() => setAvailableView("map")} className={`nd-tab ${availableView === "map" ? "active" : ""}`}>Map View</button>
                </div>
              </div>

              {isLoading ? (
                <div className="nd-empty">Loading available listings...</div>
              ) : availableView === "map" ? (
                <div className="nd-map">
                  <ListingsMap
                    listings={filteredAvailableListings}
                    userLocation={ngoLocation}
                    onListingClick={(listing) => {
                      const selected = filteredAvailableListings.find((item) => item._id === listing._id) ?? null;
                      setSelectedMapListing(selected);
                    }}
                  />

                  <aside className="nd-pane">
                    {selectedMapListing ? (
                      <div>
                        <div className="nd-top" style={{ marginBottom: 10 }}>
                          <div>
                            <div className="nd-h">{selectedMapListing.donorName}</div>
                            <div className="nd-m"><MapPin size={12} style={{ display: "inline", marginRight: 4 }} /> {selectedMapListing.location.address}</div>
                          </div>
                          <span className="nd-badge" style={{ background: statusMeta[selectedMapListing.status].bg, color: statusMeta[selectedMapListing.status].color }}>
                            <span className="nd-dot" style={{ background: statusMeta[selectedMapListing.status].dot }} />
                            {statusMeta[selectedMapListing.status].label}
                          </span>
                        </div>
                        <div className="nd-items">
                          {selectedMapListing.foodItems.map((item, index) => (
                            <div key={`${selectedMapListing._id}-map-item-${index}`}>
                              {item.name}: {item.quantity} {item.unit}
                            </div>
                          ))}
                        </div>
                        <div className="nd-meta">Pickup deadline: {formatDateTime(selectedMapListing.expiresAt)}</div>
                        <button
                          type="button"
                          disabled={selectedMapListing.status !== "available"}
                          onClick={() => setClaimModalListing(selectedMapListing)}
                          className="nd-claim"
                        >
                          {selectedMapListing.status === "available" ? "Claim" : "Claimed"}
                        </button>
                      </div>
                    ) : (
                      <div className="nd-empty" style={{ padding: "2rem 1rem" }}>Select a listing marker to view details and claim.</div>
                    )}
                  </aside>
                </div>
              ) : filteredAvailableListings.length ? (
                <div className="nd-grid">
                  {filteredAvailableListings.map((listing) => {
                    const status = statusMeta[listing.status];
                    const food = foodMeta[listing.foodType];
                    const expiring = getCountdownLabel(listing.expiresAt, now);
                    return (
                      <article key={listing._id} className="nd-card">
                        {listing.images[0] ? (
                          <Image src={listing.images[0]} alt="Listing" width={640} height={320} className="nd-img" unoptimized />
                        ) : (
                          <div className="nd-img-ph">🥘</div>
                        )}
                        <div className="nd-body">
                          <div className="nd-top">
                            <div>
                              <div className="nd-h">{listing.donorName}</div>
                              <div className="nd-m">{listing.donorAddress}</div>
                            </div>
                            <span className="nd-badge" style={{ background: status.bg, color: status.color }}>
                              <span className="nd-dot" style={{ background: status.dot }} />
                              {status.label}
                            </span>
                          </div>

                          <div className="nd-tags">
                            <span className="nd-tag" style={{ background: food.bg, color: food.color }}>{food.label}</span>
                            <span className="nd-tag" style={{ background: "#f3f0ea", color: "#6b6560" }}>{listing.totalQuantity}</span>
                          </div>

                          <div className="nd-items">
                            {listing.foodItems.map((item, index) => (
                              <div key={`${listing._id}-item-${index}`}>{item.name}: {item.quantity} {item.unit}</div>
                            ))}
                            {!!listing.partialClaims?.length && (
                              <div style={{ marginTop: 4, color: "#c8601a", fontWeight: 600, fontSize: "0.72rem" }}>
                                Partially claimed — quantities above are what remains
                              </div>
                            )}
                          </div>

                          <div className="nd-meta">
                            <div style={{ fontWeight: 700, color: "#2c2820", marginBottom: 3 }}>{expiring}</div>
                            <div>Pickup deadline: {formatDateTime(listing.expiresAt)}</div>
                            {listing.distanceKm !== undefined ? <div>Distance: {listing.distanceKm} km</div> : null}
                          </div>

                          <button
                            type="button"
                            disabled={listing.status !== "available"}
                            onClick={() => setClaimModalListing(listing)}
                            className="nd-claim"
                          >
                            {listing.status === "available" ? "Claim" : "Claimed"}
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="nd-empty">No available listings match your filters.</div>
              )}
            </>
          ) : (
            <>
              {isLoading ? (
                <div className="nd-empty">Loading your claimed listings...</div>
              ) : claimedListings.length ? (
                <div className="nd-grid">
                  {claimedListings.map((listing) => {
                    const status = statusMeta[listing.status];
                    return (
                      <article key={listing._id} className="nd-card" style={{ overflow: "visible" }}>
                        <div className="nd-body">
                          <div className="nd-top">
                            <div className="nd-h">{listing.foodItems.map((item) => item.name).join(", ")}</div>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                              <span className="nd-badge" style={{ background: status.bg, color: status.color }}>
                                <span className="nd-dot" style={{ background: status.dot }} />
                                {status.label}
                              </span>
                              {listing.myClaimedItems && (
                                <span style={{ background: "#fff7ed", color: "#c8601a", border: "1px solid rgba(200,96,26,0.2)", borderRadius: 100, padding: "2px 8px", fontSize: "0.65rem", fontWeight: 700 }}>
                                  Partial Claim
                                </span>
                              )}
                            </div>
                          </div>

                          {listing.myClaimedItems && (
                            <div className="nd-meta" style={{ marginBottom: 10 }}>
                              <div style={{ fontWeight: 700, color: "#2c2820", marginBottom: 3 }}>Your Reserved Quantities</div>
                              {listing.myClaimedItems.map((item, i) => (
                                <div key={i}>{item.name}: {item.quantity} {item.unit}</div>
                              ))}
                            </div>
                          )}

                          <div className="nd-meta" style={{ marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, color: "#2c2820" }}>Donor Contact</div>
                            <div>{listing.donorId?.name ?? listing.donorName}</div>
                            <div>{listing.donorId?.phone ?? listing.donorPhone}</div>
                          </div>

                          <div className="nd-meta" style={{ marginBottom: 10 }}>
                            <div style={{ fontWeight: 700, color: "#2c2820" }}>Volunteer Assigned</div>
                            <div>{listing.assignedVolunteer ? `${listing.assignedVolunteer.name} (${listing.assignedVolunteer.phone})` : "Not assigned yet"}</div>
                          </div>

                          <div className="nd-meta" style={{ marginBottom: 0 }}>
                            <div style={{ fontWeight: 700, color: "#2c2820" }}>Pickup Deadline</div>
                            <div>{formatDateTime(listing.expiresAt)}</div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="nd-empty">You have not claimed any listings yet.</div>
              )}
            </>
          )}
        </div>
      </div>

      {claimModalListing && (
        <ClaimQuantityModal
          listing={claimModalListing}
          onClose={() => setClaimModalListing(null)}
          onClaimed={handleClaimSuccess}
        />
      )}

      {showDemandModal && (
        <PostDemandModal
          sessionUser={sessionUser}
          onClose={() => setShowDemandModal(false)}
          onSuccess={() => {
            setShowDemandModal(false);
            void loadDemands();
            if (activeTab !== "demands") setActiveTab("demands");
          }}
        />
      )}

      {deliveryOtp && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 999,
            display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem",
          }}
          onClick={() => setDeliveryOtp(null)}
        >
          <div
            style={{
              background: "#fff", borderRadius: 20, padding: "2rem", maxWidth: 380, width: "100%",
              textAlign: "center", position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setDeliveryOtp(null)}
              style={{ position: "absolute", top: 14, right: 14, background: "none", border: "none", cursor: "pointer", color: "#8a837d" }}
            >
              <X size={18} />
            </button>
            <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 800, color: "#2c2820", marginBottom: 6 }}>
              Delivery OTP
            </div>
            <div style={{ fontSize: "0.8rem", color: "#6b6560", marginBottom: "1.25rem" }}>
              Show this code to the volunteer when they arrive to deliver the food.
            </div>
            {deliveryOtp.loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
                <Loader2 size={28} style={{ animation: "spin 1s linear infinite" }} />
              </div>
            ) : deliveryOtp.code ? (
              <div style={{
                fontFamily: "'Fraunces',serif", fontSize: "2.8rem", fontWeight: 900,
                letterSpacing: "0.25em", color: "#7c3aed",
                background: "#f5f3ff", borderRadius: 14, padding: "1rem 1.5rem", margin: "0 auto",
              }}>
                {deliveryOtp.code}
              </div>
            ) : (
              <div style={{ color: "#991b1b", fontSize: "0.85rem" }}>Could not load OTP. Please try again.</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* =================================================================
   POST DEMAND MODAL
================================================================= */
function PostDemandModal({
  sessionUser,
  onClose,
  onSuccess,
}: {
  sessionUser: SessionUser;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mealsRequired, setMealsRequired] = useState("");
  const [foodType, setFoodType] = useState("");
  const [urgency, setUrgency] = useState<DemandUrgency>("medium");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState(sessionUser.location ? String(sessionUser.location.lat) : "");
  const [lng, setLng] = useState(sessionUser.location ? String(sessionUser.location.lng) : "");
  const [locLoading, setLocLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function detectLoc() {
    if (!("geolocation" in navigator)) return;
    setLocLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        const newLat = p.coords.latitude.toFixed(6);
        const newLng = p.coords.longitude.toFixed(6);
        setLat(newLat);
        setLng(newLng);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}`,
            { headers: { "Accept-Language": "en" } },
          );
          const data = (await res.json()) as { display_name?: string };
          if (data.display_name) setAddress(data.display_name);
        } catch { /* leave address as-is */ }
        setLocLoading(false);
      },
      () => setLocLoading(false),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const meals = parseInt(mealsRequired, 10);
    if (!meals || meals < 1) { setError("Enter a valid number of meals."); return; }
    if (!address.trim()) { setError("Please enter or detect your location."); return; }
    if (!lat || !lng) { setError("Please detect or enter coordinates."); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mealsRequired: meals,
          foodType: foodType.trim() || undefined,
          urgency,
          location: { lat: parseFloat(lat), lng: parseFloat(lng), address: address.trim() },
        }),
      });
      const data = (await res.json()) as { id?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Failed to post demand."); return; }
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ background: "#fff", borderRadius: 24, padding: "1.75rem 1.5rem", width: "100%", maxWidth: 460, boxShadow: "0 20px 60px rgba(0,0,0,0.18)", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", fontWeight: 900, color: "#2c2820" }}>Post a Food Demand</div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#8a837d", padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a837d", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
              Meals Required *
            </label>
            <input
              type="number"
              min={1}
              value={mealsRequired}
              onChange={(e) => setMealsRequired(e.target.value)}
              placeholder="e.g. 150"
              required
              style={{ width: "100%", height: 44, border: "1.5px solid rgba(44,40,32,0.15)", borderRadius: 12, padding: "0 0.75rem", fontSize: "0.9rem", color: "#2c2820", background: "#faf8f4", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a837d", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
              Food Type (optional)
            </label>
            <select
              value={foodType}
              onChange={(e) => setFoodType(e.target.value)}
              style={{ width: "100%", height: 44, border: "1.5px solid rgba(44,40,32,0.15)", borderRadius: 12, padding: "0 0.75rem", fontSize: "0.9rem", color: "#2c2820", background: "#faf8f4" }}
            >
              <option value="">Any</option>
              <option value="cooked">Cooked</option>
              <option value="packaged">Packaged</option>
              <option value="raw">Raw</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a837d", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
              Urgency *
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              {(["low", "medium", "high"] as DemandUrgency[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUrgency(u)}
                  style={{
                    flex: 1, padding: "0.55rem 0", borderRadius: 10, fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", border: "1.5px solid",
                    background: urgency === u ? (u === "high" ? "#fee2e2" : u === "medium" ? "#fef3c7" : "#dcfce7") : "#faf8f4",
                    color: urgency === u ? (u === "high" ? "#991b1b" : u === "medium" ? "#92400e" : "#166534") : "#8a837d",
                    borderColor: urgency === u ? (u === "high" ? "#fca5a5" : u === "medium" ? "#fde68a" : "#86efac") : "rgba(44,40,32,0.12)",
                  }}
                >
                  {u === "high" ? "🔴" : u === "medium" ? "🟡" : "🟢"} {u.charAt(0).toUpperCase() + u.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.75rem", fontWeight: 700, color: "#8a837d", textTransform: "uppercase", letterSpacing: "0.07em", display: "block", marginBottom: 6 }}>
              Pickup / Delivery Location *
            </label>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Your NGO address"
                style={{ flex: 1, height: 44, border: "1.5px solid rgba(44,40,32,0.15)", borderRadius: 12, padding: "0 0.75rem", fontSize: "0.86rem", color: "#2c2820", background: "#faf8f4" }}
              />
              <button
                type="button"
                onClick={detectLoc}
                disabled={locLoading}
                style={{ padding: "0 0.9rem", height: 44, border: "1.5px solid rgba(44,40,32,0.15)", borderRadius: 12, background: "#f0fdf4", color: "#1e40af", fontSize: "0.78rem", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                {locLoading ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : "Detect"}
              </button>
            </div>
            {lat && lng && (
              <div style={{ fontSize: "0.72rem", color: "#8a837d" }}>
                Coordinates: {parseFloat(lat).toFixed(4)}, {parseFloat(lng).toFixed(4)}
              </div>
            )}
          </div>

          {error && (
            <div style={{ background: "#fee2e2", color: "#991b1b", borderRadius: 10, padding: "8px 12px", fontSize: "0.8rem" }}>{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: "0.75rem", background: "#1e40af", color: "#fff", border: "none", borderRadius: 12, fontSize: "0.9rem", fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, marginTop: 4 }}
          >
            {submitting ? "Posting..." : "Post Demand"}
          </button>
        </form>
      </div>
    </div>
  );
}