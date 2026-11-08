/**
 * Moteur de recherche de la carte : un seul jeu de filtres pour la liste et la carte.
 * Fonctions pures, exécutées dans le navigateur pour un résultat instantané.
 */
import type { PlaceKind } from "@prisma/client";
import { buildAgenda, type DateWindow, type Occurrence } from "./agenda";
import { KINDS, SUBCATEGORIES, type ListingKind } from "./categories";
import { findCommune } from "./communes";
import { addDays, datesBetween, isOpenOn, isoWeekday, monthOf, openStatus, parisNow } from "./hours";
import type { PublicEvent, PublicPlace } from "./privacy";

export type When = "any" | "today" | "weekend" | "week" | "month" | "custom";

export type Filters = {
  q: string;
  kind: "ALL" | ListingKind;
  subs: string[];
  commune: string;
  /** 0 = commune seule. */
  radiusKm: number;
  when: When;
  from: string;
  to: string;
  openNow: boolean;
  showOutOfSeason: boolean;
};

export const DEFAULT_FILTERS: Filters = {
  q: "", kind: "ALL", subs: [], commune: "", radiusKm: 0, when: "any", from: "", to: "", openNow: false, showOutOfSeason: false,
};

export const WHEN_LABELS: Record<When, string> = {
  any: "Peu importe", today: "Aujourd'hui", weekend: "Ce week-end", week: "7 prochains jours", month: "30 prochains jours", custom: "Dates précises",
};

/** Horizon de l'agenda quand aucune date n'est choisie. */
export const AGENDA_HORIZON_DAYS = 60;

export function timeWindow(f: Pick<Filters, "when" | "from" | "to">, now: Date = new Date()): DateWindow {
  const today = parisNow(now).date;
  switch (f.when) {
    case "today": return { from: today, to: today };
    case "weekend": {
      const wd = isoWeekday(today);
      if (wd === 7) return { from: today, to: today };
      const sat = addDays(today, 6 - wd);
      return { from: wd === 6 ? today : sat, to: addDays(sat, 1) };
    }
    case "week": return { from: today, to: addDays(today, 6) };
    case "month": return { from: today, to: addDays(today, 29) };
    case "custom": {
      const from = f.from && f.from >= today ? f.from : today;
      const to = f.to && f.to >= from ? f.to : from;
      return { from, to };
    }
    default: return { from: today, to: addDays(today, AGENDA_HORIZON_DAYS) };
  }
}

export function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371, r = (d: number) => (d * Math.PI) / 180;
  const dLat = r(b.lat - a.lat), dLng = r(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function communePoint(commune: string) {
  const c = findCommune(commune);
  return c ? { lat: c.lat, lng: c.lng } : null;
}

function placeText(p: PublicPlace) {
  return normalize([p.name, p.tagline, p.description, p.commune, SUBCATEGORIES[p.subcategory]?.label ?? "", KINDS[p.kind].label, ...p.labels, ...p.products.map((x) => x.name), p.facts?.provider ?? ""].join(" "));
}

function matchesText(text: string, q: string) {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  return words.every((w) => text.includes(w));
}

function matchesWhere(loc: { lat: number; lng: number }, commune: string, f: Filters) {
  if (!f.commune) return true;
  if (!f.radiusKm) return commune === f.commune;
  const c = communePoint(f.commune);
  return !c || distanceKm(c, loc) <= f.radiusKm;
}

export function inSeason(season: number[], win: DateWindow) {
  if (!season.length) return true;
  return datesBetween(win.from, win.to).some((d) => season.includes(monthOf(d)));
}

export type SearchResult = {
  occurrences: Occurrence[];
  places: Record<PlaceKind, PublicPlace[]>;
  hiddenOutOfSeason: number;
  window: DateWindow;
};

export function search(places: PublicPlace[], events: PublicEvent[], f: Filters, now: Date = new Date()): SearchResult {
  const win = timeWindow(f, now);
  const timed = f.when !== "any";
  const p = parisNow(now);
  const wantKind = (k: ListingKind) => f.kind === "ALL" || f.kind === k;
  const subsOk = (subs: string[]) => !f.subs.length || subs.some((s) => f.subs.includes(s));

  let occurrences: Occurrence[] = [];
  if (wantKind("EVENEMENT")) {
    const evText = new Map(events.map((e) => [e.id, normalize([e.title, e.tagline, e.description, e.commune, e.organiser, SUBCATEGORIES[e.subcategory]?.label ?? ""].join(" "))]));
    const placeById = new Map(places.map((x) => [x.id, x]));
    occurrences = buildAgenda(events, places, win, now).filter((o) => {
      const text = o.source === "event" ? evText.get(o.refId)! : placeText(placeById.get(o.refId)!);
      if (f.q && !matchesText(text, f.q)) return false;
      if (!subsOk(o.source === "market" ? ["marche", "marchelocal"] : [o.subcategory])) return false;
      if (!matchesWhere(o.location, o.commune, f)) return false;
      if (f.openNow) {
        const ongoing = (o.date < p.date || (o.date === p.date && o.startMinutes <= p.minutes)) && (o.endDate > p.date || (o.endDate === p.date && o.endMinutes > p.minutes));
        if (!ongoing) return false;
      }
      return true;
    });
  }

  const byKind: Record<PlaceKind, PublicPlace[]> = { PRODUCTEUR: [], COMMERCE: [], ACTIVITE: [], LOCAL: [] };
  let hiddenOutOfSeason = 0;
  const days = datesBetween(win.from, win.to);
  for (const x of places) {
    if (!wantKind(x.kind)) continue;
    if (f.q && !matchesText(placeText(x), f.q)) continue;
    if (!subsOk([x.subcategory])) continue;
    if (!matchesWhere(x.location, x.commune, f)) continue;
    if (timed && !inSeason(x.season, win)) {
      if (!f.showOutOfSeason) { hiddenOutOfSeason++; continue; }
    } else if (timed && x.hours && Object.keys(x.hours).length && !days.some((d) => isOpenOn(x.hours, d))) continue;
    // « Ouvert maintenant » : en saison aujourd'hui, et ouvert à cette heure si le lieu a des horaires.
    if (f.openNow && (x.closed || !inSeason(x.season, { from: p.date, to: p.date }) || (x.hours && Object.keys(x.hours).length && !openStatus(x.hours, now)?.open))) continue;
    byKind[x.kind].push(x);
  }

  const ref = f.commune ? communePoint(f.commune) : null;
  for (const k of Object.keys(byKind) as PlaceKind[]) {
    byKind[k].sort((a, b) => (ref ? distanceKm(ref, a.location) - distanceKm(ref, b.location) : a.name.localeCompare(b.name, "fr")));
  }
  return { occurrences, places: byKind, hiddenOutOfSeason, window: win };
}

export function countFilters(f: Filters) {
  return (f.subs.length ? 1 : 0) + (f.commune ? 1 : 0) + (f.when !== "any" ? 1 : 0) + (f.openNow ? 1 : 0);
}
