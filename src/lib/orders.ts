import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "En attente de confirmation",
  CONFIRMED: "Confirmée",
  READY: "Prête à retirer",
  PICKED_UP: "Retirée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  CONFIRMED: "bg-emerald-100 text-emerald-800",
  READY: "bg-blue-100 text-blue-800",
  PICKED_UP: "bg-stone-200 text-stone-700",
  REJECTED: "bg-red-100 text-red-800",
  CANCELLED: "bg-stone-200 text-stone-700",
};

/** Statuts pour lesquels le client doit encore se déplacer (et voit donc l'adresse). */
export const ACTIVE_CONFIRMED: OrderStatus[] = ["CONFIRMED", "READY"];

/** Transitions autorisées pour le producteur. */
export const PRODUCER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["CONFIRMED", "REJECTED"],
  CONFIRMED: ["READY", "PICKED_UP", "REJECTED"],
  READY: ["PICKED_UP"],
  PICKED_UP: [],
  REJECTED: [],
  CANCELLED: [],
};

export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING", "CONFIRMED", "READY"];

/** Produits qu'on peut commander. */
export const ORDERABLE_STOCK = ["AVAILABLE", "LOW"] as const;

export const MAX_QUANTITY = 50;

export function orderTotal(items: { priceCents: number | null; quantity: number }[]) {
  let cents = 0;
  let hasUnpriced = false;
  for (const i of items) {
    if (i.priceCents === null) hasUnpriced = true;
    else cents += i.priceCents * i.quantity;
  }
  return { cents, hasUnpriced };
}
