import { describe, expect, it } from "vitest";
import { findCommune } from "@/lib/communes";
import { APPROXIMATE_RADIUS_M, COMMUNE_RADIUS_M, publicLocation, secretOffset, toPublicPlace } from "@/lib/privacy";
import { distanceKm } from "@/lib/search";
import { place } from "./fixtures";

const SECRET = "test-secret";
const base = place();
const m = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => distanceKm(a, b) * 1000;

describe("toPublicPlace", () => {
  it("expose tout en mode public", () => {
    const p = toPublicPlace(base, SECRET);
    expect(p).toMatchObject({ name: base.name, address: base.address, phone: base.phone, email: base.email });
    expect(p.location).toMatchObject({ lat: 42.71, lng: 1.89, precision: "exact" });
  });

  it("masque adresse et contacts et floute la position en mode discret", () => {
    const p = toPublicPlace({ ...base, visibility: "APPROXIMATE" }, SECRET);
    expect(p.name).toBe(base.name);
    expect([p.address, p.phone, p.email]).toEqual([null, null, null]);
    const d = m(p.location, { lat: 42.71, lng: 1.89 });
    expect(d).toBeGreaterThan(250);
    expect(d).toBeLessThan(APPROXIMATE_RADIUS_M); // le cercle affiché contient la vraie position
  });

  it("n'expose ni nom, ni site, ni position exacte en mode anonyme", () => {
    const p = toPublicPlace({ ...base, visibility: "ANONYMOUS" }, SECRET);
    expect(p.name).toBe("Apiculteur·rice à Orlu");
    const json = JSON.stringify(p);
    for (const secret of [base.name, base.address, base.phone, base.email, base.website, base.ownerId!, '"latitude"']) expect(json).not.toContain(secret);
    const moved = toPublicPlace({ ...base, visibility: "ANONYMOUS", latitude: 42.6, longitude: 1.7 }, SECRET);
    expect(moved.location).toEqual(p.location); // ne dépend que de la commune
    const orlu = findCommune("Orlu")!;
    expect(m(p.location, orlu)).toBeLessThan(COMMUNE_RADIUS_M);
  });

  it("ignore la visibilité pour les lieux qui ne sont pas des producteurs", () => {
    const shop = toPublicPlace({ ...base, kind: "COMMERCE", subcategory: "boulangerie", visibility: "ANONYMOUS" }, SECRET);
    expect(shop.name).toBe(base.name);
    expect(shop.address).toBe(base.address);
    expect(shop.location.precision).toBe("exact");
  });

  it("se rabat sur la commune quand aucune position n'est renseignée", () => {
    expect(publicLocation({ ...base, latitude: null, longitude: null }, SECRET).precision).toBe("commune");
  });
});

describe("secretOffset", () => {
  it("est stable, dépend du secret et reste dans les bornes", () => {
    expect(secretOffset("a", 300, 800, SECRET)).toEqual(secretOffset("a", 300, 800, SECRET));
    expect(secretOffset("a", 300, 800, SECRET)).not.toEqual(secretOffset("a", 300, 800, "autre"));
    for (let i = 0; i < 200; i++) {
      const { distanceM } = secretOffset(`id-${i}`, 300, 800, SECRET);
      expect(distanceM).toBeGreaterThanOrEqual(300);
      expect(distanceM).toBeLessThanOrEqual(800);
    }
  });
});
