"use client";

import dynamic from "next/dynamic";
import { CircleMarker, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";

import { getMapTileUrl, getMarkerIcon } from "@/lib/mapHelpers";

type Props = {
  lat?: number;
  lng?: number;
  onPick: (coords: { lat: number; lng: number }) => void;
};

function PickerEvents({ onPick }: { onPick: (coords: { lat: number; lng: number }) => void }) {
  useMapEvents({
    click(event) {
      onPick({ lat: event.latlng.lat, lng: event.latlng.lng });
    },
  });

  return null;
}

function LocationPickerMapInner({ lat, lng, onPick }: Props) {
  const hasLocation = typeof lat === "number" && typeof lng === "number";
  const center: [number, number] = hasLocation ? [lat!, lng!] : [20.5937, 78.9629];

  return (
    <MapContainer center={center} zoom={hasLocation ? 13 : 5} className="h-64 w-full rounded-3xl" scrollWheelZoom>
      <TileLayer
        url={getMapTileUrl()}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <PickerEvents onPick={onPick} />

      {hasLocation ? (
        <>
          <Marker position={[lat!, lng!]} icon={getMarkerIcon("donor")} />
          <CircleMarker
            center={[lat!, lng!]}
            radius={8}
            pathOptions={{ color: "#ef4444", fillColor: "#f87171", fillOpacity: 0.8 }}
          />
        </>
      ) : null}
    </MapContainer>
  );
}

const LocationPickerMap = dynamic(async () => LocationPickerMapInner, { ssr: false });

export default LocationPickerMap;
