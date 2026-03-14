"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

import { getDistanceKm } from "@/lib/distance";

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
  const [isUpdating, setIsUpdating] = useState<Record<string, boolean>>({});
  const [toasts, setToasts] = useState<Toast[]>([]);

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
      const [tasksRes, myTasksRes] = await Promise.all([
        fetch("/api/listings/tasks", { cache: "no-store" }),
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
  }, []);

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

  async function handleStatusUpdate(taskId: string, newStatus: "picked_up" | "delivered") {
    setIsUpdating((s) => ({ ...s, [taskId]: true }));
    // Optimistic: update badge immediately
    setMyTasks((current) =>
      current.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t)),
    );

    try {
      const res = await fetch(`/api/listings/${taskId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = (await res.json()) as { listing?: Task; error?: string };
      if (!res.ok || !data.listing) throw new Error(data.error || "Failed to update status.");
      setMyTasks((current) => current.map((t) => (t._id === taskId ? (data.listing as Task) : t)));
      addToast(newStatus === "picked_up" ? "Marked as Picked Up." : "Marked as Delivered.", "success");
    } catch (err) {
      // Revert optimistic
      await loadAll();
      addToast(err instanceof Error ? err.message : "Failed to update status.", "error");
    } finally {
      setIsUpdating((s) => ({ ...s, [taskId]: false }));
    }
  }

  const activeTasks = myTasks.filter((t) => t.status === "claimed" || t.status === "picked_up");
  const completedTasks = myTasks.filter((t) => t.status === "delivered");

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
                            {volunteerLocation && task.location && (
                              <p className="mt-1 text-xs text-[color:var(--muted)]">
                                ~{getDistanceKm(volunteerLocation.lat, volunteerLocation.lng, task.location.lat, task.location.lng)} km away
                              </p>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-[color:var(--foreground)]">Drop-off at</p>
                            <p className="text-[color:var(--muted)]">
                              {task.claimedBy?.address ?? "NGO address not available"}
                            </p>
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
                      isUpdating={isUpdating[task._id] ?? false}
                      onStatusUpdate={handleStatusUpdate}
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
  isUpdating,
  onStatusUpdate,
}: {
  task: Task;
  isUpdating: boolean;
  onStatusUpdate: (id: string, status: "picked_up" | "delivered") => void;
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

      {task.status === "claimed" && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onStatusUpdate(task._id, "picked_up")}
          className="mt-4 w-full rounded-full bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? "Updating…" : "Mark as Picked Up"}
        </button>
      )}

      {task.status === "picked_up" && (
        <button
          type="button"
          disabled={isUpdating}
          onClick={() => onStatusUpdate(task._id, "delivered")}
          className="mt-4 w-full rounded-full bg-purple-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isUpdating ? "Updating…" : "Mark as Delivered"}
        </button>
      )}
    </article>
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
