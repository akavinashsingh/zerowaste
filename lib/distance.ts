const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Number((EARTH_RADIUS_KM * c).toFixed(2));
}

export type GeoJSONPoint = { type: "Point"; coordinates: [number, number] };

/** Convert lat/lng to GeoJSON Point — coordinates are stored as [lng, lat] per GeoJSON spec. */
export function coordinatesToGeoJSON(lat: number, lng: number): GeoJSONPoint {
  return { type: "Point", coordinates: [lng, lat] };
}

/** Extract { lat, lng } from a GeoJSON Point — coordinates are [lng, lat]. */
export function geoJSONToLatLng(point: GeoJSONPoint): { lat: number; lng: number } {
  return { lat: point.coordinates[1], lng: point.coordinates[0] };
}