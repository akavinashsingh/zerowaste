"use client";

import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import { getMapTileUrl, getMarkerIcon } from "@/lib/mapHelpers";
import { getRouteMetrics } from "@/lib/routeMetrics";

type Point = {
  lat: number;
  lng: number;
  label: string;
};

export type RouteMapProps = {
  pickup: Point;
  dropoff: Point;
  volunteer?: { lat: number; lng: number };
};

function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();
  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((p) => [p.lat, p.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);
  return null;
}

export default function RouteMapInner({ pickup, dropoff, volunteer }: RouteMapProps) {
  const metrics = getRouteMetrics(pickup, dropoff);
  const allPoints = volunteer ? [pickup, dropoff, volunteer] : [pickup, dropoff];

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
        Distance: {metrics.distanceKm.toFixed(2)} km · ETA @ 30 km/h: {metrics.etaLabel}
      </div>

      <MapContainer
        center={[pickup.lat, pickup.lng]}
        zoom={12}
        className="h-[420px] w-full rounded-3xl"
        scrollWheelZoom
      >
        <TileLayer
          url={getMapTileUrl()}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />

        <Marker position={[pickup.lat, pickup.lng]} icon={getMarkerIcon("donor")}>
          <Popup>{pickup.label}</Popup>
        </Marker>

        <Marker position={[dropoff.lat, dropoff.lng]} icon={getMarkerIcon("ngo")}>
          <Popup>{dropoff.label}</Popup>
        </Marker>

        {volunteer ? (
          <Marker position={[volunteer.lat, volunteer.lng]} icon={getMarkerIcon("volunteer")}>
            <Popup>Volunteer current location</Popup>
          </Marker>
        ) : null}

        <Polyline
          positions={[
            [pickup.lat, pickup.lng],
            [dropoff.lat, dropoff.lng],
          ]}
          pathOptions={{ color: "#334155", dashArray: "10 8", weight: 4 }}
        />

        <FitBounds points={allPoints} />
      </MapContainer>
    </div>
  );
}
