"use client";

import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type FoodType = "cooked" | "packaged" | "raw";
type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";

type FoodItemInput = {
  name: string;
  quantity: string;
  unit: string;
};

type Listing = {
  _id?: string;
  id?: string;
  foodItems: FoodItemInput[];
  totalQuantity: string;
  status: ListingStatus;
  expiresAt: string;
  createdAt: string;
};

const initialFoodItem: FoodItemInput = {
  name: "",
  quantity: "",
  unit: "",
};

const statusClasses: Record<ListingStatus, string> = {
  available: "bg-green-100 text-green-800",
  claimed: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  delivered: "bg-purple-100 text-purple-800",
  expired: "bg-red-100 text-red-800",
};

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function toDateTimeLocalValue(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function DonorDashboardClient({ donorName }: { donorName: string }) {
  const [showForm, setShowForm] = useState(false);
  const [foodItems, setFoodItems] = useState<FoodItemInput[]>([{ ...initialFoodItem }]);
  const [totalQuantity, setTotalQuantity] = useState("");
  const [foodType, setFoodType] = useState<FoodType>("cooked");
  const [expiresAt, setExpiresAt] = useState(toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [isFetchingListings, setIsFetchingListings] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [geoStatus, setGeoStatus] = useState<string | null>(null);

  async function loadListings() {
    setIsFetchingListings(true);

    try {
      const response = await fetch("/api/listings/my", { cache: "no-store" });
      const data = (await response.json()) as { listings?: Listing[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to load your listings.");
      }

      setListings(data.listings ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your listings.");
    } finally {
      setIsFetchingListings(false);
    }
  }

  useEffect(() => {
    void loadListings();
  }, []);

  function updateFoodItem(index: number, field: keyof FoodItemInput, value: string) {
    setFoodItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  }

  function addFoodItem() {
    setFoodItems((current) => [...current, { ...initialFoodItem }]);
  }

  function removeFoodItem(index: number) {
    setFoodItems((current) => (current.length === 1 ? current : current.filter((_, itemIndex) => itemIndex !== index)));
  }

  function resetForm() {
    setFoodItems([{ ...initialFoodItem }]);
    setTotalQuantity("");
    setFoodType("cooked");
    setExpiresAt(toDateTimeLocalValue(new Date(Date.now() + 2 * 60 * 60 * 1000)));
    setAddress("");
    setLat("");
    setLng("");
    setImageFiles([]);
    setUploadedImages([]);
    setGeoStatus(null);
  }

  async function uploadImages() {
    if (!imageFiles.length) {
      return uploadedImages;
    }

    setIsUploading(true);

    try {
      const urls = await Promise.all(
        imageFiles.map(async (file) => {
          const formData = new FormData();
          formData.append("image", file);

          const response = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          const data = (await response.json()) as { url?: string; error?: string };

          if (!response.ok || !data.url) {
            throw new Error(data.error || `Unable to upload ${file.name}.`);
          }

          return data.url;
        }),
      );

      setUploadedImages(urls);
      return urls;
    } finally {
      setIsUploading(false);
    }
  }

  function validateForm() {
    const hasValidItems = foodItems.every((item) => item.name.trim() && item.quantity.trim() && item.unit.trim());

    if (!hasValidItems) {
      return "Each food item needs a name, quantity, and unit.";
    }

    if (!totalQuantity.trim()) {
      return "Total quantity is required.";
    }

    if (!address.trim() || !lat.trim() || !lng.trim()) {
      return "Location address and coordinates are required.";
    }

    const expiry = new Date(expiresAt);
    if (Number.isNaN(expiry.getTime()) || expiry <= new Date()) {
      return "Pickup deadline must be in the future.";
    }

    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const imageUrls = await uploadImages();
      const response = await fetch("/api/listings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          foodItems,
          totalQuantity,
          foodType,
          expiresAt,
          images: imageUrls,
          location: {
            lat: Number(lat),
            lng: Number(lng),
            address,
          },
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Unable to create listing.");
      }

      setMessage("Surplus food listing created successfully.");
      resetForm();
      setShowForm(false);
      window.alert("Surplus food listing created successfully.");
      await loadListings();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Unable to create listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function detectLocation() {
    setGeoStatus(null);

    if (!("geolocation" in navigator)) {
      setGeoStatus("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(position.coords.latitude.toFixed(6));
        setLng(position.coords.longitude.toFixed(6));
        setGeoStatus("Coordinates captured. Add or refine the address below.");
      },
      () => {
        setGeoStatus("Unable to access your location. Enter the address and coordinates manually.");
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="overflow-hidden rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_24px_80px_rgba(24,35,15,0.08)] backdrop-blur">
          <div className="flex flex-col gap-6 border-b border-[color:var(--border)] px-6 py-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">Donor dashboard</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--foreground)] sm:text-5xl">
                Welcome back, {donorName}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-[color:var(--muted)] sm:text-base">
                Post surplus food with a clear pickup deadline, accurate location, and supporting photos so NGOs can respond quickly.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowForm((current) => !current)}
                className="rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]"
              >
                {showForm ? "Hide Form" : "Post Surplus Food"}
              </button>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="rounded-full border border-[color:var(--border)] bg-white/70 px-5 py-3 text-sm font-semibold text-[color:var(--foreground)] transition hover:bg-white"
              >
                Logout
              </button>
            </div>
          </div>

          {showForm ? (
            <form onSubmit={handleSubmit} className="grid gap-8 px-6 py-8 lg:grid-cols-[1.25fr_0.75fr] lg:px-10">
              <div className="space-y-6">
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Food details</h2>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">Break the listing into individual items so recipients know exactly what is available.</p>
                    </div>
                    <button
                      type="button"
                      onClick={addFoodItem}
                      className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-white"
                    >
                      Add Item
                    </button>
                  </div>

                  <div className="mt-5 space-y-4">
                    {foodItems.map((item, index) => (
                      <div key={`${index}-${item.name}`} className="grid gap-3 rounded-2xl border border-[color:var(--border)] bg-white/80 p-4 md:grid-cols-[1.3fr_1fr_0.9fr_auto] md:items-end">
                        <label className="text-sm font-medium text-[color:var(--foreground)]">
                          Food item
                          <input
                            value={item.name}
                            onChange={(event) => updateFoodItem(index, "name", event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none ring-0 transition focus:border-[color:var(--accent)]"
                            placeholder="Veg biryani"
                            required
                          />
                        </label>
                        <label className="text-sm font-medium text-[color:var(--foreground)]">
                          Quantity
                          <input
                            value={item.quantity}
                            onChange={(event) => updateFoodItem(index, "quantity", event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                            placeholder="20"
                            required
                          />
                        </label>
                        <label className="text-sm font-medium text-[color:var(--foreground)]">
                          Unit
                          <input
                            value={item.unit}
                            onChange={(event) => updateFoodItem(index, "unit", event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                            placeholder="meals"
                            required
                          />
                        </label>
                        <button
                          type="button"
                          onClick={() => removeFoodItem(index)}
                          className="rounded-full border border-[color:var(--border)] px-4 py-3 text-sm font-semibold text-[color:var(--muted)] transition hover:bg-stone-100"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-[color:var(--foreground)]">
                    Total quantity
                    <input
                      value={totalQuantity}
                      onChange={(event) => setTotalQuantity(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                      placeholder="20 meals"
                      required
                    />
                  </label>

                  <label className="text-sm font-medium text-[color:var(--foreground)]">
                    Food type
                    <select
                      value={foodType}
                      onChange={(event) => setFoodType(event.target.value as FoodType)}
                      className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white/80 px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                    >
                      <option value="cooked">Cooked</option>
                      <option value="packaged">Packaged</option>
                      <option value="raw">Raw</option>
                    </select>
                  </label>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
                  <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Pickup window</h2>
                  <label className="mt-4 block text-sm font-medium text-[color:var(--foreground)]">
                    Pickup deadline
                    <input
                      type="datetime-local"
                      value={expiresAt}
                      onChange={(event) => setExpiresAt(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                      required
                    />
                  </label>
                </div>

                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Pickup location</h2>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">Use your device location, then confirm the street address.</p>
                    </div>
                    <button
                      type="button"
                      onClick={detectLocation}
                      className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-white"
                    >
                      Use My Location
                    </button>
                  </div>

                  <label className="mt-4 block text-sm font-medium text-[color:var(--foreground)]">
                    Address
                    <input
                      value={address}
                      onChange={(event) => setAddress(event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                      placeholder="Pickup address"
                      required
                    />
                  </label>

                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="text-sm font-medium text-[color:var(--foreground)]">
                      Latitude
                      <input
                        value={lat}
                        onChange={(event) => setLat(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="12.971599"
                        required
                      />
                    </label>

                    <label className="text-sm font-medium text-[color:var(--foreground)]">
                      Longitude
                      <input
                        value={lng}
                        onChange={(event) => setLng(event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3 outline-none transition focus:border-[color:var(--accent)]"
                        placeholder="77.594566"
                        required
                      />
                    </label>
                  </div>

                  {geoStatus ? <p className="mt-3 text-sm text-[color:var(--muted)]">{geoStatus}</p> : null}
                </div>

                <div className="rounded-3xl border border-[color:var(--border)] bg-[color:var(--surface-strong)] p-5">
                  <h2 className="text-xl font-semibold text-[color:var(--foreground)]">Images</h2>
                  <p className="mt-1 text-sm text-[color:var(--muted)]">Upload one or more images. Files are sent to Cloudinary when you submit the listing.</p>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => setImageFiles(Array.from(event.target.files ?? []))}
                    className="mt-4 block w-full text-sm text-[color:var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-[color:var(--accent)] file:px-4 file:py-2 file:font-semibold file:text-white hover:file:bg-[color:var(--accent-strong)]"
                  />

                  {imageFiles.length ? (
                    <ul className="mt-4 space-y-2 text-sm text-[color:var(--muted)]">
                      {imageFiles.map((file) => (
                        <li key={file.name}>{file.name}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                {(error || message) && (
                  <div className={`rounded-2xl px-4 py-3 text-sm ${error ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                    {error || message}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="w-full rounded-full bg-[color:var(--accent)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? "Creating listing..." : isUploading ? "Uploading images..." : "Create Listing"}
                </button>
              </div>
            </form>
          ) : null}
        </section>

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_24px_80px_rgba(24,35,15,0.08)] backdrop-blur lg:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[color:var(--accent)]">My listings</p>
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--foreground)]">Past and active surplus food posts</h2>
            </div>
            <button
              type="button"
              onClick={() => void loadListings()}
              className="rounded-full border border-[color:var(--border)] px-4 py-2 text-sm font-semibold text-[color:var(--accent)] transition hover:bg-white"
            >
              Refresh
            </button>
          </div>

          {isFetchingListings ? (
            <div className="mt-6 rounded-3xl border border-dashed border-[color:var(--border)] bg-white/50 px-5 py-12 text-center text-sm text-[color:var(--muted)]">
              Loading your listings...
            </div>
          ) : listings.length ? (
            <div className="mt-6 grid gap-4 xl:grid-cols-2">
              {listings.map((listing) => (
                <article key={listing._id ?? listing.id} className="rounded-3xl border border-[color:var(--border)] bg-white/80 p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[color:var(--foreground)]">
                        {listing.foodItems.map((item) => item.name).join(", ")}
                      </h3>
                      <p className="mt-1 text-sm text-[color:var(--muted)]">Quantity: {listing.totalQuantity}</p>
                    </div>
                    <span className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${statusClasses[listing.status]}`}>
                      {listing.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="mt-5 grid gap-4 text-sm text-[color:var(--muted)] sm:grid-cols-2">
                    <div>
                      <p className="font-medium text-[color:var(--foreground)]">Food Items</p>
                      <ul className="mt-2 space-y-1">
                        {listing.foodItems.map((item, index) => (
                          <li key={`${listing._id ?? listing.id}-${index}`}>
                            {item.name}: {item.quantity} {item.unit}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-[color:var(--foreground)]">Expires At</p>
                        <p className="mt-1">{formatDateTime(listing.expiresAt)}</p>
                      </div>
                      <div>
                        <p className="font-medium text-[color:var(--foreground)]">Posted At</p>
                        <p className="mt-1">{formatDateTime(listing.createdAt)}</p>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-3xl border border-dashed border-[color:var(--border)] bg-white/50 px-5 py-12 text-center text-sm text-[color:var(--muted)]">
              No listings yet. Post your first surplus food listing to make it available for pickup.
            </div>
          )}
        </section>
      </div>
    </div>
  );
}