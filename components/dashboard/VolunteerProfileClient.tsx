"use client";

import Link from "next/link";
import { useState } from "react";

type SessionUser = {
  name?: string | null;
  phone?: string;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  isAvailable?: boolean;
};

export default function VolunteerProfileClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [name, setName] = useState(sessionUser.name ?? "");
  const [phone, setPhone] = useState(sessionUser.phone ?? "");
  const [address, setAddress] = useState(sessionUser.address ?? "");
  const [lat, setLat] = useState(sessionUser.location?.lat ? String(sessionUser.location.lat) : "");
  const [lng, setLng] = useState(sessionUser.location?.lng ? String(sessionUser.location.lng) : "");
  const [isAvailable, setIsAvailable] = useState(sessionUser.isAvailable !== false);
  const [availabilityMsg, setAvailabilityMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleAvailability() {
    const next = !isAvailable;
    setIsAvailable(next);
    setAvailabilityMsg(null);
    try {
      const res = await fetch("/api/volunteer/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isAvailable: next }),
      });
      if (!res.ok) throw new Error();
      setAvailabilityMsg(next ? "You are now available for tasks." : "You are now offline.");
    } catch {
      setIsAvailable(!next); // revert
      setAvailabilityMsg("Failed to update availability. Please try again.");
    }
  }

  function fillFromGeolocation() {
    setMessage(null);
    setError(null);

    if (!("geolocation" in navigator)) {
      setError("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
      },
      () => {
        setError("Unable to detect your location. Please enter coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!name.trim() || !phone.trim() || !address.trim() || !lat.trim() || !lng.trim()) {
      setError("All fields are required.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
          address,
          location: {
            lat: Number(lat),
            lng: Number(lng),
          },
          isAvailable,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to update profile.");
      }

      setMessage("Profile updated successfully. Refresh the dashboard to update session location state.");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to update profile.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(24,35,15,0.08)] backdrop-blur lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">Volunteer profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-[color:var(--foreground)]">Complete your profile details</h1>
          </div>
          <Link
            href="/dashboard/volunteer"
            className="rounded-full border border-[color:var(--border)] bg-white/70 px-4 py-2 text-sm font-semibold transition hover:bg-white"
          >
            Back to dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-5">
          <label className="block text-sm font-medium text-[color:var(--foreground)]">
            Name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              required
            />
          </label>

          <label className="block text-sm font-medium text-[color:var(--foreground)]">
            Phone
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              required
            />
          </label>

          <label className="block text-sm font-medium text-[color:var(--foreground)]">
            Address
            <input
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
              required
            />
          </label>

          <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-[color:var(--foreground)]">Location coordinates</p>
              <button
                type="button"
                onClick={fillFromGeolocation}
                className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-white"
              >
                Use My Location
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-[color:var(--foreground)]">
                Latitude
                <input
                  value={lat}
                  onChange={(event) => setLat(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  required
                />
              </label>
              <label className="text-sm font-medium text-[color:var(--foreground)]">
                Longitude
                <input
                  value={lng}
                  onChange={(event) => setLng(event.target.value)}
                  className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                  required
                />
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-[color:var(--border)] bg-white/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[color:var(--foreground)]">Available for tasks</p>
                <p className="text-xs text-[color:var(--muted)] mt-0.5">
                  {isAvailable ? "You will be assigned new pickups" : "You will not receive new task assignments"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void toggleAvailability()}
                className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                  isAvailable ? "bg-[color:var(--accent)]" : "bg-gray-300"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                    isAvailable ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
            {availabilityMsg && (
              <p className="mt-2 text-xs text-[color:var(--muted)]">{availabilityMsg}</p>
            )}
          </div>

          {(error || message) && (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}
            >
              {error || message}
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full rounded-full bg-[color:var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Profile"}
          </button>
        </form>
      </div>
    </div>
  );
}
