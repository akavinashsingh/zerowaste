"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

type UserRole = "donor" | "ngo" | "volunteer" | "admin";
type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone: string;
  address: string;
  createdAt: string;
  listingCounts: { donor: number; claimed: number; volunteer: number };
};
type Pagination = { page: number; limit: number; total: number; totalPages: number };

const ROLE_COLORS: Record<UserRole, { color: string; bg: string }> = {
  donor: { color: "#1a5c38", bg: "#e8f5ee" },
  ngo: { color: "#1e40af", bg: "#dbeafe" },
  volunteer: { color: "#c8601a", bg: "#fff7ed" },
  admin: { color: "#4c1d95", bg: "#ede9fe" },
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function AdminUsersClient() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 15, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [updating, setUpdating] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchUsers = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "15" });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params}`, { cache: "no-store" });
      const data = (await res.json()) as { users?: UserRow[]; pagination?: Pagination };
      setUsers(data.users ?? []);
      if (data.pagination) setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter]);

  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => void fetchUsers(1), 350);
    return () => { if (searchTimeout.current) clearTimeout(searchTimeout.current); };
  }, [fetchUsers]);

  async function updateUser(id: string, updates: { role?: UserRole; isActive?: boolean }) {
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const data = (await res.json()) as { user?: UserRow };
        if (data.user) {
          setUsers((prev) => prev.map((u) => u._id === id ? { ...u, ...data.user } : u));
        }
      }
    } finally {
      setUpdating(null);
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700;900&family=DM+Sans:wght@300;400;500;600&display=swap');
        .au { font-family:'DM Sans',sans-serif; background:#f5f3ef; min-height:100vh; padding:2rem 2rem 6rem; }
        .au-inner { max-width:1300px; margin:0 auto; }
        .au-back { display:inline-flex; align-items:center; gap:5px; font-size:0.78rem; font-weight:600; color:#6b6560; text-decoration:none; margin-bottom:1rem; padding:4px 10px; border-radius:8px; background:white; border:1px solid rgba(44,40,32,0.1); }
        .au-header { display:flex; align-items:flex-end; justify-content:space-between; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem; }
        .au-title { font-family:'Fraunces',serif; font-size:clamp(1.5rem,3vw,2rem); font-weight:900; color:#2c2820; letter-spacing:-0.03em; }
        .au-sub { font-size:0.875rem; color:#6b6560; font-weight:300; margin-top:4px; }
        .au-toolbar { display:flex; align-items:center; gap:0.75rem; margin-bottom:1.25rem; flex-wrap:wrap; }
        .au-search-wrap { display:flex; align-items:center; gap:8px; background:white; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); padding:0 14px; flex:1; min-width:200px; max-width:340px; }
        .au-search-input { flex:1; height:42px; border:none; background:transparent; font-family:'DM Sans',sans-serif; font-size:0.875rem; color:#2c2820; outline:none; }
        .au-filter-select { height:42px; padding:0 12px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; outline:none; }
        .au-refresh-btn { display:inline-flex; align-items:center; gap:5px; padding:0 14px; height:42px; border-radius:12px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.82rem; font-weight:600; color:#6b6560; cursor:pointer; transition:all 0.15s; }
        .au-refresh-btn:hover { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .au-total { margin-left:auto; font-size:0.78rem; color:#a09a94; }
        .au-table-wrap { background:white; border-radius:20px; border:1px solid rgba(44,40,32,0.08); overflow:hidden; box-shadow:0 1px 4px rgba(44,40,32,0.05); }
        .au-table { width:100%; border-collapse:collapse; }
        .au-table th { padding:0.875rem 1rem; text-align:left; font-size:0.68rem; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#a09a94; background:#faf8f4; border-bottom:1px solid rgba(44,40,32,0.06); white-space:nowrap; }
        .au-table td { padding:0.875rem 1rem; font-size:0.82rem; color:#2c2820; border-bottom:1px solid rgba(44,40,32,0.04); vertical-align:middle; }
        .au-table tr:last-child td { border-bottom:none; }
        .au-table tr:hover td { background:#faf8f4; }
        .au-name { font-weight:600; }
        .au-email { font-size:0.75rem; color:#6b6560; margin-top:2px; }
        .au-role-badge { display:inline-flex; align-items:center; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .au-status-badge { display:inline-flex; align-items:center; gap:4px; padding:3px 9px; border-radius:100px; font-size:0.68rem; font-weight:700; }
        .au-role-select { padding:4px 8px; border-radius:8px; border:1.5px solid rgba(44,40,32,0.12); background:white; font-family:'DM Sans',sans-serif; font-size:0.78rem; font-weight:600; cursor:pointer; outline:none; transition:all 0.15s; }
        .au-toggle-btn { padding:5px 10px; border-radius:8px; border:none; font-family:'DM Sans',sans-serif; font-size:0.75rem; font-weight:600; cursor:pointer; transition:all 0.15s; }
        .au-pagination { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-top:1px solid rgba(44,40,32,0.06); background:#faf8f4; }
        .au-page-info { font-size:0.78rem; color:#6b6560; }
        .au-page-btns { display:flex; gap:0.5rem; }
        .au-page-btn { display:inline-flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:10px; border:1.5px solid rgba(44,40,32,0.12); background:white; cursor:pointer; transition:all 0.15s; color:#6b6560; }
        .au-page-btn:hover:not(:disabled) { border-color:rgba(44,40,32,0.25); color:#2c2820; }
        .au-page-btn:disabled { opacity:0.4; cursor:not-allowed; }
        .au-skeleton { background:linear-gradient(90deg,#f0ede8 25%,#e8e4df 50%,#f0ede8 75%); background-size:200% 100%; animation:shimmer 1.5s infinite; border-radius:8px; height:16px; }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin { to { transform:rotate(360deg) } }
        @media(max-width:1024px) { .au{padding:1.5rem 1rem 6rem} }
      `}</style>

      <div className="au">
        <div className="au-inner">
          <Link href="/dashboard/admin" className="au-back">← Overview</Link>

          <div className="au-header">
            <div>
              <div className="au-title">User Management</div>
              <div className="au-sub">{pagination.total} total users across all roles</div>
            </div>
          </div>

          <div className="au-toolbar">
            <div className="au-search-wrap">
              <Search size={15} style={{ color: "#a09a94", flexShrink: 0 }} />
              <input
                className="au-search-input"
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select className="au-filter-select" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">All Roles</option>
              <option value="donor">Donors</option>
              <option value="ngo">NGOs</option>
              <option value="volunteer">Volunteers</option>
              <option value="admin">Admins</option>
            </select>
            <button className="au-refresh-btn" onClick={() => void fetchUsers(pagination.page)} disabled={loading}>
              <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} /> Refresh
            </button>
            <span className="au-total">{pagination.total} users</span>
          </div>

          <div className="au-table-wrap">
            <table className="au-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Phone</th>
                  <th>Joined</th>
                  <th>Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(7)].map((_, j) => (
                        <td key={j}><div className="au-skeleton" style={{ width: j === 0 ? "80%" : "60%" }} /></td>
                      ))}
                    </tr>
                  ))
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: "3rem", color: "#a09a94", fontSize: "0.85rem" }}>
                      No users found matching your filters.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const rc = ROLE_COLORS[user.role];
                    return (
                      <tr key={user._id}>
                        <td>
                          <div className="au-name">{user.name}</div>
                          <div className="au-email">{user.email}</div>
                        </td>
                        <td>
                          <span className="au-role-badge" style={{ background: rc.bg, color: rc.color }}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                          </span>
                        </td>
                        <td>
                          <span className="au-status-badge" style={user.isActive ? { background: "#e8f5ee", color: "#1a5c38" } : { background: "#fee2e2", color: "#991b1b" }}>
                            <span style={{ width: 6, height: 6, borderRadius: "50%", background: user.isActive ? "#22c55e" : "#ef4444" }} />
                            {user.isActive ? "Active" : "Suspended"}
                          </span>
                        </td>
                        <td style={{ color: "#6b6560" }}>{user.phone || "—"}</td>
                        <td style={{ color: "#6b6560", whiteSpace: "nowrap" }}>{fmtDate(user.createdAt)}</td>
                        <td style={{ fontSize: "0.75rem", color: "#6b6560" }}>
                          {user.role === "donor" && `${user.listingCounts.donor} listings`}
                          {user.role === "ngo" && `${user.listingCounts.claimed} claims`}
                          {user.role === "volunteer" && `${user.listingCounts.volunteer} deliveries`}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                            <select
                              className="au-role-select"
                              value={user.role}
                              disabled={updating === user._id}
                              onChange={(e) => void updateUser(user._id, { role: e.target.value as UserRole })}
                            >
                              <option value="donor">Donor</option>
                              <option value="ngo">NGO</option>
                              <option value="volunteer">Volunteer</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button
                              className="au-toggle-btn"
                              disabled={updating === user._id}
                              style={user.isActive
                                ? { background: "#fee2e2", color: "#dc2626" }
                                : { background: "#e8f5ee", color: "#1a5c38" }}
                              onClick={() => void updateUser(user._id, { isActive: !user.isActive })}
                            >
                              {updating === user._id ? "..." : user.isActive ? "Suspend" : "Activate"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <div className="au-pagination">
              <span className="au-page-info">
                Page {pagination.page} of {pagination.totalPages} · {pagination.total} users
              </span>
              <div className="au-page-btns">
                <button
                  className="au-page-btn"
                  disabled={pagination.page <= 1 || loading}
                  onClick={() => void fetchUsers(pagination.page - 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                <button
                  className="au-page-btn"
                  disabled={pagination.page >= pagination.totalPages || loading}
                  onClick={() => void fetchUsers(pagination.page + 1)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
