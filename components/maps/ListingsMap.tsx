"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Circle, CircleMarker, MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import { getMapTileUrl, getMarkerIcon } from "@/lib/mapHelpers";

type ListingStatus = "available" | "claimed" | "picked_up" | "delivered" | "expired";

type FoodItem = {
  name: string;
  quantity: string;
  unit: string;
};

export type MapListing = {
  _id: string;
  donorName: string;
  foodItems: FoodItem[];
  expiresAt: string;
  status: ListingStatus;
  location?: {
    lat: number;
    lng: number;
    address?: string;
  };
};

type Props = {
  listings: MapListing[];
  userLocation?: { lat: number; lng: number };
  onListingClick?: (listing: MapListing) => void;
};

const statusClassMap: Record<ListingStatus, string> = {
  available: "bg-green-100 text-green-800",
  claimed: "bg-yellow-100 text-yellow-800",
  picked_up: "bg-blue-100 text-blue-800",
  delivered: "bg-emerald-100 text-emerald-800",
  expired: "bg-red-100 text-red-800",
};

function formatExpiry(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function ListingsMapInner({ listings, userLocation, onListingClick }: Props) {
  const center = userLocation ? [userLocation.lat, userLocation.lng] as [number, number] : [20.5937, 78.9629] as [number, number];

  const validListings = useMemo(
    () => listings.filter((listing) => listing.location && Number.isFinite(listing.location.lat) && Number.isFinite(listing.location.lng)),
    [listings],
  );

  return (
    <MapContainer center={center} zoom={userLocation ? 11 : 5} className="h-[460px] w-full rounded-3xl" scrollWheelZoom>
      <TileLayer
        url={getMapTileUrl()}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {userLocation ? (
        <>
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={9}
            pathOptions={{ color: "#0ea5e9", fillColor: "#38bdf8", fillOpacity: 0.9 }}
          />
          <Circle center={[userLocation.lat, userLocation.lng]} radius={10000} pathOptions={{ color: "#0ea5e9", dashArray: "6 6" }} />
        </>
      ) : null}

      {validListings.map((listing) => {
        const loc = listing.location!;
        const itemSummary = listing.foodItems.slice(0, 3).map((item) => `${item.name} (${item.quantity} ${item.unit})`).join(", ");
        const buttonText = listing.status === "available" ? "Claim" : "View";

        return (
          <Marker key={listing._id} position={[loc.lat, loc.lng]} icon={getMarkerIcon("donor")}>
            <Popup>
              <div className="space-y-2 min-w-[220px]">
                <p className="text-sm font-semibold text-stone-900">{listing.donorName}</p>
                <p className="text-xs text-stone-600">{itemSummary || "No food item details"}</p>
                <p className="text-xs text-stone-600">Expiry: {formatExpiry(listing.expiresAt)}</p>
                <span className={`inline-block rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusClassMap[listing.status]}`}>
                  {listing.status.replace("_", " ")}
                </span>
                <div>
                  <button
                    type="button"
                    onClick={() => onListingClick?.(listing)}
                    className="mt-1 rounded-lg bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {buttonText}
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

const ListingsMap = dynamic(async () => ListingsMapInner, { ssr: false });

export default ListingsMap;
