/**
 * Créneaux de retrait : les producteurs définissent des créneaux hebdomadaires
 * (ex. « samedi 9 h – 12 h au marché d'Ax »), on en déduit les dates proposées aux clients.
 * Les dates sont des chaînes « AAAA-MM-JJ » et les heures des minutes depuis minuit, en heure de Paris.
 */

export const TIMEZONE = "Europe/Paris";
/** Jusqu'à quand on peut commander à l'avance. */
export const BOOKING_HORIZON_DAYS = 21;
/** Délai minimum entre la commande et le début du créneau, pour laisser au producteur le temps de répondre. */
export const MIN_LEAD_MINUTES = 12 * 60;

export const WEEKDAY_LABELS = ["", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"] as const;

export type WeeklySlot = {
  id: string;
  weekday: number;
  startMinutes: number;
  endMinutes: number;
  relayPointId: string | null;
};

export type SlotOccurrence = Omit<WeeklySlot, "id"> & { slotId: string; date: string };

/** Date et heure courantes à Paris. */
export function parisNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, minutes: Number(parts.hour) * 60 + Number(parts.minute) };
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Jour ISO : 1 = lundi … 7 = dimanche. */
export function isoWeekday(date: string): number {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 ? 7 : day;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export function upcomingOccurrences(
  slots: WeeklySlot[],
  now: Date = new Date(),
  { days = BOOKING_HORIZON_DAYS, minLeadMinutes = MIN_LEAD_MINUTES } = {},
): SlotOccurrence[] {
  const today = parisNow(now);
  const result: SlotOccurrence[] = [];
  for (let i = 0; i <= days; i++) {
    const date = addDays(today.date, i);
    const weekday = isoWeekday(date);
    for (const s of slots) {
      if (s.weekday !== weekday) continue;
      if (i * 1440 + s.startMinutes - today.minutes < minLeadMinutes) continue;
      const { id, ...rest } = s;
      result.push({ ...rest, slotId: id, date });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date) || a.startMinutes - b.startMinutes);
}

/** Vérifie côté serveur qu'une date choisie correspond bien à un créneau encore réservable. */
export function findOccurrence(slots: WeeklySlot[], slotId: string, date: string, now: Date = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const today = parisNow(now).date;
  const offset = daysBetween(today, date);
  if (offset < 0 || offset > BOOKING_HORIZON_DAYS) return null;
  return upcomingOccurrences(slots, now).find((o) => o.slotId === slotId && o.date === date) ?? null;
}

export function formatMinutes(m: number): string {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return min ? `${h} h ${String(min).padStart(2, "0")}` : `${h} h`;
}

export function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [h, m] = [Number(match[1]), Number(match[2])];
  return h < 24 && m < 60 ? h * 60 + m : null;
}

export function toTimeInput(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function formatDate(date: string, opts: { year?: boolean } = {}): string {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("fr-FR", {
    timeZone: "UTC",
    weekday: "long",
    day: "numeric",
    month: "long",
    ...(opts.year ? { year: "numeric" } : {}),
  });
}

export function formatWindow(o: { date: string; startMinutes: number; endMinutes: number }): string {
  return `${formatDate(o.date)}, ${formatMinutes(o.startMinutes)} – ${formatMinutes(o.endMinutes)}`;
}
