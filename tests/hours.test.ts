import { describe, expect, it } from "vitest";
import { hoursToText, openStatus, parisNow, parisToUtc, parseHours } from "@/lib/hours";

// Mardi 10 novembre 2026, 10 h à Paris (UTC+1).
const TUE_10H = new Date("2026-11-10T09:00:00Z");

describe("hours", () => {
  it("donne l'heure de Paris", () => {
    expect(parisNow(TUE_10H)).toEqual({ date: "2026-11-10", minutes: 600, weekday: 2 });
  });

  it("lit et réécrit des horaires", () => {
    const h = parseHours("1-6 8:00-12:30,15:30-19:00 ; 7 9:00-12:00");
    expect(h["1"]).toEqual([[480, 750], [930, 1140]]);
    expect(h["7"]).toEqual([[540, 720]]);
    expect(hoursToText(h)).toBe("1-6 8:00-12:30,15:30-19:00 ; 7 9:00-12:00");
    expect(() => parseHours("8 9:00-12:00")).toThrow();
    expect(() => parseHours("1 12:00-9:00")).toThrow();
  });

  it("indique si c'est ouvert et quand ça ouvre", () => {
    const h = parseHours("2 9:00-12:00 ; 4 14:00-18:00");
    expect(openStatus(h, TUE_10H)).toEqual({ open: true, label: "Ouvert · ferme à 12 h" });
    expect(openStatus(h, new Date("2026-11-10T12:00:00Z"))).toEqual({ open: false, label: "Fermé · ouvre jeudi à 14 h" });
    expect(openStatus(null, TUE_10H)).toBeNull();
  });

  it("convertit une heure de Paris en UTC, heure d'été comprise", () => {
    expect(parisToUtc("2026-11-10", 600).toISOString()).toBe("2026-11-10T09:00:00.000Z");
    expect(parisToUtc("2026-07-01", 600).toISOString()).toBe("2026-07-01T08:00:00.000Z");
    expect(parisToUtc("2026-03-29", 600).toISOString()).toBe("2026-03-29T08:00:00.000Z"); // jour du changement d'heure
  });
});
