"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import RouteMap, { getRouteMetrics } from "@/components/maps/RouteMap";

type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";

type Contact = {
  _id: string;
  name: string;
  phone: string;
  address: string;
  location?: { lat: number; lng: number };
};

type FoodItem = { name: string; quantity: string; unit: string };

type Task = {
  _id: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: string;
  expiresAt: string;
  status: ListingStatus;
  donorId?: Contact;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  claimedBy?: Contact;
  location: { lat: number; lng: number; address: string };
  volunteerAssignedAt?: string;
  pickedUpAt?: string;
  deliveredAt?: string;
  /** Distance from volunteer's current location to the donor pickup point (km). */
  distanceToPickup?: number;
  /** Distance from volunteer's current location to the NGO drop-off point (km). */
  distanceToDrop?: number;
};

type SessionUser = {
  id: string;
  name?: string | null;
  location?: { lat: number; lng: number };
};

type Tab = "available" | "active" | "completed";

const statusClasses: Record<ListingStatus, string> = {
  available: "bg-green-100 text-green-800",
  claimed: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  delivered: "bg-purple-100 text-purple-800",
  expired: "bg-red-100 text-red-800",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function getCountdownLabel(expiresAt: string) {
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return "Expired";
  const totalMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `Expires in ${hours}h ${minutes}m` : `Expires in ${minutes}m`;
}

type Toast = { id: number; message: string; type: "success" | "error" };

function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.type === "success" ? "bg-green-600 text-white" : "bg-red-600 text-white"
          }`}
        >
          {toast.message}
          <button type="button" onClick={() => onDismiss(toast.id)} className="ml-2 text-white/80 hover:text-white">
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

let toastId = 0;

export default function VolunteerDashboardClient({ sessionUser }: { sessionUser: SessionUser }) {
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [availableTasks, setAvailableTasks] = useState<Task[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [routeTask, setRouteTask] = useState<Task | null>(null);
  const [otpModal, setOtpModal] = useState<{ taskId: string; type: "pickup" | "delivery" } | null>(null);

  const volunteerLocation = sessionUser.location;

  function addToast(message: string, type: "success" | "error") {
    const id = ++toastId;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 4000);
  }

  function dismissToast(id: number) {
    setToasts((current) => current.filter((t) => t.id !== id));
  }

  const loadAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const tasksUrl = volunteerLocation
        ? `/api/listings/tasks?lat=${volunteerLocation.lat}&lng=${volunteerLocation.lng}`
        : "/api/listings/tasks";

      const [tasksRes, myTasksRes] = await Promise.all([
        fetch(tasksUrl, { cache: "no-store" }),
        fetch("/api/listings/my-tasks", { cache: "no-store" }),
      ]);
      const tasksData = (await tasksRes.json()) as { tasks?: Task[] };
      const myTasksData = (await myTasksRes.json()) as { tasks?: Task[] };
      setAvailableTasks(tasksData.tasks ?? []);
      setMyTasks(myTasksData.tasks ?? []);
    } catch {
      addToast("Unable to load tasks.", "error");
    } finally {
      setIsLoading(false);
    }
  }, [volunteerLocation]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  async function handleAcceptTask(taskId: string) {
    setIsAccepting((s) => ({ ...s, [taskId]: true }));
    // Optimistic: remove from available
    const taskSnapshot = availableTasks.find((t) => t._id === taskId);
    setAvailableTasks((current) => current.filter((t) => t._id !== taskId));

    try {
      const res = await fetch(`/api/listings/${taskId}/assign-volunteer`, { method: "POST" });
      const data = (await res.json()) as { listing?: Task; error?: string };
      if (!res.ok || !data.listing) throw new Error(data.error || "Failed to accept task.");
      setMyTasks((current) => [data.listing!, ...current]);
      addToast("Task accepted successfully.", "success");
    } catch (err) {
      if (taskSnapshot) setAvailableTasks((current) => [taskSnapshot, ...current]);
      addToast(err instanceof Error ? err.message : "Failed to accept task.", "error");
    } finally {
      setIsAccepting((s) => ({ ...s, [taskId]: false }));
    }
  }

  function handleOtpSuccess(taskId: string, newStatus: "picked_up" | "delivered") {
    setOtpModal(null);
    setMyTasks((current) =>
      current.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)),
    );
    addToast(
      newStatus === "picked_up"
        ? "Pickup confirmed! Head to the NGO for drop-off."
        : "Delivery confirmed! Great work.",
      "success",
    );
  }

  const activeTasks = myTasks.filter((t) => t.status === "claimed" || t.status === "picked_up");
  const completedTasks = myTasks.filter((t) => t.status === "delivered");
  const routeMetrics = routeTask && routeTask.claimedBy?.location
    ? getRouteMetrics(
      { lat: routeTask.location.lat, lng: routeTask.location.lng },
      {
        lat: routeTask.claimedBy.location.lat,
        lng: routeTask.claimedBy.location.lng,
      },
    )
    : null;

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        {/* Header */}
        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(24,35,15,0.08)] backdrop-blur lg:p-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">
                Volunteer dashboard
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-4xl">
                Pick up and deliver surplus food
              </h1>
            </div>
            <div className="flex gap-3">
              <Link
                href="/dashboard/volunteer/profile"
                className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold transition hover:bg-white"
              >
                Profile
              </Link>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold transition hover:bg-white"
              >
                Logout
              </button>
            </div>
          </div>

          {!volunteerLocation && (
            <div className="mt-5 rounded-2xl border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm text-yellow-900">
              Update your profile with your location to see distances to pickup locations.{" "}
              <Link href="/dashboard/volunteer/profile" className="font-semibold underline">
                Update profile
              </Link>
            </div>
          )}

          {/* Tabs */}
          <div className="mt-6 flex flex-wrap gap-3">
            {(["available", "active", "completed"] as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-5 py-2 text-sm font-semibold transition ${
                  activeTab === tab
                    ? "bg-[color:var(--accent)] text-white"
                    : "border border-[color:var(--border)] bg-white/70"
                }`}
              >
                {tab === "available" ? "Available Tasks" : tab === "active" ? "My Active Tasks" : "Completed"}
                {tab === "active" && activeTasks.length > 0 && (
                  <span className="ml-2 rounded-full bg-white/30 px-2 py-0.5 text-xs">{activeTasks.length}</span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={() => void loadAll()}
              className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-2 text-sm font-semibold transition hover:bg-white"
            >
              Refresh
            </button>
          </div>

          {/* Tab content */}
          <div className="mt-6">
            {isLoading ? (
              <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-white/40 px-6 py-12 text-center text-sm text-[color:var(--muted)]">
                Loading tasks…
              </div>
            ) : activeTab === "available" ? (
              availableTasks.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {availableTasks.map((task) => (
                    <article
                      key={task._id}
                      className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5 shadow-sm"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-full bg-[color:var(--surface-strong)] px-3 py-1 text-xs font-semibold uppercase text-[color:var(--accent)]">
                            {task.foodType}
                          </span>
                          <span className="text-xs text-[color:var(--muted)]">{getCountdownLabel(task.expiresAt)}</span>
                        </div>

                        <ul className="space-y-1 text-sm text-[color:var(--muted)]">
                          {task.foodItems.map((item, i) => (
                            <li key={`${task._id}-${i}`}>
                              {item.name}: {item.quantity} {item.unit}
                            </li>
                          ))}
                        </ul>

                        <div className="rounded-2xl bg-[color:var(--surface-strong)] p-3 text-sm space-y-2">
                          <div>
                            <p className="font-medium text-[color:var(--foreground)]">Pickup from</p>
                            <p className="text-[color:var(--muted)]">{task.donorId?.name ?? task.donorName}</p>
                            <p className="text-[color:var(--muted)]">{task.location.address}</p>
                            {task.distanceToPickup !== undefined ? (
                              <p className="mt-1 text-xs text-[color:var(--muted)]">
                                ~{task.distanceToPickup} km to pickup
                              </p>
                            ) : null}
                          </div>
                          <div>
                            <p className="font-medium text-[color:var(--foreground)]">Drop-off at</p>
                            <p className="text-[color:var(--muted)]">
                              {task.claimedBy?.address ?? "NGO address not available"}
                            </p>
                            {task.distanceToDrop !== undefined ? (
                              <p className="mt-1 text-xs text-[color:var(--muted)]">
                                ~{task.distanceToDrop} km to drop-off
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isAccepting[task._id]}
                          onClick={() => void handleAcceptTask(task._id)}
                          className="w-full rounded-full bg-[color:var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isAccepting[task._id] ? "Accepting…" : "Accept Task"}
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <EmptyState text="No tasks available for pickup right now." />
              )
            ) : activeTab === "active" ? (
              activeTasks.length ? (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {activeTasks.map((task) => (
                    <ActiveTaskCard
                      key={task._id}
                      task={task}
                      onOpenOtp={(type) => setOtpModal({ taskId: task._id, type })}
                      onViewRoute={(selectedTask) => setRouteTask(selectedTask)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState text="You have no active tasks. Accept a task from Available Tasks." />
              )
            ) : completedTasks.length ? (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {completedTasks.map((task) => (
                  <CompletedTaskCard key={task._id} task={task} />
                ))}
              </div>
            ) : (
              <EmptyState text="No completed deliveries yet." />
            )}
          </div>
        </section>
      </div>

      {otpModal && (
        <OtpVerifyModal
          taskId={otpModal.taskId}
          type={otpModal.type}
          onSuccess={(newStatus) => handleOtpSuccess(otpModal.taskId, newStatus)}
          onClose={() => setOtpModal(null)}
        />
      )}

      {routeTask ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-4xl rounded-3xl bg-white p-6">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-semibold text-[color:var(--foreground)]">Route: Pickup to Drop-off</h3>
                <p className="text-sm text-[color:var(--muted)]">
                  {routeMetrics ? `Distance ${routeMetrics.distanceKm.toFixed(2)} km · ETA ${routeMetrics.etaLabel}` : "Route details"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRouteTask(null)}
                className="rounded-full border border-[color:var(--border)] px-3 py-1.5 text-sm"
              >
                Close
              </button>
            </div>

            {routeTask.claimedBy?.location ? (
              <RouteMap
                pickup={{ lat: routeTask.location.lat, lng: routeTask.location.lng, label: `${routeTask.donorName} (Pickup)` }}
                dropoff={{
                  lat: routeTask.claimedBy.location.lat,
                  lng: routeTask.claimedBy.location.lng,
                  label: `${routeTask.claimedBy.name} (Drop-off)`,
                }}
                volunteer={volunteerLocation}
              />
            ) : (
              <div className="rounded-2xl border border-dashed border-[color:var(--border)] bg-stone-50 px-6 py-10 text-center text-sm text-[color:var(--muted)]">
                <p className="font-semibold text-[color:var(--foreground)]">Pickup location only</p>
                <p className="mt-1">{routeTask.location.address}</p>
                <p className="mt-2">NGO drop-off coordinates not set — ask the NGO to update their profile.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--border)] bg-white/40 px-6 py-12 text-center text-sm text-[color:var(--muted)]">
      {text}
    </div>
  );
}

function ActiveTaskCard({
  task,
  onOpenOtp,
  onViewRoute,
}: {
  task: Task;
  onOpenOtp: (type: "pickup" | "delivery") => void;
  onViewRoute: (task: Task) => void;
}) {
  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[color:var(--foreground)]">
          {task.foodItems.map((i) => i.name).join(", ")}
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses[task.status]}`}>
          {task.status.replace("_", " ")}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-[color:var(--muted)]">
        <div>
          <span className="font-medium text-[color:var(--foreground)]">Donor: </span>
          {task.donorId?.name ?? task.donorName} · {task.donorId?.phone ?? task.donorPhone}
        </div>
        <div>
          <span className="font-medium text-[color:var(--foreground)]">NGO: </span>
          {task.claimedBy?.name ?? "—"} · {task.claimedBy?.phone ?? "—"}
        </div>
        <div>
          <span className="font-medium text-[color:var(--foreground)]">Expires: </span>
          {formatDateTime(task.expiresAt)}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onViewRoute(task)}
        className="mt-4 w-full rounded-full border border-[color:var(--border)] bg-white px-4 py-2.5 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-stone-50"
      >
        View Route
      </button>

      {task.status === "claimed" && (
        <button
          type="button"
          onClick={() => onOpenOtp("pickup")}
          className="mt-3 w-full rounded-full bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600"
        >
          Mark as Picked Up
        </button>
      )}

      {task.status === "picked_up" && (
        <button
          type="button"
          onClick={() => onOpenOtp("delivery")}
          className="mt-3 w-full rounded-full bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-600"
        >
          Mark as Delivered
        </button>
      )}
    </article>
  );
}

function OtpVerifyModal({
  taskId,
  type,
  onSuccess,
  onClose,
}: {
  taskId: string;
  type: "pickup" | "delivery";
  onSuccess: (newStatus: "picked_up" | "delivered") => void;
  onClose: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const inputRefs = useState(() => Array.from({ length: 6 }, () => ({ current: null as HTMLInputElement | null })))[0];

  const isPickup = type === "pickup";
  const party = isPickup ? "Donor" : "NGO";
  const code = digits.join("");

  function handleDigit(index: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < 5) {
      inputRefs[index + 1].current?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(""));
      inputRefs[5].current?.focus();
    }
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId: taskId, code, type }),
      });
      const data = (await res.json()) as { status?: string; error?: string; attemptsLeft?: number };
      if (!res.ok) {
        setError(data.error ?? "Verification failed.");
        if (typeof data.attemptsLeft === "number") setAttemptsLeft(data.attemptsLeft);
        setDigits(["", "", "", "", "", ""]);
        inputRefs[0].current?.focus();
        return;
      }
      onSuccess(data.status as "picked_up" | "delivered");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-[color:var(--accent)]">
              OTP Verification
            </p>
            <h2 className="mt-1 text-lg font-semibold text-[color:var(--foreground)]">
              {isPickup ? "Confirm Pickup" : "Confirm Delivery"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-[color:var(--border)] px-3 py-1 text-sm text-[color:var(--muted)] hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>

        <p className="mb-6 text-sm text-[color:var(--muted)]">
          Ask the <span className="font-semibold text-[color:var(--foreground)]">{party}</span> to show
          you their OTP and enter it below to confirm{" "}
          {isPickup ? "you have collected the food." : "the food has been delivered."}
        </p>

        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-5 flex justify-center gap-2" onPaste={handlePaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs[i].current = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleDigit(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-10 rounded-xl border-2 border-[color:var(--border)] bg-stone-50 text-center text-xl font-bold text-[color:var(--foreground)] outline-none transition focus:border-[color:var(--accent)] focus:bg-white"
              />
            ))}
          </div>

          {error && (
            <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
              {attemptsLeft !== null && attemptsLeft > 0 && (
                <span className="ml-1 font-semibold">({attemptsLeft} attempt{attemptsLeft === 1 ? "" : "s"} left)</span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={code.length !== 6 || loading}
            className="w-full rounded-full bg-[color:var(--accent)] py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Verifying…" : `Confirm ${isPickup ? "Pickup" : "Delivery"}`}
          </button>
        </form>
      </div>
    </div>
  );
}

function CompletedTaskCard({ task }: { task: Task }) {
  return (
    <article className="rounded-3xl border border-[color:var(--border)] bg-white/85 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold text-[color:var(--foreground)]">
          {task.foodItems.map((i) => i.name).join(", ")}
        </h3>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses[task.status]}`}>
          {task.status}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm text-[color:var(--muted)]">
        <div>
          <span className="font-medium text-[color:var(--foreground)]">Donor: </span>
          {task.donorId?.name ?? task.donorName}
        </div>
        <div>
          <span className="font-medium text-[color:var(--foreground)]">NGO: </span>
          {task.claimedBy?.name ?? "—"}
        </div>
        {task.deliveredAt && (
          <div>
            <span className="font-medium text-[color:var(--foreground)]">Delivered at: </span>
            {formatDateTime(task.deliveredAt)}
          </div>
        )}
      </div>
    </article>
  );
}
