/**
 * Agenda : événements ponctuels + marchés hebdomadaires (calculés à partir des horaires des
 * lieux « marché »). Tout est exprimé en dates et minutes, heure de Paris.
 */
import { datesBetween, isoWeekday, parisNow, rangesOn } from "./hours";
import type { PublicEvent, PublicLocation, PublicPlace } from "./privacy";

export type Occurrence = {
  key: string;
  source: "event" | "market";
  /** Identifiant de l'événement ou du lieu marché. */
  refId: string;
  title: string;
  subcategory: string;
  commune: string;
  location: PublicLocation;
  date: string;
  endDate: string;
  startMinutes: number;
  endMinutes: number;
  price: string;
  tagline: string;
};

export type DateWindow = { from: string; to: string };

export function eventOccurrence(e: PublicEvent): Occurrence {
  const s = parisNow(new Date(e.startsAt));
  const end = parisNow(new Date(e.endsAt));
  return {
    key: `e:${e.id}`, source: "event", refId: e.id, title: e.title, subcategory: e.subcategory, commune: e.commune,
    location: e.location, date: s.date, endDate: end.date, startMinutes: s.minutes, endMinutes: end.minutes, price: e.price, tagline: e.tagline,
  };
}

/** Occurrences d'un marché hebdomadaire dans la fenêtre, en ignorant celles déjà terminées. */
export function marketOccurrences(m: PublicPlace, win: DateWindow, now: Date = new Date()): Occurrence[] {
  if (m.subcategory !== "marchelocal" || m.closed) return [];
  const p = parisNow(now);
  const out: Occurrence[] = [];
  for (const date of datesBetween(win.from, win.to)) {
    for (const [a, b] of rangesOn(m.hours, isoWeekday(date))) {
      if (date < p.date || (date === p.date && b <= p.minutes)) continue;
      out.push({
        key: `m:${m.id}:${date}:${a}`, source: "market", refId: m.id, title: m.name, subcategory: "marche", commune: m.commune,
        location: m.location, date, endDate: date, startMinutes: a, endMinutes: b, price: "Gratuit", tagline: m.tagline,
      });
    }
  }
  return out;
}

export function buildAgenda(events: PublicEvent[], places: PublicPlace[], win: DateWindow, now: Date = new Date()): Occurrence[] {
  const p = parisNow(now);
  const evs = events
    .map(eventOccurrence)
    .filter((o) => o.date <= win.to && o.endDate >= win.from)
    .filter((o) => o.endDate > p.date || (o.endDate === p.date && o.endMinutes > p.minutes));
  const markets = places.flatMap((m) => marketOccurrences(m, win, now));
  return [...evs, ...markets].sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
}
