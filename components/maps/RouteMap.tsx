"use client";

import dynamic from "next/dynamic";

// SSR-safe re-export of the pure distance/ETA helper (no Leaflet dependency).
export { getRouteMetrics } from "@/lib/routeMetrics";
export type { RouteMapProps } from "@/components/maps/RouteMapInner";

// Leaflet requires the DOM — load the map component client-only.
const RouteMap = dynamic(() => import("@/components/maps/RouteMapInner"), { ssr: false });

export default RouteMap;
