function toRad(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function getRouteMetrics(
  pickup: { lat: number; lng: number },
  dropoff: { lat: number; lng: number },
) {
  const distanceKm = haversineDistanceKm(pickup, dropoff);
  const totalMinutes = Math.max(1, Math.round((distanceKm / 30) * 60));
  return {
    distanceKm,
    etaLabel:
      totalMinutes >= 60
        ? `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`
        : `${totalMinutes}m`,
  };
}
