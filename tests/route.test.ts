import { describe, expect, it } from "vitest";
import { estimateMatrix, googleMapsUrl, haversineM, optimizeRoute, type RouteStop } from "@/lib/route";

const ax = { lat: 42.7208, lng: 1.8386 };
const orlu = { lat: 42.7036, lng: 1.8853 };
const merens = { lat: 42.6559, lng: 1.835 };
const luzenac = { lat: 42.7656, lng: 1.7556 };

const allDay = { startMinutes: 8 * 60, endMinutes: 18 * 60 };

function plan(origin: typeof ax, stops: RouteStop[]) {
  return optimizeRoute(stops, estimateMatrix([origin, ...stops]));
}

describe("optimizeRoute", () => {
  it("donne une distance plausible", () => {
    const d = haversineM(ax, orlu);
    expect(d).toBeGreaterThan(3000);
    expect(d).toBeLessThan(6000);
  });

  it("choisit l'ordre géographique le plus court sans contrainte horaire", () => {
    // Départ de Luzenac (nord) : Ax puis Orlu puis Mérens est plus court que l'inverse.
    const stops: RouteStop[] = [
      { id: "merens", ...merens, ...allDay },
      { id: "ax", ...ax, ...allDay },
      { id: "orlu", ...orlu, ...allDay },
    ];
    const r = plan(luzenac, stops);
    expect(r.order.map((i) => stops[i].id)).toEqual(["ax", "orlu", "merens"]);
    expect(r.lateMinutes).toBe(0);
  });

  it("respecte les créneaux même si c'est plus long", () => {
    const stops: RouteStop[] = [
      // Orlu n'est ouvert que l'après-midi, Mérens que le matin
      { id: "orlu", ...orlu, startMinutes: 14 * 60, endMinutes: 16 * 60 },
      { id: "merens", ...merens, startMinutes: 9 * 60, endMinutes: 10 * 60 },
      { id: "ax", ...ax, ...allDay },
    ];
    const r = plan(ax, stops);
    expect(stops[r.order[0]].id).toBe("merens");
    expect(stops[r.order[r.order.length - 1]].id).toBe("orlu");
    expect(r.lateMinutes).toBe(0);
    expect(r.arrivals[0]).toBe(9 * 60);
    // On arrive à l'heure d'ouverture, après le trajet depuis le départ
    expect(r.departMinutes).toBeLessThan(9 * 60);
    expect(r.arrivals.at(-1)).toBe(14 * 60);
  });

  it("signale un retard inévitable", () => {
    const stops: RouteStop[] = [
      { id: "a", ...merens, startMinutes: 600, endMinutes: 605 },
      { id: "b", ...luzenac, startMinutes: 600, endMinutes: 605 },
    ];
    expect(plan(ax, stops).lateMinutes).toBeGreaterThan(0);
  });

  it("gère zéro et un arrêt", () => {
    expect(plan(ax, []).order).toEqual([]);
    expect(plan(ax, [{ id: "x", ...orlu, ...allDay }]).order).toEqual([0]);
  });
});

describe("googleMapsUrl", () => {
  it("place le dernier arrêt en destination et les autres en étapes", () => {
    const url = new URL(googleMapsUrl([orlu, merens], ax));
    expect(url.searchParams.get("destination")).toBe("42.655900,1.835000");
    expect(url.searchParams.get("waypoints")).toBe("42.703600,1.885300");
    expect(url.searchParams.get("origin")).toBe("42.720800,1.838600");
  });
});
