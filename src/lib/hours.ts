/**
 * Horaires hebdomadaires et dates, toujours en heure de Paris (la vallée), quel que soit
 * le fuseau du navigateur du visiteur.
 * Format des horaires : { "1": [[480, 750], [930, 1140]] } — 1 = lundi … 7 = dimanche, minutes depuis minuit.
 */
export type WeeklyHours = Partial<Record<string, [number, number][]>>;

export const TIMEZONE = "Europe/Paris";
export const WEEKDAYS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

export function parisNow(now: Date = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  return { date, minutes: Number(parts.hour) * 60 + Number(parts.minute), weekday: isoWeekday(date) };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 = lundi … 7 = dimanche. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

export function datesBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function monthOf(date: string) {
  return Number(date.slice(5, 7));
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h} h ${String(min).padStart(2, "0")}` : `${h} h`;
}

export function formatDate(date: string, style: "long" | "short" = "long"): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    ...(style === "long" ? { weekday: "long", day: "numeric", month: "long" } : { weekday: "short", day: "numeric", month: "short" }),
  });
}

export function rangesOn(hours: WeeklyHours | null | undefined, weekday: number) {
  return hours?.[String(weekday)] ?? [];
}

export function isOpenOn(hours: WeeklyHours | null | undefined, date: string) {
  return rangesOn(hours, isoWeekday(date)).length > 0;
}

export type OpenStatus = { open: boolean; label: string };

/** « Ouvert · ferme à 19 h » ou « Fermé · ouvre jeudi à 14 h ». */
export function openStatus(hours: WeeklyHours | null | undefined, now: Date = new Date()): OpenStatus | null {
  if (!hours || Object.keys(hours).length === 0) return null;
  const p = parisNow(now);
  const current = rangesOn(hours, p.weekday).find(([a, b]) => p.minutes >= a && p.minutes < b);
  if (current) return { open: true, label: `Ouvert · ferme à ${formatMinutes(current[1])}` };
  for (let i = 0; i < 8; i++) {
    const date = addDays(p.date, i);
    const next = rangesOn(hours, isoWeekday(date)).filter(([a]) => i > 0 || a > p.minutes);
    if (next.length) {
      const day = i === 0 ? "aujourd'hui" : i === 1 ? "demain" : WEEKDAYS[isoWeekday(date)].toLowerCase();
      return { open: false, label: `Fermé · ouvre ${day} à ${formatMinutes(next[0][0])}` };
    }
  }
  return { open: false, label: "Fermé" };
}

/** Lit un texte « 1-6 8:00-12:30,15:30-19:00 ; 7 9:00-12:00 » (pratique pour l'administration et le seed). */
export function parseHours(text: string): WeeklyHours {
  const out: WeeklyHours = {};
  const mins = (s: string) => {
    const [h, m] = s.trim().split(/[:h]/).map(Number);
    if (!Number.isFinite(h) || h > 24) throw new Error(`Heure invalide : ${s}`);
    return h * 60 + (m || 0);
  };
  for (const chunk of text.split(";").map((c) => c.trim()).filter(Boolean)) {
    const [days, ranges] = chunk.split(/\s+/, 2);
    if (!ranges) throw new Error(`Horaires incomplets : « ${chunk} »`);
    const rs = ranges.split(",").map((r) => {
      const [a, b] = r.split("-").map(mins);
      if (!(b > a)) throw new Error(`Plage invalide : ${r}`);
      return [a, b] as [number, number];
    });
    for (const part of days.split(",")) {
      const [a, b] = part.split("-").map(Number);
      if (!(a >= 1 && a <= 7) || (b !== undefined && !(b >= a && b <= 7))) throw new Error(`Jours invalides : ${part}`);
      for (let d = a; d <= (b ?? a); d++) out[String(d)] = [...(out[String(d)] ?? []), ...rs];
    }
  }
  return out;
}

/** Inverse de parseHours, pour pré-remplir un formulaire. */
export function hoursToText(hours: WeeklyHours | null | undefined): string {
  if (!hours) return "";
  const hm = (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;
  const groups: { days: number[]; key: string }[] = [];
  for (let d = 1; d <= 7; d++) {
    const r = rangesOn(hours, d);
    if (!r.length) continue;
    const key = r.map(([a, b]) => `${hm(a)}-${hm(b)}`).join(",");
    const last = groups[groups.length - 1];
    if (last && last.key === key && last.days[last.days.length - 1] === d - 1) last.days.push(d);
    else groups.push({ days: [d], key });
  }
  return groups.map((g) => `${g.days.length > 1 ? `${g.days[0]}-${g.days[g.days.length - 1]}` : g.days[0]} ${g.key}`).join(" ; ");
}

/** Convertit une date et une heure de Paris en instant UTC (gère l'heure d'été). */
export function parisToUtc(date: string, minutes: number): Date {
  const naive = Date.UTC(Number(date.slice(0, 4)), Number(date.slice(5, 7)) - 1, Number(date.slice(8, 10)), 0, minutes);
  // Décalage de Paris à cet instant approximatif, puis correction.
  const offsetAt = (ms: number) => {
    const p = parisNow(new Date(ms));
    const asUtc = Date.UTC(Number(p.date.slice(0, 4)), Number(p.date.slice(5, 7)) - 1, Number(p.date.slice(8, 10)), 0, p.minutes);
    return asUtc - Math.floor(ms / 60000) * 60000;
  };
  const first = naive - offsetAt(naive);
  return new Date(naive - offsetAt(first));
}
