import { describe, expect, it } from "vitest";
import type { Producer } from "@prisma/client";
import { findCommune } from "@/lib/communes";
import {
  APPROXIMATE_RADIUS_M,
  COMMUNE_RADIUS_M,
  publicLocation,
  secretOffset,
  toPublicProducer,
} from "@/lib/privacy";

const SECRET = "test-secret";

function distanceM(a: [number, number], b: [number, number]) {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const base: Producer = {
  id: "prod_1",
  userId: "user_1",
  name: "Rucher de Marie Dupont",
  category: "MIEL",
  description: "Miel de montagne",
  commune: "Orlu",
  address: "12 chemin des Abeilles, 09110 Orlu",
  latitude: 42.71,
  longitude: 1.89,
  phone: "06 12 34 56 78",
  email: "marie@example.com",
  website: "https://rucher.example",
  pickupInfo: "Samedi matin",
  visibility: "PUBLIC",
  status: "APPROVED",
  closed: false,
  closedNote: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("toPublicProducer", () => {
  it("expose tout en mode public", () => {
    const p = toPublicProducer(base, SECRET);
    expect(p.displayName).toBe(base.name);
    expect(p.address).toBe(base.address);
    expect(p.phone).toBe(base.phone);
    expect(p.email).toBe(base.email);
    expect(p.location).toMatchObject({ lat: 42.71, lng: 1.89, precision: "exact" });
  });

  it("masque adresse et contacts et floute la position en mode discret", () => {
    const p = toPublicProducer({ ...base, visibility: "APPROXIMATE" }, SECRET);
    expect(p.displayName).toBe(base.name);
    expect(p.address).toBeNull();
    expect(p.phone).toBeNull();
    expect(p.email).toBeNull();
    expect(p.location.precision).toBe("approximate");
    const d = distanceM([p.location.lat, p.location.lng], [base.latitude!, base.longitude!]);
    expect(d).toBeGreaterThan(250);
    // Le cercle affiché contient toujours la vraie position.
    expect(d).toBeLessThan(APPROXIMATE_RADIUS_M);
  });

  it("n'expose ni nom, ni site, ni rien de la position exacte en mode anonyme", () => {
    const p = toPublicProducer({ ...base, visibility: "ANONYMOUS" }, SECRET);
    expect(p.displayName).toBe("Apiculteur·rice à Orlu");
    expect(p.isPseudonym).toBe(true);
    expect(p.website).toBeNull();
    const serialized = JSON.stringify(p);
    for (const secretValue of [base.name, base.address, base.phone, base.email, base.website, base.userId]) {
      expect(serialized).not.toContain(secretValue);
    }
    // La position publique ne dépend que de la commune, pas de la position exacte.
    const moved = toPublicProducer({ ...base, visibility: "ANONYMOUS", latitude: 42.6, longitude: 1.7 }, SECRET);
    expect(moved.location).toEqual(p.location);
    const orlu = findCommune("Orlu")!;
    expect(distanceM([p.location.lat, p.location.lng], [orlu.lat, orlu.lng])).toBeLessThan(COMMUNE_RADIUS_M);
  });

  it("ne sérialise jamais l'identifiant du compte ni la position exacte hors mode public", () => {
    for (const visibility of ["APPROXIMATE", "ANONYMOUS"] as const) {
      const serialized = JSON.stringify(toPublicProducer({ ...base, visibility }, SECRET));
      expect(serialized).not.toContain("user_1");
      expect(serialized).not.toContain("42.71,");
      expect(serialized).not.toContain('"latitude"');
    }
  });

  it("se rabat sur la commune quand aucune position n'est renseignée", () => {
    const loc = publicLocation({ ...base, latitude: null, longitude: null }, SECRET);
    expect(loc.precision).toBe("commune");
  });
});

describe("secretOffset", () => {
  it("est stable pour un même producteur et dépend du secret", () => {
    expect(secretOffset("a", 300, 800, SECRET)).toEqual(secretOffset("a", 300, 800, SECRET));
    expect(secretOffset("a", 300, 800, SECRET)).not.toEqual(secretOffset("a", 300, 800, "autre"));
    expect(secretOffset("a", 300, 800, SECRET)).not.toEqual(secretOffset("b", 300, 800, SECRET));
  });

  it("reste dans les bornes demandées", () => {
    for (let i = 0; i < 200; i++) {
      const { distanceM } = secretOffset(`id-${i}`, 300, 800, SECRET);
      expect(distanceM).toBeGreaterThanOrEqual(300);
      expect(distanceM).toBeLessThanOrEqual(800);
    }
  });
});
