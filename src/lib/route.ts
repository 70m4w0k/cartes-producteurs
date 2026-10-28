/**
 * Optimisation de l'ordre de passage chez les producteurs et points relais,
 * en tenant compte des créneaux de retrait (problème de tournée avec fenêtres de temps).
 * Avec au plus quelques arrêts par jour, on essaie toutes les permutations.
 */

export type LatLng = { lat: number; lng: number };

export type RouteStop = LatLng & {
  id: string;
  startMinutes: number;
  endMinutes: number;
};

export type PlannedRoute = {
  /** Indices des arrêts dans l'ordre de passage. */
  order: number[];
  /** Heure d'arrivée estimée à chaque arrêt (minutes depuis minuit), dans l'ordre de passage. */
  arrivals: number[];
  departMinutes: number;
  /** Retard cumulé sur les fins de créneaux ; 0 si tout est respecté. */
  lateMinutes: number;
  travelSeconds: number;
};

/** Temps passé à chaque arrêt. */
export const SERVICE_MINUTES = 10;
const MAX_BRUTE_FORCE_STOPS = 8;

export function haversineM(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Estimation hors ligne : routes de montagne sinueuses (×1,4) à 40 km/h de moyenne. */
export function estimateMatrix(points: LatLng[]): number[][] {
  const speedMs = 40 / 3.6;
  return points.map((a) => points.map((b) => Math.round((haversineM(a, b) * 1.4) / speedMs)));
}

function simulate(order: number[], stops: RouteStop[], matrix: number[][]) {
  // matrix : index 0 = point de départ, i + 1 = stops[i]
  const first = order[0];
  const firstTravelMin = matrix[0][first + 1] / 60;
  const departMinutes = Math.round(stops[first].startMinutes - firstTravelMin);
  let t = stops[first].startMinutes;
  let late = 0;
  let travel = matrix[0][first + 1];
  const arrivals = [t];
  for (let k = 1; k < order.length; k++) {
    const leg = matrix[order[k - 1] + 1][order[k] + 1];
    travel += leg;
    t += SERVICE_MINUTES + leg / 60;
    const s = stops[order[k]];
    if (t < s.startMinutes) t = s.startMinutes;
    late += Math.max(0, t - s.endMinutes);
    arrivals.push(Math.round(t));
  }
  return { order, arrivals, departMinutes, lateMinutes: Math.round(late), travelSeconds: travel, finish: t };
}

function* permutations(n: number): Generator<number[]> {
  const a = Array.from({ length: n }, (_, i) => i);
  const c = new Array(n).fill(0);
  yield [...a];
  let i = 0;
  while (i < n) {
    if (c[i] < i) {
      const j = i % 2 === 0 ? 0 : c[i];
      [a[j], a[i]] = [a[i], a[j]];
      yield [...a];
      c[i]++;
      i = 0;
    } else {
      c[i] = 0;
      i++;
    }
  }
}

/** Critères dans l'ordre : retard, heure de fin, temps passé hors de chez soi, temps de conduite. */
function compare(a: ReturnType<typeof simulate>, b: ReturnType<typeof simulate>): number {
  return (
    a.lateMinutes - b.lateMinutes ||
    a.finish - b.finish ||
    a.finish - a.departMinutes - (b.finish - b.departMinutes) ||
    a.travelSeconds - b.travelSeconds
  );
}

export function optimizeRoute(stops: RouteStop[], matrix: number[][]): PlannedRoute {
  if (stops.length === 0) return { order: [], arrivals: [], departMinutes: 0, lateMinutes: 0, travelSeconds: 0 };

  const candidates =
    stops.length <= MAX_BRUTE_FORCE_STOPS
      ? permutations(stops.length)
      : [stops.map((_, i) => i).sort((x, y) => stops[x].startMinutes - stops[y].startMinutes)];

  let best: ReturnType<typeof simulate> | null = null;
  for (const order of candidates) {
    const r = simulate(order, stops, matrix);
    if (!best || compare(r, best) < 0) best = r;
  }
  const { finish: _, ...route } = best!;
  return route;
}

/** Lien de navigation Google Maps (ouvre l'application sur téléphone). Sans origine : position actuelle. */
export function googleMapsUrl(points: LatLng[], origin?: LatLng | null): string {
  const fmt = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;
  const params = new URLSearchParams({ api: "1", travelmode: "driving", destination: fmt(points[points.length - 1]) });
  if (origin) params.set("origin", fmt(origin));
  if (points.length > 1) params.set("waypoints", points.slice(0, -1).map(fmt).join("|"));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
