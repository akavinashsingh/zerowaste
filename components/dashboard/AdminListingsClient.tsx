"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, RefreshCw, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";

type FoodItem = { name: string; quantity: string; unit: string };
type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";
type ListingRow = {
  _id: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: string;
  status: ListingStatus;
  donorName: string;
  donorAddress: string;
  createdAt: string;
  expiresAt: string;
  claimedBy?: { name: string } | null;
  assignedVolunteer?: { name: string } | null;
};
type Pagination = { page: number; limit: number; total: number; totalPages: number };

const STATUS_META: Record<ListingStatus, { label: string; color: string; bg: string }> = {
  available: { label: "Available", color: "#1a5c38", bg: "#e8f5ee" },
  claimed: { label: "Claimed", color: "#1e40af", bg: "#dbeafe" },
  picked_up: { label: "Picked Up", color: "#c8601a", bg: "#fff7ed" },
  delivered: { label: "Delivered", color: "#5b21b6", bg: "#ede9fe" },
  expired: { label: "Expired", color: "#6b6560", bg: "#f5f3ef" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminListingsClient() {
  const [listings, setListings] = useState<ListingRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchListings = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const res = await fetch(`/api/admin/listings?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { listings?: ListingRow[]; pagination?: Pagination };
      setListings(data.listings ?? []);
      if (data.pagination) setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => void fetchListings(1), 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [fetchListings]);

  async function updateStatus(id: string, status: ListingStatus) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setListings((prev) => prev.map((l) => l._id === id ? { ...l, status } : l));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function deleteListing(id: string) {
    setUpdating(id);
    setConfirmDelete(null);
    try {
      const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      if (res.ok) {
        setListings((prev) => prev.filter((l) => l._id !== id));
        setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .al { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .al-inner { max-width:1400px; margin:0 auto; }
        .al-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .al-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .al-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .al-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .al-toolbar { display:flex; align-items:center; gap:0.75rem; margin-bottom:1.25rem; flex-wrap:wrap; }
        .al-search-wrap { display:flex; align-items:center; gap:8px; background:white; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); padding:0 14px; flex:1; min-width:200px; max-width:360px; }
        .al-search-input { flex:1; height:42px; border:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:0.875rem; color:#2c2820; outline:none; }
        .al-filter-select { height:42px; padding:0 12px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; outline:none; }
        .al-refresh-btn { display:inline-flex; align-items:center; gap:5px; padding:0 14px; height:42px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .al-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .al-total { margin-left:auto; font-size:0.78rem; color:#a09a94; }
        .al-table-wrap { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .al-table { width:100%; border-collapse:collapse; }
        .al-table th { padding:0.875rem 1rem; text-align:left; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#a09a94; background:#faf8f4; border-bottom:1px solid rgba(44,40,32,0.06); white-space:nowrap; }
        .al-table td { padding:0.875rem 1rem; font-size:0.82rem; color:#2c2820; border-bottom:1px solid rgba(44,40,32,0.04); vertical-align:middle; }
        .al-table tr:last-child td { border-bottom:none; }
        .al-table tr:hover td { background:#faf8f4; }
        .al-food-name { font-weight:600; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .al-donor { font-size:0.75rem; color:#6b6560; margin-top:2px; }
        .al-status-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .al-food-badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:8px; font-size:0.68rem; font-weight:700; }
        .al-status-select { padding:4px 8px; border-radius:8px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; cursor:pointer; outline:none; transition:all 0.15s; }
        .al-del-btn { display:inline-flex; align-items:center; justify-content:center; width:30px; height:30px; border-radius:8px; border:none; background:#fee2e2; color:#dc2626; cursor:pointer; transition:all 0.15s; }
        .al-del-btn:hover { background:#fecaca; }
        .al-del-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .al-pagination { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-top:1px solid rgba(44,40,32,0.06); background:#faf8f4; }
        .al-page-info { font-size:0.78rem; color:#6b6560; }
        .al-page-btns { display:flex; gap:0.5rem; }
        .al-page-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; border:1.5px solid rgba(44,40,32,0.12); background:white; cursor:pointer; transition:all 0.15s; color:#6b6560; }
        .al-page-btn:hover:not(:disabled) { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .al-page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .al-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; height:16px; }
        .al-confirm-overlay { position:fixed; inset:0; background:rgba(44,40,32,0.4); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .al-confirm-box { background:white; border-radius:20px; padding:1.75rem; max-width:360px; width:100%; box-shadow:0 20px 60px rgba(44,40,32,0.2); }
        .al-confirm-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:800; color:#2c2820; margin-bottom:0.5rem; }
        .al-confirm-sub { font-size:0.85rem; color:#6b6560; margin-bottom:1.25rem; }
        .al-confirm-btns { display:flex; gap:0.75rem; }
        .al-confirm-cancel { flex:1; padding:0.625rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; color:#6b6560; cursor:pointer; }
        .al-confirm-delete { flex:1; padding:0.625rem; border-radius:12px; border:none; background:#dc2626; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; color:white; cursor:pointer; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media(max-width:1024px) { .al{padding:1.5rem 1rem 6rem} }
      `}</style>

      <div className="al">
        <div className="al-inner">
          <Link href="/dashboard/admin" className="al-back">← Overview</Link>

          <div className="al-header">
            <div>
              <div className="al-title">Listing Management</div>
              <div className="al-sub">{pagination.total} total listings across all statuses</div>
            </div>
          </div>

          <div className="al-toolbar">
            <div className="al-search-wrap">
              <Search size={15} style={{ color: "#a09a94", flexShrink: 0 }} />
              <input
                className="al-search-input"
                placeholder="Search by donor, food, or address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="al-filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="available">Available</option>
              <option value="claimed">Claimed</option>
              <option value="picked_up">Picked Up</option>
              <option value="delivered">Delivered</option>
              <option value="expired">Expired</option>
            </select>
            <button className="al-refresh-btn" onClick={() => void fetchListings(pagination.page)} disabled={loading}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
            <span className="al-total">{pagination.total} listings</span>
          </div>

          <div className="al-table-wrap">
            <table className="al-table">
              <thead>
                <tr>
                  <th>Food</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Quantity</th>
                  <th>NGO</th>
                  <th>Volunteer</th>
                  <th>Posted</th>
                  <th>Expires</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(9)].map((_, j) => (
                        <td key={j}><div className="al-skeleton" style={{ width: j === 0 ? "80%" : "60%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={9} style={{ textAlign: "center", padding: "3rem", color: "#a09a94", fontSize: "0.85rem" }}>
                      No listings found matching your filters.
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => {
                    const sm = STATUS_META[listing.status];
                    const foodLabel = listing.foodType === "cooked" ? "🍳 Cooked" : listing.foodType === "raw" ? "🥦 Raw" : "📦 Packaged";
                    const foodColors = listing.foodType === "cooked"
                      ? { color: "#c8601a", bg: "#fff7ed" }
                      : listing.foodType === "raw"
                        ? { color: "#1a5c38", bg: "#e8f5ee" }
                        : { color: "#1e40af", bg: "#dbeafe" };
                    return (
                      <tr key={listing._id}>
                        <td>
                          <div className="al-food-name">{listing.foodItems.map((f) => f.name).join(", ")}</div>
                          <div className="al-donor">{listing.donorName}</div>
                        </td>
                        <td>
                          <span className="al-food-badge" style={{ background: foodColors.bg, color: foodColors.color }}>{foodLabel}</span>
                        </td>
                        <td>
                          <span className="al-status-badge" style={{ background: sm.bg, color: sm.color }}>{sm.label}</span>
                        </td>
                        <td style={{ color: "#6b6560" }}>{listing.totalQuantity}</td>
                        <td style={{ color: "#6b6560", fontSize: "0.75rem" }}>{listing.claimedBy?.name ?? "—"}</td>
                        <td style={{ color: "#6b6560", fontSize: "0.75rem" }}>{listing.assignedVolunteer?.name ?? "—"}</td>
                        <td style={{ color: "#6b6560", whiteSpace: "nowrap" }}>{fmtDate(listing.createdAt)}</td>
                        <td style={{ color: "#6b6560", whiteSpace: "nowrap" }}>{fmtDate(listing.expiresAt)}</td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                            <select
                              className="al-status-select"
                              value={listing.status}
                              disabled={updating === listing._id}
                              onChange={(e) => void updateStatus(listing._id, e.target.value as ListingStatus)}
                            >
                              <option value="available">Available</option>
                              <option value="claimed">Claimed</option>
                              <option value="picked_up">Picked Up</option>
                              <option value="delivered">Delivered</option>
                              <option value="expired">Expired</option>
                            </select>
                            <button
                              className="al-del-btn"
                              disabled={updating === listing._id}
                              onClick={() => setConfirmDelete(listing._id)}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="al-pagination">
              <span className="al-page-info">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} listings
              </span>
              <div className="al-page-btns">
                <button
                  className="al-page-btn"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => void fetchListings(pagination.page - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  className="al-page-btn"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => void fetchListings(pagination.page + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirmDelete && (
        <div className="al-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmDelete(null); }}>
          <div className="al-confirm-box">
            <div className="al-confirm-title">Delete Listing?</div>
            <div className="al-confirm-sub">This action cannot be undone. The listing and all associated data will be permanently removed.</div>
            <div className="al-confirm-btns">
              <button className="al-confirm-cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="al-confirm-delete" onClick={() => void deleteListing(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
