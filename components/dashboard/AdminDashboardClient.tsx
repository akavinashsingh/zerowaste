"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";
type UserRole = "donor" | "ngo" | "volunteer" | "admin";

type DayCount = {
  date: string;
  count: number;
};

type AdminStats = {
  totalListings: number;
  activeListings: number;
  deliveredListings: number;
  expiredListings: number;
  totalUsers: {
    donors: number;
    ngos: number;
    volunteers: number;
  };
  totalFoodSaved: number;
  listingsByDay: DayCount[];
  deliveriesByDay: DayCount[];
  listingsByFoodType: {
    cooked: number;
    packaged: number;
    raw: number;
  };
};

type UserRow = {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  phone: string;
  address: string;
  createdAt: string;
  listingCounts: {
    donor: number;
    claimed: number;
    volunteer: number;
  };
};

type UserResponse = {
  users: UserRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ListingContact = {
  _id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: UserRole;
};

type FoodItem = {
  name: string;
  quantity: string;
  unit: string;
};

type ListingRow = {
  _id: string;
  donorName: string;
  donorId?: ListingContact;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: string;
  status: ListingStatus;
  claimedBy?: ListingContact;
  assignedVolunteer?: ListingContact;
  expiresAt: string;
  createdAt: string;
  donorAddress: string;
  donorPhone: string;
  location?: {
    address?: string;
  };
};

type ListingResponse = {
  listings: ListingRow[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type RoleFilter = "all" | "donor" | "ngo" | "volunteer";

const statusClasses: Record<ListingStatus, string> = {
  available: "bg-green-100 text-green-800",
  claimed: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  expired: "bg-red-100 text-red-800",
};

const roleClasses: Record<UserRole, string> = {
  donor: "bg-sky-100 text-sky-800",
  ngo: "bg-violet-100 text-violet-800",
  volunteer: "bg-amber-100 text-amber-800",
  admin: "bg-stone-200 text-stone-900",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toChartLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  return parsed.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function DashboardCard({ title, value, sub }: { title: string; value: string | number; sub?: string }) {
  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--muted)]">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">{value}</p>
      {sub ? <p className="mt-1 text-sm text-[color:var(--muted)]">{sub}</p> : null}
    </article>
  );
}

export default function AdminDashboardClient() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsError, setStatsError] = useState<string | null>(null);

  const [users, setUsers] = useState<UserRow[]>([]);
  const [userPage, setUserPage] = useState(1);
  const [userPagination, setUserPagination] = useState<UserResponse["pagination"] | null>(null);
  const [userSearchInput, setUserSearchInput] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const [listings, setListings] = useState<ListingRow[]>([]);
  const [listingPage, setListingPage] = useState(1);
  const [listingPagination, setListingPagination] = useState<ListingResponse["pagination"] | null>(null);
  const [listingStatusFilter, setListingStatusFilter] = useState<"all" | ListingStatus>("all");

  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingListings, setIsLoadingListings] = useState(true);
  const [isSavingUser, setIsSavingUser] = useState<Record<string, boolean>>({});
  const [isSavingListing, setIsSavingListing] = useState<Record<string, boolean>>({});

  const [selectedListing, setSelectedListing] = useState<ListingRow | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setUserSearch(userSearchInput.trim());
      setUserPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [userSearchInput]);

  const loadStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(null);

    try {
      const response = await fetch("/api/admin/stats", { cache: "no-store" });
      const data = (await response.json()) as AdminStats & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load admin stats.");
      }

      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "Unable to load admin stats.");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  const loadUsers = useCallback(async () => {
    setIsLoadingUsers(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(userPage));
      params.set("limit", "10");
      if (roleFilter !== "all") {
        params.set("role", roleFilter);
      }
      if (userSearch) {
        params.set("search", userSearch);
      }

      const response = await fetch(`/api/admin/users?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as UserResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load users.");
      }

      setUsers(data.users ?? []);
      setUserPagination(data.pagination ?? null);
    } catch {
      setUsers([]);
      setUserPagination(null);
    } finally {
      setIsLoadingUsers(false);
    }
  }, [roleFilter, userPage, userSearch]);

  const loadListings = useCallback(async () => {
    setIsLoadingListings(true);

    try {
      const params = new URLSearchParams();
      params.set("page", String(listingPage));
      params.set("limit", "10");
      if (listingStatusFilter !== "all") {
        params.set("status", listingStatusFilter);
      }

      const response = await fetch(`/api/admin/listings?${params.toString()}`, { cache: "no-store" });
      const data = (await response.json()) as ListingResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load listings.");
      }

      setListings(data.listings ?? []);
      setListingPagination(data.pagination ?? null);
    } catch {
      setListings([]);
      setListingPagination(null);
    } finally {
      setIsLoadingListings(false);
    }
  }, [listingPage, listingStatusFilter]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    void loadListings();
  }, [loadListings]);

  async function updateUserRole(userId: string, role: UserRole) {
    setIsSavingUser((s) => ({ ...s, [userId]: true }));

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to update user role.");
      }

      await Promise.all([loadUsers(), loadStats()]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to update user role.");
    } finally {
      setIsSavingUser((s) => ({ ...s, [userId]: false }));
    }
  }

  async function toggleUserActive(user: UserRow) {
    setIsSavingUser((s) => ({ ...s, [user._id]: true }));

    try {
      const response = await fetch(`/api/admin/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to update account status.");
      }

      await loadUsers();
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to update account status.");
    } finally {
      setIsSavingUser((s) => ({ ...s, [user._id]: false }));
    }
  }

  async function deleteListing(listingId: string) {
    const confirmed = window.confirm("Delete this listing permanently?");
    if (!confirmed) return;

    setIsSavingListing((s) => ({ ...s, [listingId]: true }));

    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to delete listing.");
      }

      await Promise.all([loadListings(), loadStats()]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to delete listing.");
    } finally {
      setIsSavingListing((s) => ({ ...s, [listingId]: false }));
    }
  }

  async function updateListingStatus(listingId: string, status: ListingStatus) {
    setIsSavingListing((s) => ({ ...s, [listingId]: true }));

    try {
      const response = await fetch(`/api/admin/listings/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Unable to update listing status.");
      }

      await Promise.all([loadListings(), loadStats()]);
    } catch (err) {
      window.alert(err instanceof Error ? err.message : "Unable to update listing status.");
    } finally {
      setIsSavingListing((s) => ({ ...s, [listingId]: false }));
    }
  }

  const trendChartData = useMemo(() => {
    if (!stats) return [];

    const deliveryMap = new Map(stats.deliveriesByDay.map((row) => [row.date, row.count]));

    return stats.listingsByDay.map((listingRow) => ({
      date: toChartLabel(listingRow.date),
      listings: listingRow.count,
      deliveries: deliveryMap.get(listingRow.date) ?? 0,
    }));
  }, [stats]);

  const foodTypeChartData = useMemo(() => {
    if (!stats) return [];

    return [
      { name: "Cooked", count: stats.listingsByFoodType.cooked },
      { name: "Packaged", count: stats.listingsByFoodType.packaged },
      { name: "Raw", count: stats.listingsByFoodType.raw },
    ];
  }, [stats]);

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(24,35,15,0.08)]">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">Admin command center</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
            Platform oversight and analytics
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-[color:var(--muted)]">
            Monitor listing operations, user health, and delivery impact across the entire platform.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DashboardCard title="Total Listings" value={isLoadingStats ? "..." : stats?.totalListings ?? 0} />
          <DashboardCard title="Delivered" value={isLoadingStats ? "..." : stats?.deliveredListings ?? 0} />
          <DashboardCard title="Active" value={isLoadingStats ? "..." : stats?.activeListings ?? 0} />
          <DashboardCard title="Expired" value={isLoadingStats ? "..." : stats?.expiredListings ?? 0} />
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <DashboardCard title="Donors" value={isLoadingStats ? "..." : stats?.totalUsers.donors ?? 0} />
          <DashboardCard title="NGOs" value={isLoadingStats ? "..." : stats?.totalUsers.ngos ?? 0} />
          <DashboardCard title="Volunteers" value={isLoadingStats ? "..." : stats?.totalUsers.volunteers ?? 0} />
        </section>

        <section className="rounded-3xl border border-green-200 bg-green-50 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-700">Total Meals Saved</p>
          <p className="mt-2 text-5xl font-bold text-green-800">{isLoadingStats ? "..." : stats?.totalFoodSaved ?? 0}</p>
          <p className="mt-2 text-sm text-green-700">Estimated meals saved from delivered listings.</p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Listings vs Deliveries (30 days)</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="listings" stroke="#2563eb" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="deliveries" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5">
            <h2 className="text-lg font-semibold text-[color:var(--foreground)]">Listings by Food Type</h2>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={foodTypeChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </section>

        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Users</h2>
            <input
              value={userSearchInput}
              onChange={(event) => setUserSearchInput(event.target.value)}
              placeholder="Search users by name or email"
              className="w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm outline-none transition focus:border-[color:var(--accent)] lg:max-w-sm"
            />
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(["all", "donor", "ngo", "volunteer"] as RoleFilter[]).map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => {
                  setRoleFilter(role);
                  setUserPage(1);
                }}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  roleFilter === role
                    ? "bg-[color:var(--accent)] text-white"
                    : "border border-[color:var(--border)] bg-white text-[color:var(--foreground)]"
                }`}
              >
                {role === "all" ? "All" : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`}
              </button>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.15em] text-[color:var(--muted)]">
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Email</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2">Joined</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingUsers ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[color:var(--muted)]">
                      Loading users...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-6 text-center text-[color:var(--muted)]">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user._id} className="rounded-2xl bg-white/80">
                      <td className="px-3 py-3 font-medium text-[color:var(--foreground)]">{user.name}</td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{user.email}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${roleClasses[user.role]}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{user.phone || "-"}</td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{formatDate(user.createdAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-[290px] flex-wrap items-center gap-2">
                          <select
                            value={user.role}
                            disabled={isSavingUser[user._id]}
                            onChange={(event) => void updateUserRole(user._id, event.target.value as UserRole)}
                            className="rounded-xl border border-[color:var(--border)] bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="donor">Donor</option>
                            <option value="ngo">NGO</option>
                            <option value="volunteer">Volunteer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            type="button"
                            disabled={isSavingUser[user._id]}
                            onClick={() => void toggleUserActive(user)}
                            className={`rounded-xl px-3 py-1.5 text-xs font-semibold text-white ${
                              user.isActive ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"
                            }`}
                          >
                            {user.isActive ? "Suspend" : "Activate"}
                          </button>
                          <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${user.isActive ? "bg-green-100 text-green-700" : "bg-stone-200 text-stone-700"}`}>
                            {user.isActive ? "Active" : "Suspended"}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={userPagination?.page ?? userPage}
            totalPages={userPagination?.totalPages ?? 1}
            onPrev={() => setUserPage((p) => Math.max(1, p - 1))}
            onNext={() => setUserPage((p) => p + 1)}
          />
        </section>

        <section className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface)] p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Listings</h2>
            <select
              value={listingStatusFilter}
              onChange={(event) => {
                setListingStatusFilter(event.target.value as "all" | ListingStatus);
                setListingPage(1);
              }}
              className="rounded-2xl border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm outline-none"
            >
              <option value="all">All statuses</option>
              <option value="available">Available</option>
              <option value="claimed">Claimed</option>
              <option value="picked_up">Picked Up</option>
              <option value="delivered">Delivered</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-[0.15em] text-[color:var(--muted)]">
                  <th className="px-3 py-2">Donor</th>
                  <th className="px-3 py-2">Food Items</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Claimed By</th>
                  <th className="px-3 py-2">Volunteer</th>
                  <th className="px-3 py-2">Expires</th>
                  <th className="px-3 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingListings ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-[color:var(--muted)]">
                      Loading listings...
                    </td>
                  </tr>
                ) : listings.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-[color:var(--muted)]">
                      No listings found.
                    </td>
                  </tr>
                ) : (
                  listings.map((listing) => (
                    <tr key={listing._id} className="rounded-2xl bg-white/80">
                      <td className="px-3 py-3 text-[color:var(--foreground)]">{listing.donorId?.name ?? listing.donorName}</td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{listing.foodItems.map((f) => f.name).join(", ")}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase ${statusClasses[listing.status]}`}>
                          {listing.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{listing.claimedBy?.name ?? "-"}</td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{listing.assignedVolunteer?.name ?? "-"}</td>
                      <td className="px-3 py-3 text-[color:var(--muted)]">{formatDate(listing.expiresAt)}</td>
                      <td className="px-3 py-3">
                        <div className="flex min-w-[320px] flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedListing(listing)}
                            className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-semibold"
                          >
                            View Details
                          </button>
                          <select
                            value={listing.status}
                            disabled={isSavingListing[listing._id]}
                            onChange={(event) => void updateListingStatus(listing._id, event.target.value as ListingStatus)}
                            className="rounded-xl border border-[color:var(--border)] bg-white px-2 py-1.5 text-xs"
                          >
                            <option value="available">Available</option>
                            <option value="claimed">Claimed</option>
                            <option value="picked_up">Picked Up</option>
                            <option value="delivered">Delivered</option>
                            <option value="expired">Expired</option>
                          </select>
                          <button
                            type="button"
                            disabled={isSavingListing[listing._id]}
                            onClick={() => void deleteListing(listing._id)}
                            className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            page={listingPagination?.page ?? listingPage}
            totalPages={listingPagination?.totalPages ?? 1}
            onPrev={() => setListingPage((p) => Math.max(1, p - 1))}
            onNext={() => setListingPage((p) => p + 1)}
          />
        </section>

        {selectedListing ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-xl font-semibold text-[color:var(--foreground)]">Listing Details</h3>
                <button
                  type="button"
                  onClick={() => setSelectedListing(null)}
                  className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
                >
                  Close
                </button>
              </div>

              <div className="mt-4 space-y-4 text-sm text-[color:var(--muted)]">
                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">Donor</p>
                  <p>{selectedListing.donorId?.name ?? selectedListing.donorName}</p>
                  <p>{selectedListing.donorPhone}</p>
                  <p>{selectedListing.donorAddress}</p>
                </div>

                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">Food Items</p>
                  <ul className="mt-1 space-y-1">
                    {selectedListing.foodItems.map((item, index) => (
                      <li key={`${selectedListing._id}-${index}`}>
                        {item.name}: {item.quantity} {item.unit}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <p>
                    <span className="font-semibold text-[color:var(--foreground)]">Food type:</span> {selectedListing.foodType}
                  </p>
                  <p>
                    <span className="font-semibold text-[color:var(--foreground)]">Total quantity:</span> {selectedListing.totalQuantity}
                  </p>
                  <p>
                    <span className="font-semibold text-[color:var(--foreground)]">Status:</span> {selectedListing.status}
                  </p>
                  <p>
                    <span className="font-semibold text-[color:var(--foreground)]">Expires:</span> {formatDate(selectedListing.expiresAt)}
                  </p>
                </div>

                <div>
                  <p className="font-semibold text-[color:var(--foreground)]">Pickup Location</p>
                  <p>{selectedListing.location?.address || selectedListing.donorAddress}</p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {statsError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{statsError}</div>
        ) : null}
      </div>
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onPrev}
        disabled={page <= 1}
        className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
      >
        Prev
      </button>
      <span className="text-xs text-[color:var(--muted)]">
        Page {page} of {Math.max(1, totalPages)}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={page >= totalPages}
        className="rounded-xl border border-[color:var(--border)] bg-white px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
      >
        Next
      </button>
    </div>
  );
}
