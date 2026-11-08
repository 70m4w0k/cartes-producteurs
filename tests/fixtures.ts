import type { Place } from "@prisma/client";

export function place(over: Partial<Place> = {}): Place {
  return {
    id: "p1", ownerId: "u1", kind: "PRODUCTEUR", subcategory: "miel", name: "Rucher de Marie Dupont", tagline: "Miel de montagne",
    description: "", story: "", commune: "Orlu", address: "12 chemin des Abeilles, 09110 Orlu", latitude: 42.71, longitude: 1.89,
    phone: "06 12 34 56 78", email: "marie@example.com", website: "https://rucher.example", labels: [], hours: null, season: [], facts: null,
    visibility: "PUBLIC", status: "APPROVED", closed: false, closedNote: "", stockUpdatedAt: null, createdAt: new Date(), updatedAt: new Date(),
    ...over,
  };
}
