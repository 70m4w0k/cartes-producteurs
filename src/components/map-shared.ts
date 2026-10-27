import L from "leaflet";

export const TILE_URL = process.env.NEXT_PUBLIC_TILE_URL || "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>';

const cache = new Map<string, L.DivIcon>();

/** Marqueur emoji en HTML : évite les soucis d'images de marqueurs Leaflet avec les bundlers. */
export function emojiIcon(emoji: string, variant: "producer" | "closed" | "relay" = "producer") {
  const key = `${emoji}-${variant}`;
  let icon = cache.get(key);
  if (!icon) {
    const cls = variant === "closed" ? " is-closed" : variant === "relay" ? " is-relay" : "";
    icon = L.divIcon({
      html: `<div class="marker-pin${cls}">${emoji}</div>`,
      className: "",
      iconSize: [34, 34],
      iconAnchor: [17, 17],
      popupAnchor: [0, -16],
    });
    cache.set(key, icon);
  }
  return icon;
}
