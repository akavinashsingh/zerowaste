import { getDistanceKm } from "@/lib/distance";

/** Hard caps applied to every payout calculation */
export const PAYOUT_CONFIG = {
  /** Volunteer tasks beyond this km are rejected at assignment time */
  MAX_DISTANCE_KM: 50,
  /** Minimum payout regardless of distance × rate */
  MIN_PAYOUT_INR: 50,
  /** Default per-km rate for volunteers who haven't set their own */
  DEFAULT_PRICE_PER_KM: 10,
} as const;

/**
 * Calculate distance (km) between donor pickup and NGO drop-off.
 * Returns null when either party has no stored coordinates.
 */
export function calcTaskDistanceKm(
  donorCoords: [number, number] | undefined | null,
  ngoCoords: [number, number] | undefined | null,
): number | null {
  if (!donorCoords?.length || !ngoCoords?.length) return null;
  // GeoJSON stores [lng, lat]; getDistanceKm expects (lat, lng, lat, lng)
  const [donorLng, donorLat] = donorCoords;
  const [ngoLng, ngoLat] = ngoCoords;
  return getDistanceKm(donorLat, donorLng, ngoLat, ngoLng);
}

/**
 * Calculate volunteer payout.
 *
 * Rules:
 *  - Distance is capped at MAX_DISTANCE_KM before multiplying.
 *  - Result is floored to MIN_PAYOUT_INR.
 *  - Returned value is rounded to the nearest rupee.
 */
export function calcPayoutAmount(
  distanceKm: number,
  pricePerKm: number = PAYOUT_CONFIG.DEFAULT_PRICE_PER_KM,
): number {
  const effectiveKm = Math.min(distanceKm, PAYOUT_CONFIG.MAX_DISTANCE_KM);
  const raw = effectiveKm * pricePerKm;
  return Math.round(Math.max(raw, PAYOUT_CONFIG.MIN_PAYOUT_INR));
}
