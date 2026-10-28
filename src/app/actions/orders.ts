"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { findCommune } from "@/lib/communes";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/labels";
import { appUrl, sendMail } from "@/lib/mail";
import { toCustomerOrderView } from "@/lib/order-view";
import { ACTIVE_CONFIRMED, CUSTOMER_CANCELLABLE, MAX_QUANTITY, ORDERABLE_STOCK, orderTotal } from "@/lib/orders";
import { toPublicProducer } from "@/lib/privacy";
import { googleMapsUrl, optimizeRoute, type LatLng, type RouteStop } from "@/lib/route";
import { routeGeometry, travelMatrix } from "@/lib/routing-service";
import { findOccurrence, formatWindow, upcomingOccurrences } from "@/lib/slots";

const MAX_ORDERS_PER_EMAIL_PER_DAY = 5;

// ——— Panier ————————————————————————————————————————————————————————————————

export type PickupOption = {
  /** « slotId|AAAA-MM-JJ » */
  key: string;
  date: string;
  startMinutes: number;
  endMinutes: number;
  place: string;
};

export type CartGroup = {
  producer: { id: string; displayName: string; category: string; commune: string };
  /** Raison pour laquelle on ne peut pas commander chez ce producteur, sinon null. */
  unavailable: string | null;
  items: { productId: string; name: string; unit: string; priceCents: number | null; quantity: number; orderable: boolean }[];
  pickupOptions: PickupOption[];
};

const cartSchema = z
  .array(z.object({ productId: z.string().max(40), quantity: z.number().int().min(1).max(MAX_QUANTITY) }))
  .max(100);

export async function getCartDetails(rawItems: unknown): Promise<CartGroup[]> {
  const parsed = cartSchema.safeParse(rawItems);
  if (!parsed.success) return [];
  const quantities = new Map(parsed.data.map((i) => [i.productId, i.quantity]));

  const products = await db.product.findMany({
    where: { id: { in: [...quantities.keys()] }, producer: { status: "APPROVED" } },
    include: { producer: { include: { pickupSlots: { include: { relayPoint: true } } } } },
    orderBy: { name: "asc" },
  });

  const groups = new Map<string, CartGroup>();
  for (const product of products) {
    const p = product.producer;
    let group = groups.get(p.id);
    if (!group) {
      const pub = toPublicProducer(p);
      const slots = p.pickupSlots.filter((s) => s.relayPoint === null || s.relayPoint.active);
      const placeOf = new Map(slots.map((s) => [s.id, s.relayPoint ? `📦 ${s.relayPoint.name}` : `Chez le producteur (${p.commune})`]));
      const pickupOptions = upcomingOccurrences(slots).map((o) => ({
        key: `${o.slotId}|${o.date}`,
        date: o.date,
        startMinutes: o.startMinutes,
        endMinutes: o.endMinutes,
        place: placeOf.get(o.slotId)!,
      }));
      group = {
        producer: { id: p.id, displayName: pub.displayName, category: p.category, commune: p.commune },
        unavailable: p.closed
          ? "Ce producteur est fermé temporairement."
          : pickupOptions.length === 0
            ? "Ce producteur ne propose pas de créneau de retrait pour le moment."
            : null,
        items: [],
        pickupOptions,
      };
      groups.set(p.id, group);
    }
    group.items.push({
      productId: product.id,
      name: product.name,
      unit: product.unit,
      priceCents: product.priceCents,
      quantity: quantities.get(product.id)!,
      orderable: (ORDERABLE_STOCK as readonly string[]).includes(product.stockStatus),
    });
  }
  return [...groups.values()];
}

// ——— Passage de commande ———————————————————————————————————————————————————

const placeOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Indiquez votre nom").max(120),
  customerEmail: z.string().trim().toLowerCase().email("E-mail invalide"),
  customerPhone: z.string().trim().max(40),
  groups: z
    .array(
      z.object({
        producerId: z.string().max(40),
        pickup: z.string().max(80),
        note: z.string().trim().max(1000),
        items: cartSchema.min(1),
      }),
    )
    .min(1, "Votre panier est vide")
    .max(20),
});

export type PlaceOrderResult = { error: string } | { token: string };

export async function placeOrder(input: unknown): Promise<PlaceOrderResult> {
  const parsed = placeOrderSchema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Commande invalide" };
  const { customerName, customerEmail, customerPhone, groups } = parsed.data;

  const recent = await db.order.count({
    where: { customerEmail, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (recent >= MAX_ORDERS_PER_EMAIL_PER_DAY) {
    return { error: "Trop de commandes aujourd'hui avec cet e-mail. Réessayez demain ou contactez les producteurs." };
  }

  // Revalidation complète côté serveur : on ne fait confiance à rien de ce qu'envoie le navigateur.
  const producerOrders = [];
  for (const g of groups) {
    const producer = await db.producer.findFirst({
      where: { id: g.producerId, status: "APPROVED" },
      include: { pickupSlots: { include: { relayPoint: true } }, user: { select: { email: true } } },
    });
    if (!producer) return { error: "Un producteur de votre panier n'est plus disponible." };
    const name = toPublicProducer(producer).displayName;
    if (producer.closed) return { error: `${name} est fermé temporairement.` };

    const [slotId, date] = g.pickup.split("|");
    const slots = producer.pickupSlots.filter((s) => s.relayPoint === null || s.relayPoint.active);
    const occurrence = findOccurrence(slots, slotId ?? "", date ?? "");
    if (!occurrence) return { error: `Choisissez un créneau de retrait valide pour ${name}.` };

    const products = await db.product.findMany({
      where: { id: { in: g.items.map((i) => i.productId) }, producerId: producer.id },
    });
    const items = [];
    for (const i of g.items) {
      const product = products.find((p) => p.id === i.productId);
      if (!product) return { error: `Un produit de ${name} n'existe plus.` };
      if (!(ORDERABLE_STOCK as readonly string[]).includes(product.stockStatus)) {
        return { error: `« ${product.name} » n'est plus disponible.` };
      }
      items.push({ productId: product.id, name: product.name, unit: product.unit, priceCents: product.priceCents, quantity: i.quantity });
    }
    producerOrders.push({ producer, occurrence, note: g.note, items });
  }

  const token = randomBytes(24).toString("base64url");
  const order = await db.order.create({
    data: {
      token,
      customerName,
      customerEmail,
      customerPhone,
      producerOrders: {
        create: producerOrders.map(({ producer, occurrence, note, items }) => ({
          producerId: producer.id,
          pickupDate: occurrence.date,
          startMinutes: occurrence.startMinutes,
          endMinutes: occurrence.endMinutes,
          relayPointId: occurrence.relayPointId,
          customerNote: note,
          items: { create: items },
        })),
      },
    },
  });

  await Promise.all([
    ...producerOrders.map(({ producer, occurrence, note, items }) => {
      const total = orderTotal(items);
      return sendMail({
        to: producer.user.email,
        replyTo: customerEmail,
        subject: `Nouvelle commande de ${customerName}`,
        text: [
          `Bonjour,`,
          ``,
          `${customerName} a passé une commande à retirer le ${formatWindow(occurrence)}${occurrence.relayPointId ? ` (point relais : ${producer.pickupSlots.find((s) => s.relayPointId === occurrence.relayPointId)?.relayPoint?.name})` : " chez vous"} :`,
          ...items.map((i) => `- ${i.quantity} × ${i.name}${i.unit ? ` (${i.unit})` : ""}`),
          `Total indicatif : ${formatPrice(total.cents)}${total.hasUnpriced ? " + produits à prix sur demande" : ""}, payé sur place.`,
          note && `Message : ${note}`,
          ``,
          `Confirmez ou refusez la commande dans votre espace : ${appUrl("/espace#commandes")}`,
        ]
          .filter((l) => l !== "")
          .join("\n"),
      });
    }),
    sendMail({
      to: customerEmail,
      subject: "Votre commande auprès des producteurs de la vallée d'Ax",
      text: [
        `Bonjour ${customerName},`,
        ``,
        `Votre commande a bien été transmise aux producteurs. Chacun va la confirmer ; vous recevrez un e-mail à chaque réponse.`,
        `Suivez-la, et retrouvez l'itinéraire de retrait, ici (gardez ce lien, il est personnel) :`,
        appUrl(`/commande/${token}`),
        ``,
        `Paiement sur place, au moment du retrait.`,
      ].join("\n"),
    }),
  ]);

  revalidatePath("/espace");
  return { token: order.token };
}

// ——— Suivi par le client ——————————————————————————————————————————————————

async function loadOrder(token: string) {
  if (typeof token !== "string" || token.length > 64) return null;
  return db.order.findUnique({
    where: { token },
    include: {
      producerOrders: {
        include: { producer: true, relayPoint: true, items: true },
        orderBy: [{ pickupDate: "asc" }, { startMinutes: "asc" }],
      },
    },
  });
}

export async function getOrderView(token: string) {
  const order = await loadOrder(token);
  return order ? toCustomerOrderView(order) : null;
}

export async function cancelProducerOrder(token: string, producerOrderId: string) {
  const order = await loadOrder(token);
  const po = order?.producerOrders.find((p) => p.id === producerOrderId);
  if (!order || !po || !CUSTOMER_CANCELLABLE.includes(po.status)) return;

  await db.producerOrder.update({ where: { id: po.id }, data: { status: "CANCELLED" } });
  const user = await db.user.findUnique({ where: { id: po.producer.userId }, select: { email: true } });
  if (user) {
    await sendMail({
      to: user.email,
      subject: `Commande annulée par ${order.customerName}`,
      text: `${order.customerName} a annulé sa commande du ${formatWindow({ date: po.pickupDate, startMinutes: po.startMinutes, endMinutes: po.endMinutes })}.\n\n${appUrl("/espace#commandes")}`,
    });
  }
  revalidatePath(`/commande/${token}`);
  revalidatePath("/espace");
}

// ——— Itinéraire ———————————————————————————————————————————————————————————

export type PlannedStop = {
  producerOrderId: string;
  label: string;
  place: string;
  address: string | null;
  lat: number;
  lng: number;
  startMinutes: number;
  endMinutes: number;
  arrivalMinutes: number;
};

export type RoutePlan = {
  stops: PlannedStop[];
  origin: LatLng;
  departMinutes: number;
  lateMinutes: number;
  travelMinutes: number;
  geometry: [number, number][] | null;
  source: "ors" | "estimate";
  googleMapsUrl: string;
};

const originSchema = z.object({ lat: z.number().min(41).max(44), lng: z.number().min(0).max(3) }).nullable();

export async function planRoute(token: string, date: string, rawOrigin: unknown): Promise<RoutePlan | null> {
  const view = await getOrderView(token);
  if (!view) return null;
  const parsedOrigin = originSchema.safeParse(rawOrigin);
  const userOrigin = parsedOrigin.success ? parsedOrigin.data : null;
  const ax = findCommune("Ax-les-Thermes")!;
  const origin: LatLng = userOrigin ?? { lat: ax.lat, lng: ax.lng };

  const legs = view.producerOrders.filter(
    (po) => po.pickupDate === date && ACTIVE_CONFIRMED.includes(po.status) && po.place.location,
  );
  if (legs.length === 0) return null;

  const stops: RouteStop[] = legs.map((po) => ({ id: po.id, ...po.place.location!, startMinutes: po.startMinutes, endMinutes: po.endMinutes }));
  const { matrix, source } = await travelMatrix([origin, ...stops]);
  const route = optimizeRoute(stops, matrix);
  const ordered = route.order.map((i, k) => {
    const po = legs[i];
    return {
      producerOrderId: po.id,
      label: po.producerName,
      place: po.place.name,
      address: po.place.address,
      lat: stops[i].lat,
      lng: stops[i].lng,
      startMinutes: po.startMinutes,
      endMinutes: po.endMinutes,
      arrivalMinutes: route.arrivals[k],
    };
  });
  const points = ordered.map(({ lat, lng }) => ({ lat, lng }));

  return {
    stops: ordered,
    origin,
    departMinutes: route.departMinutes,
    lateMinutes: route.lateMinutes,
    travelMinutes: Math.round(route.travelSeconds / 60),
    geometry: await routeGeometry([origin, ...points]),
    source,
    googleMapsUrl: googleMapsUrl(points, userOrigin),
  };
}
