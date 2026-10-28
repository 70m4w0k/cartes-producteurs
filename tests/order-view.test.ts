import { describe, expect, it } from "vitest";
import type { OrderStatus, Producer, RelayPoint } from "@prisma/client";
import { toCustomerOrderView, type FullOrder } from "@/lib/order-view";

process.env.LOCATION_SECRET = "test";

const producer: Producer = {
  id: "p1",
  userId: "u1",
  name: "Ferme Secrète",
  category: "VIANDE",
  description: "",
  commune: "Orlu",
  address: "1 chemin caché",
  latitude: 42.71,
  longitude: 1.89,
  phone: "0600000000",
  email: "ferme@example.com",
  website: "",
  pickupInfo: "",
  visibility: "ANONYMOUS",
  status: "APPROVED",
  closed: false,
  closedNote: "",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const relay: RelayPoint = {
  id: "r1",
  name: "Marché d'Ax",
  address: "Place du Breilh",
  commune: "Ax-les-Thermes",
  latitude: 42.72,
  longitude: 1.838,
  openingHours: "Samedi",
  description: "",
  active: true,
  createdAt: new Date(),
};

function order(status: OrderStatus, relayPoint: RelayPoint | null = null): FullOrder {
  return {
    id: "o1",
    token: "tok",
    customerName: "Client",
    customerEmail: "c@example.com",
    customerPhone: "",
    createdAt: new Date(),
    producerOrders: [
      {
        id: "po1",
        orderId: "o1",
        producerId: "p1",
        producer,
        status,
        pickupDate: "2026-10-31",
        startMinutes: 540,
        endMinutes: 720,
        relayPointId: relayPoint?.id ?? null,
        relayPoint,
        customerNote: "",
        producerNote: "",
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [{ id: "i1", producerOrderId: "po1", productId: null, name: "Colis", unit: "5 kg", priceCents: 9500, quantity: 2 }],
      },
    ],
  };
}

const SECRETS = ["Ferme Secrète", "1 chemin caché", "0600000000", "ferme@example.com", "42.71", "u1"];

describe("toCustomerOrderView", () => {
  it("ne révèle rien tant que la commande n'est pas confirmée", () => {
    for (const status of ["PENDING", "REJECTED", "CANCELLED", "PICKED_UP"] as const) {
      const json = JSON.stringify(toCustomerOrderView(order(status)));
      for (const s of SECRETS) expect(json, `${status} / ${s}`).not.toContain(s);
    }
  });

  it("révèle adresse, téléphone et position exacte après confirmation d'un retrait à la ferme", () => {
    for (const status of ["CONFIRMED", "READY"] as const) {
      const po = toCustomerOrderView(order(status)).producerOrders[0];
      expect(po.revealed).toBe(true);
      expect(po.producerName).toBe("Ferme Secrète");
      expect(po.place).toMatchObject({ address: "1 chemin caché", phone: "0600000000", location: { lat: 42.71, lng: 1.89 } });
    }
  });

  it("ne révèle pas le producteur pour un retrait en point relais, même confirmé", () => {
    const view = toCustomerOrderView(order("CONFIRMED", relay));
    const json = JSON.stringify(view);
    for (const s of SECRETS) expect(json).not.toContain(s);
    expect(view.producerOrders[0].place).toMatchObject({ kind: "relay", name: "Marché d'Ax", location: { lat: 42.72, lng: 1.838 } });
  });

  it("calcule le total", () => {
    expect(toCustomerOrderView(order("PENDING")).producerOrders[0].total).toEqual({ cents: 19000, hasUnpriced: false });
  });
});
