"use client";

import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { RefreshCw, MapPin } from "lucide-react";
import ListingsMap from "@/components/maps/ListingsMap";

type Listing = {
  _id: string;
  donorName: string;
  foodItems: { name: string; quantity: string; unit: string }[];
  totalQuantity: string;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  images: string[];
  location: { lat: number; lng: number; address: string };
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  distanceKm?: number;
  createdAt: string;
};

export default function NgoMapClient({
  userLocation,
  userId,
}: {
  userLocation: { lat: number; lng: number } | null;
  userId: string;
}) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<string | null>(null);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/listings";
      if (userLocation) {
        url += `?lat=${userLocation.lat}&lng=${userLocation.lng}&radiusKm=50`;
      }
      const res = await fetch(url, { cache: "no-store" });
      const data = (await res.json()) as { listings?: Listing[] };
      setListings(data.listings ?? []);
    } finally {
      setLoading(false);
    }
  }, [userLocation]);

  useEffect(() => {
    void fetchListings();
  }, [fetchListings]);

  async function claimListing(id: string) {
    setClaiming(id);
    try {
      const res = await fetch(`/api/listings/${id}/claim`, { method: "POST" });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l._id !== id));
      }
    } finally {
      setClaiming(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .nm { font-family:'DM Sans',sans-serif; background:#f5f3ef; height:100vh; display:flex; flex-direction:column; padding:0; }
        .nm-topbar { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.5rem; background:white; border-bottom:1px solid rgba(44,40,32,0.08); flex-shrink:0; }
        .nm-topbar-left { display:flex; align-items:center; gap:1rem; }
        .nm-back { display:inline-flex; align-items:center; gap:5px; font-size:0.8rem; font-weight:600; color:#6b6560; text-decoration:none; padding:4px 10px; border-radius:8px; border:1px solid rgba(44,40,32,0.1); background:#f5f3ef; transition:all 0.15s; }
        .nm-back:hover { color:#2c2820; }
        .nm-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:800; color:#2c2820; letter-spacing:-0.02em; }
        .nm-count { font-size:0.78rem; color:#6b6560; }
        .nm-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.55rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .nm-refresh-btn:hover { color:#2c2820; border-color:rgba(44,40,32,0.25); }
        .nm-no-loc { display:flex; align-items:center; gap:8px; padding:0.75rem 1.5rem; background:#eff6ff; border-bottom:1px solid rgba(29,78,216,0.12); font-size:0.82rem; color:#1e40af; font-weight:500; flex-shrink:0; }
        .nm-map { flex:1; overflow:hidden; }
        @keyframes spin { to { transform:rotate(360deg) } }
      `}</style>

      <div className="nm">
        <div className="nm-topbar">
          <div className="nm-topbar-left">
            <Link href="/dashboard/ngo" className="nm-back">← Dashboard</Link>
            <div>
              <div className="nm-title">Live Map</div>
              <div className="nm-count">{listings.length} listing{listings.length !== 1 ? "s" : ""} shown</div>
            </div>
          </div>
          <button className="nm-refresh-btn" onClick={() => void fetchListings()} disabled={loading}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh
          </button>
        </div>

        {!userLocation && (
          <div className="nm-no-loc">
            <MapPin size={14} />
            Set your location in{" "}
            <Link href="/dashboard/ngo/profile" style={{ fontWeight: 700, color: "#1e40af" }}>Profile</Link>
            {" "}to see distance info.
          </div>
        )}

        <div className="nm-map">
          {!loading && (
            <ListingsMap
              listings={listings}
              userLocation={userLocation ?? undefined}
              onListingClick={(listing) => void claimListing(listing._id)}
            />
          )}
        </div>
      </div>
    </>
  );
}
