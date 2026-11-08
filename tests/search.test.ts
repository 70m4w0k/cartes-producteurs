import { describe, expect, it } from "vitest";
import { parseHours } from "@/lib/hours";
import { toPublicEvent, toPublicPlace } from "@/lib/privacy";
import { DEFAULT_FILTERS, search, timeWindow, type Filters } from "@/lib/search";
import { place } from "./fixtures";

const NOW = new Date("2026-11-10T09:00:00Z"); // mardi 10 h, Paris
const S = "s";
const places = [
  toPublicPlace(place({ id: "rucher", name: "Le Rucher", commune: "Orlu", hours: parseHours("3 10:00-12:00") }), S),
  toPublicPlace(place({ id: "boul", kind: "COMMERCE", subcategory: "boulangerie", name: "Boulangerie du Breilh", commune: "Ax-les-Thermes", latitude: 42.72, longitude: 1.838, hours: parseHours("1-7 7:00-19:00") }), S),
  toPublicPlace(place({ id: "canyon", kind: "ACTIVITE", subcategory: "canyoning", name: "Canyoning", commune: "Mérens-les-Vals", latitude: 42.668, longitude: 1.842, season: [6, 7, 8, 9] }), S),
  toPublicPlace(place({ id: "marche", kind: "LOCAL", subcategory: "marchelocal", name: "Marché d'Ax", commune: "Ax-les-Thermes", latitude: 42.7196, longitude: 1.8362, hours: parseHours("6 8:00-13:00") }), S),
];
const events = [
  toPublicEvent({ id: "fete", organiserPlaceId: null, subcategory: "fete", title: "Fête de la châtaigne", tagline: "", description: "Châtaignes grillées", programme: [], commune: "Mérens-les-Vals", address: "", latitude: 42.6565, longitude: 1.8345, startsAt: new Date("2026-11-12T10:00:00Z"), endsAt: new Date("2026-11-12T17:00:00Z"), price: "Gratuit", organiser: "", status: "APPROVED", createdAt: NOW, updatedAt: NOW }),
];
const run = (f: Partial<Filters>) => search(places, events, { ...DEFAULT_FILTERS, ...f }, NOW);
const ids = (r: ReturnType<typeof run>) => [...r.occurrences.map((o) => o.refId), ...Object.values(r.places).flat().map((p) => p.id)];

describe("search", () => {
  it("trouve tout sans filtre, marchés compris dans l'agenda", () => {
    const r = run({});
    expect(r.places.COMMERCE.map((p) => p.id)).toEqual(["boul"]);
    expect(r.occurrences.filter((o) => o.source === "market").length).toBeGreaterThan(5);
    expect(r.occurrences[0].refId).toBe("fete");
  });

  it("cherche dans le texte sans tenir compte des accents", () => {
    expect(ids(run({ q: "chataigne" }))).toEqual(["fete"]);
    expect(ids(run({ q: "breilh boulangerie" }))).toEqual(["boul"]);
  });

  it("filtre par commune et par rayon", () => {
    expect(ids(run({ commune: "Orlu" }))).toEqual(["rucher"]);
    const near = ids(run({ commune: "Ax-les-Thermes", radiusKm: 2 }));
    expect(near).toContain("boul");
    expect(near).not.toContain("canyon");
  });

  it("filtre par date : saison des activités et jours d'ouverture", () => {
    const today = run({ when: "today" });
    expect(ids(today)).not.toContain("canyon");
    expect(today.hiddenOutOfSeason).toBe(1);
    expect(ids(today)).not.toContain("rucher"); // ouvert seulement le mercredi
    expect(ids(today)).toContain("boul");
    expect(ids(run({ when: "today", showOutOfSeason: true }))).toContain("canyon");
    const weekend = run({ when: "weekend" });
    expect(weekend.window).toEqual({ from: "2026-11-14", to: "2026-11-15" });
    expect(weekend.occurrences.map((o) => o.refId)).toEqual(["marche"]);
  });

  it("filtre par type et sous-catégorie", () => {
    expect(ids(run({ kind: "EVENEMENT", subs: ["marche"] })).every((id) => id === "marche")).toBe(true);
    expect(ids(run({ kind: "ACTIVITE" }))).toEqual(["canyon"]);
  });

  it("« ouvert maintenant »", () => {
    expect(ids(run({ openNow: true }))).toEqual(["boul"]);
  });

  it("calcule les fenêtres de dates", () => {
    expect(timeWindow({ when: "week", from: "", to: "" }, NOW)).toEqual({ from: "2026-11-10", to: "2026-11-16" });
    expect(timeWindow({ when: "custom", from: "2026-11-20", to: "2026-11-18" }, NOW)).toEqual({ from: "2026-11-20", to: "2026-11-20" });
    expect(timeWindow({ when: "weekend", from: "", to: "" }, new Date("2026-11-15T09:00:00Z"))).toEqual({ from: "2026-11-15", to: "2026-11-15" });
  });
});

describe("placeSchema", () => {
  it("accepte une fiche producteur sans les champs propres aux activités", async () => {
    const { placeSchema } = await import("@/lib/validation");
    const r = placeSchema.safeParse({
      kind: "PRODUCTEUR", subcategory: "miel", name: "Rucher", tagline: "", description: "", story: "", commune: "Orlu", address: "",
      latitude: "", longitude: "", phone: "", email: "", website: "", labels: "Bio, Estives", hours: "3 10:00-12:00", season: [],
      visibility: "APPROXIMATE", closed: "false", closedNote: "", sellsAt: [],
    });
    expect(r.success).toBe(true);
    expect(r.success && r.data.labels).toEqual(["Bio", "Estives"]);
  });

  it("refuse une catégorie qui ne correspond pas au type", async () => {
    const { placeSchema } = await import("@/lib/validation");
    const r = placeSchema.safeParse({ kind: "COMMERCE", subcategory: "miel", name: "X", commune: "Orlu" });
    expect(r.success).toBe(false);
  });
});
