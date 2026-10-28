/**
 * Ce que voit un client de sa commande. Les coordonnées exactes d'un producteur ne sont
 * révélées que si celui-ci a confirmé une commande à retirer chez lui.
 */
import type { Order, OrderItem, Producer, ProducerOrder, RelayPoint } from "@prisma/client";
import { ACTIVE_CONFIRMED, orderTotal } from "./orders";
import { publicLocation, toPublicProducer } from "./privacy";

export type FullOrder = Order & {
  producerOrders: (ProducerOrder & { producer: Producer; relayPoint: RelayPoint | null; items: OrderItem[] })[];
};

export type PickupPlace = {
  kind: "farm" | "relay";
  name: string;
  /** Adresse complète, ou null si pas encore révélée. */
  address: string | null;
  commune: string;
  phone: string | null;
  email: string | null;
  /** Position exacte, ou null si pas encore révélée. */
  location: { lat: number; lng: number } | null;
  openingHours?: string;
};

export type CustomerProducerOrder = Pick<
  ProducerOrder,
  "id" | "status" | "pickupDate" | "startMinutes" | "endMinutes" | "customerNote" | "producerNote"
> & {
  producerId: string;
  producerName: string;
  category: Producer["category"];
  revealed: boolean;
  place: PickupPlace;
  items: Pick<OrderItem, "id" | "name" | "unit" | "priceCents" | "quantity">[];
  total: ReturnType<typeof orderTotal>;
};

export type CustomerOrderView = Pick<Order, "token" | "customerName" | "customerEmail" | "customerPhone" | "createdAt"> & {
  producerOrders: CustomerProducerOrder[];
};

export function toCustomerOrderView(order: FullOrder): CustomerOrderView {
  return {
    token: order.token,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    createdAt: order.createdAt,
    producerOrders: order.producerOrders.map((po) => {
      const p = po.producer;
      const pub = toPublicProducer(p);
      const confirmed = ACTIVE_CONFIRMED.includes(po.status);
      const atFarm = po.relayPointId === null;
      const revealed = confirmed && atFarm;
      // Le nom réel n'est pas sensible une fois la commande confirmée : le client va le rencontrer.
      const producerName = revealed ? p.name : pub.displayName;

      let place: PickupPlace;
      if (po.relayPoint) {
        const r = po.relayPoint;
        place = {
          kind: "relay",
          name: r.name,
          address: r.address,
          commune: r.commune,
          phone: null,
          email: null,
          location: { lat: r.latitude, lng: r.longitude },
          openingHours: r.openingHours,
        };
      } else if (revealed) {
        const exact =
          p.latitude !== null && p.longitude !== null ? { lat: p.latitude, lng: p.longitude } : publicLocation(p);
        place = {
          kind: "farm",
          name: p.name,
          address: p.address || null,
          commune: p.commune,
          phone: p.phone || null,
          email: p.email || null,
          location: { lat: exact.lat, lng: exact.lng },
        };
      } else {
        place = { kind: "farm", name: pub.displayName, address: null, commune: p.commune, phone: null, email: null, location: null };
      }

      return {
        id: po.id,
        status: po.status,
        pickupDate: po.pickupDate,
        startMinutes: po.startMinutes,
        endMinutes: po.endMinutes,
        customerNote: po.customerNote,
        producerNote: po.producerNote,
        producerId: p.id,
        producerName,
        category: p.category,
        revealed,
        place,
        items: po.items.map(({ id, name, unit, priceCents, quantity }) => ({ id, name, unit, priceCents, quantity })),
        total: orderTotal(po.items),
      };
    }),
  };
}
