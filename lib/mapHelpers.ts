import L, { type DivIcon } from "leaflet";

export function getMapTileUrl(): string {
  return "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
}

function markerSvg(color: string): string {
  return `
    <svg width="30" height="42" viewBox="0 0 30 42" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="marker">
      <path d="M15 1C7.82 1 2 6.82 2 14c0 9.3 11.3 25.7 12.2 27a1 1 0 0 0 1.6 0C16.7 39.7 28 23.3 28 14 28 6.82 22.18 1 15 1z" fill="${color}" stroke="#1f2937" stroke-width="1.2"/>
      <circle cx="15" cy="14" r="5" fill="#ffffff"/>
    </svg>
  `;
}

export function getMarkerIcon(type: "donor" | "ngo" | "volunteer"): DivIcon {
  const colorMap: Record<"donor" | "ngo" | "volunteer", string> = {
    donor: "#ef4444",
    ngo: "#3b82f6",
    volunteer: "#22c55e",
  };

  return L.divIcon({
    html: markerSvg(colorMap[type]),
    className: "custom-map-marker",
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -36],
  });
}
