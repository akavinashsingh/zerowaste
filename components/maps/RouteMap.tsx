"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";

import { getMapTileUrl, getMarkerIcon } from "@/lib/mapHelpers";

type Point = {
  lat: number;
  lng: number;
  label: string;
};

type Props = {
  pickup: Point;
  dropoff: Point;
  volunteer?: { lat: number; lng: number };
};

function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadius = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadius * c;
}

function getRouteMetrics(pickup: Point, dropoff: Point) {
  const distanceKm = haversineDistanceKm(pickup, dropoff);
  const durationHours = distanceKm / 30;
  const totalMinutes = Math.max(1, Math.round(durationHours * 60));

  return {
    distanceKm,
    etaLabel: totalMinutes >= 60
      ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
      : `${totalMinutes}m`,
  };
}

function FitBounds({ points }: { points: Array<{ lat: number; lng: number }> }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) return;
    const bounds = points.map((point) => [point.lat, point.lng] as [number, number]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

function RouteMapInner({ pickup, dropoff, volunteer }: Props) {
  const metrics = getRouteMetrics(pickup, dropoff);
  const allPoints = volunteer ? [pickup, dropoff, volunteer] : [pickup, dropoff];

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-stone-100 px-3 py-2 text-xs font-medium text-stone-700">
        Distance: {metrics.distanceKm.toFixed(2)} km · ETA @ 30 km/h: {metrics.etaLabel}
      </div>

      <MapContainer center={[pickup.lat, pickup.lng]} zoom={12} className="h-[420px] w-full rounded-3xl" scrollWheelZoom>
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

export { getRouteMetrics };

const RouteMap = dynamic(async () => RouteMapInner, { ssr: false });

export default RouteMap;
