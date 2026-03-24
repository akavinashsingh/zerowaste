"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";

type FoodItem = { name: string; quantity: string; unit: string };

type Listing = {
  _id: string;
  donorName: string;
  donorPhone: string;
  donorAddress: string;
  foodItems: FoodItem[];
  totalQuantity: string;
  foodType: "cooked" | "packaged" | "raw";
  expiresAt: string;
  images: string[];
  location: { lat: number; lng: number; address: string };
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  claimedBy?: string;
  claimedAt?: string;
  distanceKm?: number;
  createdAt: string;
};

interface Props {
  listing: Listing;
  onClose: () => void;
  onClaimed: (claimedListing: Listing) => void;
}

export default function ClaimQuantityModal({ listing, onClose, onClaimed }: Props) {
  const [quantities, setQuantities] = useState<Record<number, string>>(
    Object.fromEntries(listing.foodItems.map((item, i) => [i, item.quantity])),
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setQty(index: number, value: string) {
    setQuantities((prev) => ({ ...prev, [index]: value }));
  }

  async function handleClaim() {
    setError(null);
    setIsSubmitting(true);
    try {
      const claimedItems = listing.foodItems.map((item, i) => ({
        name: item.name,
        quantity: (quantities[i] ?? item.quantity).trim() || item.quantity,
        unit: item.unit,
      }));

      const res = await fetch(`/api/listings/${listing._id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimedItems }),
      });

      const data = (await res.json()) as { listing?: Listing; error?: string };

      if (!res.ok || !data.listing) {
        throw new Error(data.error ?? "Unable to claim listing.");
      }

      onClaimed(data.listing);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to claim listing.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Select Quantities to Claim" size="md">
      <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
        <p style={{ fontSize: "0.83rem", color: "#6b6560", marginBottom: "1.25rem", marginTop: 0 }}>
          From <strong>{listing.donorName}</strong> — adjust how much of each item you need. Leave unchanged to claim the full amount.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.25rem" }}>
          {listing.foodItems.map((item, i) => (
            <div
              key={`${listing._id}-item-${i}`}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 120px",
                alignItems: "center",
                gap: "0.75rem",
                background: "#f6f4f0",
                borderRadius: 12,
                padding: "0.65rem 0.9rem",
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "#2c2820" }}>{item.name}</div>
                <div style={{ fontSize: "0.72rem", color: "#8a837d", marginTop: 2 }}>
                  Available: {item.quantity} {item.unit}
                </div>
              </div>
              <span
                style={{
                  background: "#dbeafe",
                  color: "#1e40af",
                  borderRadius: 8,
                  padding: "2px 8px",
                  fontSize: "0.7rem",
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {item.unit}
              </span>
              <input
                type="text"
                value={quantities[i] ?? item.quantity}
                onChange={(e) => setQty(i, e.target.value)}
                placeholder={item.quantity}
                style={{
                  height: 36,
                  borderRadius: 10,
                  border: "1.5px solid rgba(44,40,32,0.15)",
                  background: "#fff",
                  padding: "0 0.6rem",
                  fontSize: "0.85rem",
                  color: "#2c2820",
                  width: "100%",
                }}
              />
            </div>
          ))}
        </div>

        {error && (
          <div
            style={{
              background: "#fee2e2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              borderRadius: 10,
              padding: "8px 12px",
              fontSize: "0.8rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.6rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              border: "1.5px solid rgba(44,40,32,0.15)",
              background: "#fff",
              color: "#6b6560",
              borderRadius: 12,
              padding: "0.6rem 1.1rem",
              fontSize: "0.84rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleClaim()}
            disabled={isSubmitting}
            style={{
              border: "none",
              background: "#1e40af",
              color: "#fff",
              borderRadius: 12,
              padding: "0.6rem 1.25rem",
              fontSize: "0.84rem",
              fontWeight: 700,
              cursor: isSubmitting ? "not-allowed" : "pointer",
              opacity: isSubmitting ? 0.65 : 1,
            }}
          >
            {isSubmitting ? "Claiming…" : "Confirm & Claim"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
