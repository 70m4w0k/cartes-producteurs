import L from "leaflet";

/**
 * Fonds de carte. Par défaut : CARTO Voyager (proche de Google Maps), OpenTopoMap (relief, idéal en
 * montagne) et Esri (satellite). En production, avec une clé MapTiler (offre payante simple),
 * on passe sur leurs fonds « streets », « outdoor » et « satellite ».
 */
const MAPTILER_KEY = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export type BaseLayer = { id: string; name: string; url: string; attribution: string; maxZoom: number; subdomains?: string };

const OSM = '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>';

export const BASE_LAYERS: BaseLayer[] = MAPTILER_KEY
  ? [
      { id: "plan", name: "Plan", url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, attribution: `&copy; MapTiler ${OSM}`, maxZoom: 19 },
      { id: "relief", name: "Relief", url: `https://api.maptiler.com/maps/outdoor-v2/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`, attribution: `&copy; MapTiler ${OSM}`, maxZoom: 19 },
      { id: "satellite", name: "Satellite", url: `https://api.maptiler.com/maps/hybrid/{z}/{x}/{y}.jpg?key=${MAPTILER_KEY}`, attribution: `&copy; MapTiler ${OSM}`, maxZoom: 19 },
    ]
  : [
      { id: "plan", name: "Plan", url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", attribution: `${OSM} &copy; <a href="https://carto.com/attributions">CARTO</a>`, maxZoom: 19, subdomains: "abcd" },
      { id: "relief", name: "Relief", url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png", attribution: `${OSM}, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a>`, maxZoom: 17, subdomains: "abc" },
      { id: "satellite", name: "Satellite", url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", attribution: "Imagerie &copy; Esri", maxZoom: 18 },
    ];

/** Emprise de la vallée d'Ax : de L'Hospitalet au sud à Luzenac et au plateau de Sault au nord. */
export const VALLEY_BOUNDS: [[number, number], [number, number]] = [
  [42.58, 1.72],
  [42.81, 1.95],
];

const cache = new Map<string, L.DivIcon>();

/** Épingle façon Google Maps : goutte colorée selon le type, pictogramme de la catégorie au centre. */
export function pinIcon(emoji: string, color: string, opts: { highlight?: boolean; muted?: boolean } = {}) {
  const key = `${emoji}|${color}|${opts.highlight ? 1 : 0}|${opts.muted ? 1 : 0}`;
  let icon = cache.get(key);
  if (!icon) {
    const size = opts.highlight ? 46 : 38;
    icon = L.divIcon({
      html: `<div class="gpin${opts.highlight ? " is-hl" : ""}${opts.muted ? " is-muted" : ""}" style="--pin:${color};width:${size}px;height:${size}px"><span>${emoji}</span></div>`,
      className: "gpin-wrap",
      iconSize: [size, size],
      iconAnchor: [size / 2, size],
      popupAnchor: [0, -size + 4],
    });
    cache.set(key, icon);
  }
  return icon;
}

export function dotIcon() {
  return L.divIcon({ html: '<div class="me-dot"></div>', className: "", iconSize: [18, 18], iconAnchor: [9, 9] });
}

/** Pastille de regroupement : nombre de lieux, couleur neutre, taille selon le nombre. */
export function clusterIcon(cluster: { getChildCount(): number }) {
  const n = cluster.getChildCount();
  const size = n < 5 ? 36 : n < 15 ? 42 : 50;
  return L.divIcon({ html: `<div class="gcluster" style="width:${size}px;height:${size}px">${n}</div>`, className: "gpin-wrap", iconSize: [size, size] });
}
