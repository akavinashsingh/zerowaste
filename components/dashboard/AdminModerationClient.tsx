"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { RefreshCw, ChevronLeft, ChevronRight, Shield, Clock } from "lucide-react";

type AuditLog = {
  _id: string;
  adminId: string;
  adminName: string;
  action: "user_role_change" | "user_activate" | "user_deactivate" | "user_delete" | "listing_status_change" | "listing_delete";
  targetId: string;
  targetType: "user" | "listing";
  targetName?: string;
  details?: Record<string, unknown>;
  createdAt: string;
};

type ListingRow = {
  _id: string;
  foodItems: Array<{ name: string }>;
  donorName: string;
  status: string;
  expiresAt: string;
  createdAt: string;
};

type Pagination = { page: number; limit: number; total: number; totalPages: number };

const ACTION_META: Record<AuditLog["action"], { label: string; color: string; bg: string }> = {
  user_role_change: { label: "Role Changed", color: "#1e40af", bg: "#dbeafe" },
  user_activate: { label: "User Activated", color: "#1a5c38", bg: "#e8f5ee" },
  user_deactivate: { label: "User Suspended", color: "#92400e", bg: "#fef3c7" },
  user_delete: { label: "User Deleted", color: "#991b1b", bg: "#fee2e2" },
  listing_status_change: { label: "Status Changed", color: "#5b21b6", bg: "#ede9fe" },
  listing_delete: { label: "Listing Deleted", color: "#991b1b", bg: "#fee2e2" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDetails(action: AuditLog["action"], details?: Record<string, unknown>): string {
  if (!details) return "";
  if (action === "user_role_change") return `→ ${String(details.newRole ?? "")}`;
  if (action === "listing_status_change") return `→ ${String(details.newStatus ?? "").replace("_", " ")}`;
  return "";
}

export default function AdminModerationClient() {
  const [tab, setTab] = useState<"expired" | "audit">("expired");
  const [expiredListings, setExpiredListings] = useState<ListingRow[]>([]);
  const [expiredPagination, setExpiredPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditPagination, setAuditPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const fetchExpired = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/listings?status=expired&page=${page}&limit=15`, { cache: "no-store" });
      const data = (await res.json()) as { listings?: ListingRow[]; pagination?: Pagination };
      setExpiredListings(data.listings ?? []);
      if (data.pagination) setExpiredPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAuditLogs = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/audit-logs?page=${page}&limit=20`, { cache: "no-store" });
      const data = (await res.json()) as { logs?: AuditLog[]; pagination?: Pagination };
      setAuditLogs(data.logs ?? []);
      if (data.pagination) setAuditPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "expired") void fetchExpired(1);
    else void fetchAuditLogs(1);
  }, [tab, fetchExpired, fetchAuditLogs]);

  async function deleteListing(id: string) {
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    setExpiredListings((prev) => prev.filter((l) => l._id !== id));
    setExpiredPagination((prev) => ({ ...prev, total: prev.total - 1 }));
  }

  async function bulkDeleteExpired() {
    setBulkDeleting(true);
    setConfirmBulk(false);
    try {
      await Promise.all(expiredListings.map((l) => fetch(`/api/admin/listings/${l._id}`, { method: "DELETE" })));
      await fetchExpired(1);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .am { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .am-inner { max-width:1200px; margin:0 auto; }
        .am-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .am-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .am-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .am-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .am-header-btns { display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; }
        .am-refresh-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .am-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .am-bulk-btn { display:inline-flex; align-items:center; gap:6px; padding:0.6rem 1rem; border-radius:12px; border:none; background:#fee2e2; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#dc2626; cursor:pointer; transition:all 0.15s; }
        .am-bulk-btn:hover:not(:disabled) { background:#fecaca; }
        .am-bulk-btn:disabled { opacity:0.5; cursor:not-allowed; }
        .am-tabs { display:flex; gap:2px; margin-bottom:1.25rem; background:white; border-radius:14px; border:1px solid rgba(44,40,32,0.08); padding:4px; width:fit-content; }
        .am-tab { padding:7px 16px; border-radius:10px; border:none; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; cursor:pointer; transition:all 0.15s; background:transparent; color:#6b6560; }
        .am-tab.active { background:#2c2820; color:white; }
        .am-table-wrap { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .am-table { width:100%; border-collapse:collapse; }
        .am-table th { padding:0.875rem 1rem; text-align:left; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#a09a94; background:#faf8f4; border-bottom:1px solid rgba(44,40,32,0.06); white-space:nowrap; }
        .am-table td { padding:0.875rem 1rem; font-size:0.82rem; color:#2c2820; border-bottom:1px solid rgba(44,40,32,0.04); vertical-align:middle; }
        .am-table tr:last-child td { border-bottom:none; }
        .am-table tr:hover td { background:#faf8f4; }
        .am-food-name { font-weight:600; }
        .am-donor { font-size:0.75rem; color:#6b6560; margin-top:2px; }
        .am-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .am-del-btn { padding:5px 10px; border-radius:8px; border:none; background:#fee2e2; color:#dc2626; font-family:'DM Sans',sans-serif; font-size:0.75rem; font-weight:600; cursor:pointer; transition:all 0.15s; }
        .am-del-btn:hover { background:#fecaca; }
        .am-pagination { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-top:1px solid rgba(44,40,32,0.06); background:#faf8f4; }
        .am-page-info { font-size:0.78rem; color:#6b6560; }
        .am-page-btns { display:flex; gap:0.5rem; }
        .am-page-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; border:1.5px solid rgba(44,40,32,0.12); background:white; cursor:pointer; transition:all 0.15s; color:#6b6560; }
        .am-page-btn:hover:not(:disabled) { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .am-page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .am-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; height:16px; }
        .am-confirm-overlay { position:fixed; inset:0; background:rgba(44,40,32,0.4); backdrop-filter:blur(4px); z-index:200; display:flex; align-items:center; justify-content:center; padding:1rem; }
        .am-confirm-box { background:white; border-radius:20px; padding:1.75rem; max-width:380px; width:100%; box-shadow:0 20px 60px rgba(44,40,32,0.2); }
        .am-confirm-title { font-family:'Fraunces',serif; font-size:1.1rem; font-weight:800; color:#2c2820; margin-bottom:0.5rem; }
        .am-confirm-sub { font-size:0.85rem; color:#6b6560; margin-bottom:1.25rem; }
        .am-confirm-btns { display:flex; gap:0.75rem; }
        .am-confirm-cancel { flex:1; padding:0.625rem; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; color:#6b6560; cursor:pointer; }
        .am-confirm-delete { flex:1; padding:0.625rem; border-radius:12px; border:none; background:#dc2626; font-family:'DM Sans',sans-serif; font-size:0.875rem; font-weight:600; color:white; cursor:pointer; }
        .am-audit-meta { font-size:0.72rem; color:#a09a94; margin-top:2px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media(max-width:900px) { .am{padding:1.5rem 1rem 6rem} }
      `}</style>

      <div className="am">
        <div className="am-inner">
          <Link href="/dashboard/admin" className="am-back">← Overview</Link>

          <div className="am-header">
            <div>
              <div className="am-title">Moderation</div>
              <div className="am-sub">Manage expired listings and review admin audit trail</div>
            </div>
            <div className="am-header-btns">
              {tab === "expired" && expiredListings.length > 0 && (
                <button className="am-bulk-btn" onClick={() => setConfirmBulk(true)} disabled={bulkDeleting}>
                  {bulkDeleting ? "Deleting..." : `Delete All ${expiredPagination.total} Expired`}
                </button>
              )}
              <button
                className="am-refresh-btn"
                onClick={() => tab === "expired" ? void fetchExpired(1) : void fetchAuditLogs(1)}
                disabled={loading}
              >
                <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
              </button>
            </div>
          </div>

          <div className="am-tabs">
            <button className={`am-tab ${tab === "expired" ? "active" : ""}`} onClick={() => setTab("expired")}>
              <Clock size={12} style={{ display: "inline", marginRight: 5 }} />Expired Listings ({expiredPagination.total})
            </button>
            <button className={`am-tab ${tab === "audit" ? "active" : ""}`} onClick={() => setTab("audit")}>
              <Shield size={12} style={{ display: "inline", marginRight: 5 }} />Audit Log ({auditPagination.total})
            </button>
          </div>

          {tab === "expired" && (
            <div className="am-table-wrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th>Food</th>
                    <th>Quantity / Type</th>
                    <th>Posted</th>
                    <th>Expired</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(6)].map((_, i) => (
                      <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="am-skeleton" /></td>)}</tr>
                    ))
                  ) : expiredListings.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#a09a94", fontSize: "0.85rem" }}>
                        No expired listings. Platform is clean!
                      </td>
                    </tr>
                  ) : (
                    expiredListings.map((listing) => (
                      <tr key={listing._id}>
                        <td>
                          <div className="am-food-name">{listing.foodItems.map((f) => f.name).join(", ")}</div>
                          <div className="am-donor">{listing.donorName}</div>
                        </td>
                        <td style={{ color: "#6b6560" }}>{listing.status}</td>
                        <td style={{ color: "#6b6560", whiteSpace: "nowrap" }}>{fmtDate(listing.createdAt)}</td>
                        <td style={{ color: "#dc2626", whiteSpace: "nowrap" }}>{fmtDate(listing.expiresAt)}</td>
                        <td>
                          <button className="am-del-btn" onClick={() => void deleteListing(listing._id)}>Delete</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="am-pagination">
                <span className="am-page-info">Page {expiredPagination.page} of {expiredPagination.totalPages} · {expiredPagination.total} expired</span>
                <div className="am-page-btns">
                  <button className="am-page-btn" disabled={expiredPagination.page <= 1 || loading} onClick={() => void fetchExpired(expiredPagination.page - 1)}>
                    <ChevronLeft size={15} />
                  </button>
                  <button className="am-page-btn" disabled={expiredPagination.page >= expiredPagination.totalPages || loading} onClick={() => void fetchExpired(expiredPagination.page + 1)}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div className="am-table-wrap">
              <table className="am-table">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Admin</th>
                    <th>Target</th>
                    <th>Details</th>
                    <th>When</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    [...Array(8)].map((_, i) => (
                      <tr key={i}>{[...Array(5)].map((_, j) => <td key={j}><div className="am-skeleton" /></td>)}</tr>
                    ))
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} style={{ textAlign: "center", padding: "3rem", color: "#a09a94", fontSize: "0.85rem" }}>
                        No audit log entries yet.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => {
                      const meta = ACTION_META[log.action] ?? { label: log.action, color: "#6b6560", bg: "#f5f3ef" };
                      return (
                        <tr key={log._id}>
                          <td>
                            <span className="am-badge" style={{ background: meta.bg, color: meta.color }}>{meta.label}</span>
                          </td>
                          <td style={{ fontWeight: 600 }}>{log.adminName}</td>
                          <td>
                            <div style={{ fontWeight: 500 }}>{log.targetName ?? log.targetId}</div>
                            <div className="am-audit-meta">{log.targetType}</div>
                          </td>
                          <td style={{ color: "#6b6560", fontSize: "0.75rem" }}>{fmtDetails(log.action, log.details)}</td>
                          <td style={{ color: "#6b6560", whiteSpace: "nowrap", fontSize: "0.75rem" }}>{fmtDate(log.createdAt)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
              <div className="am-pagination">
                <span className="am-page-info">Page {auditPagination.page} of {auditPagination.totalPages} · {auditPagination.total} entries</span>
                <div className="am-page-btns">
                  <button className="am-page-btn" disabled={auditPagination.page <= 1 || loading} onClick={() => void fetchAuditLogs(auditPagination.page - 1)}>
                    <ChevronLeft size={15} />
                  </button>
                  <button className="am-page-btn" disabled={auditPagination.page >= auditPagination.totalPages || loading} onClick={() => void fetchAuditLogs(auditPagination.page + 1)}>
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {confirmBulk && (
        <div className="am-confirm-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmBulk(false); }}>
          <div className="am-confirm-box">
            <div className="am-confirm-title">Delete All Expired Listings?</div>
            <div className="am-confirm-sub">
              This will permanently delete all {expiredPagination.total} expired listings. This action cannot be undone.
            </div>
            <div className="am-confirm-btns">
              <button className="am-confirm-cancel" onClick={() => setConfirmBulk(false)}>Cancel</button>
              <button className="am-confirm-delete" onClick={() => void bulkDeleteExpired()}>Delete All</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
