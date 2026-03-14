"use client";

import dynamic from "next/dynamic";
import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";

import { getMapTileUrl, getMarkerIcon } from "@/lib/mapHelpers";

type Listing = {
  _id: string;
  donorName: string;
  status: "available" | "claimed" | "picked_up" | "delivered" | "expired";
  foodItems: Array<{ name: string; quantity: string; unit: string }>;
  location?: { lat?: number; lng?: number; address?: string };
  claimedBy?: { name?: string };
  assignedVolunteer?: { name?: string };
};

type Person = {
  _id: string;
  name: string;
  role: "ngo" | "volunteer";
  location?: { lat: number; lng: number };
};

type Props = {
  listings: Listing[];
  ngos: Person[];
  volunteers: Person[];
};

function AdminLiveMapInner({ listings, ngos, volunteers }: Props) {
  const listingMarkers = listings.filter(
    (listing) => typeof listing.location?.lat === "number" && typeof listing.location?.lng === "number",
  );

  const ngoMarkers = ngos.filter((ngo) => typeof ngo.location?.lat === "number" && typeof ngo.location?.lng === "number");
  const volunteerMarkers = volunteers.filter(
    (volunteer) => typeof volunteer.location?.lat === "number" && typeof volunteer.location?.lng === "number",
  );

  return (
    <MapContainer center={[20.5937, 78.9629]} zoom={5} className="h-[520px] w-full rounded-3xl" scrollWheelZoom>
      <TileLayer
        url={getMapTileUrl()}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {listingMarkers.map((listing) => (
        <Marker
          key={`listing-${listing._id}`}
          position={[listing.location!.lat!, listing.location!.lng!]}
          icon={getMarkerIcon("donor")}
        >
          <Popup>
            <div className="space-y-1 text-xs">
              <p className="font-semibold text-stone-900">Listing: {listing.donorName}</p>
              <p className="text-stone-600">Status: {listing.status.replace("_", " ")}</p>
              <p className="text-stone-600">Food: {listing.foodItems.map((item) => item.name).join(", ") || "-"}</p>
              <p className="text-stone-600">Address: {listing.location?.address || "-"}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {ngoMarkers.map((ngo) => (
        <Marker key={`ngo-${ngo._id}`} position={[ngo.location!.lat, ngo.location!.lng]} icon={getMarkerIcon("ngo")}>
          <Popup>
            <div className="text-xs">
              <p className="font-semibold text-stone-900">NGO: {ngo.name}</p>
            </div>
          </Popup>
        </Marker>
      ))}

      {volunteerMarkers.map((volunteer) => (
        <Marker
          key={`vol-${volunteer._id}`}
          position={[volunteer.location!.lat, volunteer.location!.lng]}
          icon={getMarkerIcon("volunteer")}
        >
          <Popup>
            <div className="text-xs">
              <p className="font-semibold text-stone-900">Volunteer: {volunteer.name}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

const AdminLiveMap = dynamic(async () => AdminLiveMapInner, { ssr: false });

export default AdminLiveMap;
