import { describe, expect, it } from "vitest";
import { addDays, findOccurrence, formatMinutes, isoWeekday, parisNow, parseTime, upcomingOccurrences, type WeeklySlot } from "@/lib/slots";

// Mardi 28 octobre 2026, 10 h à Paris (UTC+1 en hiver).
const NOW = new Date("2026-10-28T09:00:00Z");

const saturdayMorning: WeeklySlot = { id: "sat", weekday: 6, startMinutes: 9 * 60, endMinutes: 12 * 60, relayPointId: null };
const wednesdayEvening: WeeklySlot = { id: "wed", weekday: 3, startMinutes: 17 * 60, endMinutes: 19 * 60, relayPointId: "r1" };
const tuesdayAfternoon: WeeklySlot = { id: "tue", weekday: 2, startMinutes: 14 * 60, endMinutes: 16 * 60, relayPointId: null };

describe("dates", () => {
  it("donne l'heure de Paris", () => {
    expect(parisNow(NOW)).toEqual({ date: "2026-10-28", minutes: 600 });
    // 23 h 30 UTC = lendemain à Paris
    expect(parisNow(new Date("2026-10-28T23:30:00Z")).date).toBe("2026-10-29");
  });

  it("calcule les jours de la semaine ISO", () => {
    expect(isoWeekday("2026-10-28")).toBe(3); // mercredi
    expect(isoWeekday("2026-11-01")).toBe(7); // dimanche
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("formate et lit les heures", () => {
    expect(formatMinutes(540)).toBe("9 h");
    expect(formatMinutes(570)).toBe("9 h 30");
    expect(parseTime("17:45")).toBe(1065);
    expect(parseTime("25:00")).toBeNull();
  });
});

describe("upcomingOccurrences", () => {
  it("liste les prochains créneaux dans l'ordre", () => {
    const occ = upcomingOccurrences([saturdayMorning, wednesdayEvening], NOW, { days: 10 });
    expect(occ.map((o) => `${o.slotId}:${o.date}`)).toEqual([
      "sat:2026-10-31",
      "wed:2026-11-04",
      "sat:2026-11-07",
    ]);
  });

  it("exclut les créneaux trop proches (délai minimum)", () => {
    // Mercredi 17 h aujourd'hui : seulement 7 h d'avance → exclu avec 12 h de délai
    const occ = upcomingOccurrences([wednesdayEvening], NOW, { days: 7 });
    expect(occ.map((o) => o.date)).toEqual(["2026-11-04"]);
    // …mais accepté avec un délai de 2 h
    expect(upcomingOccurrences([wednesdayEvening], NOW, { days: 7, minLeadMinutes: 120 })[0].date).toBe("2026-10-28");
  });

  it("n'inclut pas un créneau déjà passé aujourd'hui", () => {
    const tuesdayNoon = new Date("2026-10-27T15:30:00Z"); // mardi 16 h 30 à Paris
    const occ = upcomingOccurrences([tuesdayAfternoon], tuesdayNoon, { days: 7, minLeadMinutes: 0 });
    expect(occ[0].date).toBe("2026-11-03");
  });
});

describe("findOccurrence", () => {
  it("accepte une date valide et refuse les autres", () => {
    expect(findOccurrence([saturdayMorning], "sat", "2026-10-31", NOW)).not.toBeNull();
    expect(findOccurrence([saturdayMorning], "sat", "2026-11-01", NOW)).toBeNull(); // dimanche
    expect(findOccurrence([saturdayMorning], "sat", "2026-10-24", NOW)).toBeNull(); // passé
    expect(findOccurrence([saturdayMorning], "sat", "2027-01-02", NOW)).toBeNull(); // trop loin
    expect(findOccurrence([saturdayMorning], "autre", "2026-10-31", NOW)).toBeNull();
    expect(findOccurrence([saturdayMorning], "sat", "n'importe quoi", NOW)).toBeNull();
  });
});
