/**
 * Temps de trajet réels via OpenRouteService (https://openrouteservice.org, clé gratuite)
 * quand ORS_API_KEY est défini ; sinon estimation à vol d'oiseau corrigée.
 */
import { estimateMatrix, type LatLng } from "./route";

const ORS_URL = "https://api.openrouteservice.org/v2";
const TIMEOUT_MS = 8000;

async function ors<T>(path: string, body: unknown): Promise<T | null> {
  const key = process.env.ORS_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(`${ORS_URL}${path}`, {
      method: "POST",
      headers: { Authorization: key, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(`OpenRouteService ${path} : HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.warn(`OpenRouteService ${path} indisponible`, e);
    return null;
  }
}

const toLngLat = (p: LatLng) => [p.lng, p.lat];

export async function travelMatrix(points: LatLng[]): Promise<{ matrix: number[][]; source: "ors" | "estimate" }> {
  const data = await ors<{ durations: (number | null)[][] }>("/matrix/driving-car", {
    locations: points.map(toLngLat),
    metrics: ["duration"],
  });
  const estimate = estimateMatrix(points);
  if (!data?.durations) return { matrix: estimate, source: "estimate" };
  // Une case nulle = point non routable (ex. chemin non carrossable) : on garde l'estimation.
  return {
    matrix: data.durations.map((row, i) => row.map((d, j) => (d === null ? estimate[i][j] : Math.round(d)))),
    source: "ors",
  };
}

/** Tracé routier [lat, lng][] ; null si indisponible (la carte trace alors des segments droits). */
export async function routeGeometry(points: LatLng[]): Promise<[number, number][] | null> {
  if (points.length < 2) return null;
  const data = await ors<{ features: { geometry: { coordinates: [number, number][] } }[] }>(
    "/directions/driving-car/geojson",
    { coordinates: points.map(toLngLat) },
  );
  const coords = data?.features?.[0]?.geometry?.coordinates;
  return coords ? coords.map(([lng, lat]) => [lat, lng]) : null;
}
