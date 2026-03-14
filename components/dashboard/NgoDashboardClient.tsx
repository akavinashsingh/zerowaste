"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { useMemo, useState, useEffect } from "react";

import { getDistanceKm } from "@/lib/distance";

type FoodTypeFilter = "all" | "cooked" | "packaged" | "raw";
type SortMode = "newest" | "expiring";
type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";

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

const statusClasses: Record<ListingStatus, string> = {
  available: "bg-green-100 text-green-800",
  claimed: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  delivered: "bg-purple-100 text-purple-800",
  expired: "bg-red-100 text-red-800",
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
  const [activeTab, setActiveTab] = useState<"available" | "claims">("available");
  const [availableListings, setAvailableListings] = useState<Listing[]>([]);
  const [claimedListings, setClaimedListings] = useState<Listing[]>([]);
  const [filterFoodType, setFilterFoodType] = useState<FoodTypeFilter>("all");
  const [sortMode, setSortMode] = useState<SortMode>("newest");
  const [isLoading, setIsLoading] = useState(true);
  const [isClaimLoading, setIsClaimLoading] = useState<Record<string, boolean>>({});
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  const ngoLocation = sessionUser.location;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(Date.now());
    }, 60000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  async function loadListings() {
    setIsLoading(true);
    setError(null);

    try {
      const [availableRes, claimedRes] = await Promise.all([
        fetch("/api/listings", { cache: "no-store" }),
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

      setAvailableListings(availableData.listings ?? []);
      setClaimedListings(claimedData.listings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load listings.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  const filteredAvailableListings = useMemo(() => {
    const base = [...availableListings].filter((listing) => (filterFoodType === "all" ? true : listing.foodType === filterFoodType));

    if (sortMode === "expiring") {
      return base.sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
    }

    return base.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [availableListings, filterFoodType, sortMode]);

  async function handleClaimListing(listingId: string) {
    setIsClaimLoading((state) => ({ ...state, [listingId]: true }));
    setError(null);
    setBannerMessage(null);

    const listingExists = availableListings.some((item) => item._id === listingId);

    if (!listingExists) {
      setIsClaimLoading((state) => ({ ...state, [listingId]: false }));
      return;
    }

    try {
      const response = await fetch(`/api/listings/${listingId}/claim`, {
        method: "POST",
      });

      const data = (await response.json()) as { listing?: Listing; error?: string };

      if (!response.ok || !data.listing) {
        throw new Error(data.error || "Unable to claim listing.");
      }

      setAvailableListings((current) =>
        current.map((item) => (item._id === listingId ? { ...item, status: "claimed" } : item)),
      );
      setClaimedListings((current) => [data.listing, ...current]);
      setBannerMessage("Listing claimed successfully.");

      window.setTimeout(() => {
        setAvailableListings((current) => current.filter((item) => item._id !== listingId));
      }, 700);
    } catch (claimError) {
      setAvailableListings((current) =>
        current.map((item) => (item._id === listingId ? { ...item, status: "available" } : item)),
      );
      setError(claimError instanceof Error ? claimError.message : "Unable to claim listing.");
    } finally {
      setIsClaimLoading((state) => ({ ...state, [listingId]: false }));
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(24,35,15,0.08)] backdrop-blur lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">NGO dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
                Browse and claim surplus food quickly
              </h1>
            </div>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-white"
            >
              Logout
            </button>
          </div>

          {!ngoLocation ? (
            <div className="mt-5 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
              Please update your profile with your location to see distance from donors.
              <Link href="/dashboard/ngo/profile" className="ml-2 font-semibold underline">
                Update profile
              </Link>
            </div>
          ) : null}

          {(error || bannerMessage) && (
            <div className={`mt-5 rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
              {error || bannerMessage}
            </div>
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setActiveTab("available")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "available" ? "bg-[color:var(--accent)] text-white" : "border border-[color:var(--border)] bg-white/70"
              }`}
            >
              Available Listings
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("claims")}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                activeTab === "claims" ? "bg-[color:var(--accent)] text-white" : "border border-[color:var(--border)] bg-white/70"
              }`}
            >
              My Claims
            </button>
            <button
              type="button"
              onClick={() => void loadListings()}
              className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-2 text-sm font-semibold transition hover:bg-white"
            >
              Refresh
            </button>
          </div>

          {activeTab === "available" ? (
            <>
              <div className="mt-6 grid gap-4 rounded-3xl border border-[color:var(--border)] bg-white/70 p-4 md:grid-cols-2 lg:grid-cols-3">
                <label className="text-sm font-medium text-[color:var(--foreground)]">
                  Filter by food type
                  <select
                    value={filterFoodType}
                    onChange={(event) => setFilterFoodType(event.target.value as FoodTypeFilter)}
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  >
                    <option value="all">All</option>
                    <option value="cooked">Cooked</option>
                    <option value="packaged">Packaged</option>
                    <option value="raw">Raw</option>
                  </select>
                </label>
                <label className="text-sm font-medium text-[color:var(--foreground)]">
                  Sort by
                  <select
                    value={sortMode}
                    onChange={(event) => setSortMode(event.target.value as SortMode)}
                    className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  >
                    <option value="newest">Newest</option>
                    <option value="expiring">Expiring Soon</option>
                  </select>
                </label>
              </div>

              {isLoading ? (
                <div className="mt-6 rounded-3xl border border-dashed border-[color:var(--border)] bg-white/40 px-6 py-12 text-center text-sm text-[color:var(--muted)]">
                  Loading available listings...
                </div>
              ) : filteredAvailableListings.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {filteredAvailableListings.map((listing) => (
                    <article key={listing._id} className="overflow-hidden rounded-3xl border border-[color:var(--border)] bg-white/85 shadow-sm">
                      {listing.images[0] ? (
                        <Image
                          src={listing.images[0]}
                          alt="Listing"
                          width={640}
                          height={320}
                          className="h-44 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-44 items-center justify-center bg-stone-100 text-sm text-[color:var(--muted)]">No image uploaded</div>
                      )}
                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg font-semibold text-[color:var(--foreground)]">{listing.donorName}</h3>
                            <p className="mt-1 text-sm text-[color:var(--muted)]">{listing.donorAddress}</p>
                          </div>
                          <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold uppercase text-[color:var(--accent)]">
                            {listing.foodType}
                          </span>
                        </div>

                        <ul className="space-y-1 text-sm text-[color:var(--muted)]">
                          {listing.foodItems.map((item, index) => (
                            <li key={`${listing._id}-item-${index}`}>
                              {item.name}: {item.quantity} {item.unit}
                            </li>
                          ))}
                        </ul>

                        <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3 text-sm text-[color:var(--foreground)]">
                          <p className="font-medium">{getCountdownLabel(listing.expiresAt, now)}</p>
                          <p className="mt-1 text-xs text-[color:var(--muted)]">Pickup deadline: {formatDateTime(listing.expiresAt)}</p>
                          {ngoLocation ? (
                            <p className="mt-1 text-xs text-[color:var(--muted)]">
                              Distance: {getDistanceKm(ngoLocation.lat, ngoLocation.lng, listing.location.lat, listing.location.lng)} km
                            </p>
                          ) : null}
                        </div>

                        <button
                          type="button"
                          disabled={isClaimLoading[listing._id] || listing.status !== "available"}
                          onClick={() => void handleClaimListing(listing._id)}
                          className="w-full rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isClaimLoading[listing._id]
                            ? "Claiming..."
                            : listing.status === "claimed"
                              ? "Claimed ✓"
                              : "Claim"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-[color:var(--border)] bg-white/40 px-6 py-12 text-center text-sm text-[color:var(--muted)]">
                  No available listings match your filters.
                </div>
              )}
            </>
          ) : (
            <>
              {isLoading ? (
                <div className="mt-6 rounded-3xl border border-dashed border-[color:var(--border)] bg-white/40 px-6 py-12 text-center text-sm text-[color:var(--muted)]">
                  Loading your claimed listings...
                </div>
              ) : claimedListings.length ? (
                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {claimedListings.map((listing) => (
                    <article key={listing._id} className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
                          {listing.foodItems.map((item) => item.name).join(", ")}
                        </h3>
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses[listing.status]}`}>
                          {listing.status.replace("_", " ")}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3 text-sm text-[color:var(--muted)]">
                        <div>
                          <p className="font-medium text-[color:var(--foreground)]">Donor Contact</p>
                          <p>{listing.donorId?.name ?? listing.donorName}</p>
                          <p>{listing.donorId?.phone ?? listing.donorPhone}</p>
                        </div>
                        <div>
                          <p className="font-medium text-[color:var(--foreground)]">Volunteer Assigned</p>
                          <p>
                            {listing.assignedVolunteer
                              ? `${listing.assignedVolunteer.name} (${listing.assignedVolunteer.phone})`
                              : "Not assigned yet"}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium text-[color:var(--foreground)]">Pickup deadline</p>
                          <p>{formatDateTime(listing.expiresAt)}</p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="mt-6 rounded-3xl border border-dashed border-[color:var(--border)] bg-white/40 px-6 py-12 text-center text-sm text-[color:var(--muted)]">
                  You have not claimed any listings yet.
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}