"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mail";
import { ACTIVE_CONFIRMED, ORDER_STATUS_LABELS, PRODUCER_TRANSITIONS } from "@/lib/orders";
import { pseudonym } from "@/lib/privacy";
import { formatWindow, parseTime } from "@/lib/slots";
import { requireProducer } from "@/lib/session";
import {
  firstError,
  productSchema,
  profileSchema,
  stockStatusSchema,
  type FormState,
} from "@/lib/validation";

function revalidatePublic(producerId: string) {
  revalidatePath("/");
  revalidatePath(`/producteurs/${producerId}`);
  revalidatePath("/points-relais");
  revalidatePath("/espace");
}

export async function updateProfile(_: FormState, form: FormData): Promise<FormState> {
  const producer = await requireProducer();
  const parsed = profileSchema.safeParse({
    ...Object.fromEntries(form),
    closed: form.get("closed") ?? "false",
    relayPointIds: form.getAll("relayPointIds"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { relayPointIds, ...data } = parsed.data;

  const relays = await db.relayPoint.findMany({
    where: { id: { in: relayPointIds }, active: true },
    select: { id: true },
  });

  await db.producer.update({
    where: { id: producer.id },
    data: { ...data, relayPoints: { set: relays } },
  });
  revalidatePublic(producer.id);
  return { ok: "Fiche enregistrée." };
}

/** Récupère un produit en vérifiant qu'il appartient bien au producteur connecté. */
async function ownProduct(productId: string) {
  const producer = await requireProducer();
  const product = await db.product.findFirst({ where: { id: productId, producerId: producer.id } });
  if (!product) throw new Error("Produit introuvable");
  return { producer, product };
}

function productData(form: FormData) {
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const { price, ...rest } = parsed.data;
  return { data: { ...rest, priceCents: price === "" ? null : Math.round(price * 100) } } as const;
}

export async function createProduct(_: FormState, form: FormData): Promise<FormState> {
  const producer = await requireProducer();
  const result = productData(form);
  if ("error" in result) return { error: result.error };
  await db.product.create({ data: { ...result.data, producerId: producer.id } });
  revalidatePublic(producer.id);
  return { ok: "Produit ajouté." };
}

export async function updateProduct(_: FormState, form: FormData): Promise<FormState> {
  const { producer, product } = await ownProduct(String(form.get("id")));
  const result = productData(form);
  if ("error" in result) return { error: result.error };
  await db.product.update({ where: { id: product.id }, data: result.data });
  revalidatePublic(producer.id);
  return { ok: "Produit mis à jour." };
}

export async function setStockStatus(productId: string, status: string) {
  const { producer, product } = await ownProduct(productId);
  await db.product.update({ where: { id: product.id }, data: { stockStatus: stockStatusSchema.parse(status) } });
  revalidatePublic(producer.id);
}

export async function deleteProduct(productId: string) {
  const { producer, product } = await ownProduct(productId);
  await db.product.delete({ where: { id: product.id } });
  revalidatePublic(producer.id);
}

export async function setMessageRead(messageId: string, read: boolean) {
  const producer = await requireProducer();
  await db.contactMessage.updateMany({ where: { id: messageId, producerId: producer.id }, data: { read } });
  revalidatePath("/espace");
}

export async function deleteMessage(messageId: string) {
  const producer = await requireProducer();
  await db.contactMessage.deleteMany({ where: { id: messageId, producerId: producer.id } });
  revalidatePath("/espace");
}

// ——— Créneaux de retrait ———————————————————————————————————————————————————

const MAX_SLOTS = 30;

export async function addPickupSlot(_: FormState, form: FormData): Promise<FormState> {
  const producer = await requireProducer();
  const weekday = Number(form.get("weekday"));
  const start = parseTime(String(form.get("start") ?? ""));
  const end = parseTime(String(form.get("end") ?? ""));
  const relayPointId = String(form.get("relayPointId") ?? "") || null;

  if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7) return { error: "Jour invalide." };
  if (start === null || end === null) return { error: "Heures invalides." };
  if (end <= start) return { error: "L'heure de fin doit être après l'heure de début." };
  if (relayPointId && !(await db.relayPoint.findFirst({ where: { id: relayPointId, active: true } }))) {
    return { error: "Point relais introuvable." };
  }
  if ((await db.pickupSlot.count({ where: { producerId: producer.id } })) >= MAX_SLOTS) {
    return { error: `${MAX_SLOTS} créneaux maximum.` };
  }

  await db.pickupSlot.create({
    data: { producerId: producer.id, weekday, startMinutes: start, endMinutes: end, relayPointId },
  });
  revalidatePublic(producer.id);
  return { ok: "Créneau ajouté." };
}

export async function deletePickupSlot(slotId: string) {
  const producer = await requireProducer();
  await db.pickupSlot.deleteMany({ where: { id: slotId, producerId: producer.id } });
  revalidatePublic(producer.id);
}

// ——— Commandes ————————————————————————————————————————————————————————————

const statusUpdateSchema = z.object({
  status: z.enum(["CONFIRMED", "READY", "PICKED_UP", "REJECTED"]),
  note: z.string().trim().max(1000),
});

const CUSTOMER_MESSAGES: Partial<Record<keyof typeof ORDER_STATUS_LABELS, string>> = {
  CONFIRMED: "a confirmé votre commande. L'adresse de retrait et l'itinéraire sont disponibles sur votre page de suivi.",
  READY: "a préparé votre commande : elle est prête à être retirée.",
  REJECTED: "ne peut malheureusement pas honorer votre commande.",
};

export async function updateOrderStatus(producerOrderId: string, status: string, note = ""): Promise<FormState> {
  const producer = await requireProducer();
  const parsed = statusUpdateSchema.safeParse({ status, note });
  if (!parsed.success) return { error: "Action invalide." };

  const po = await db.producerOrder.findFirst({
    where: { id: producerOrderId, producerId: producer.id },
    include: { order: true },
  });
  if (!po) return { error: "Commande introuvable." };
  if (!PRODUCER_TRANSITIONS[po.status].includes(parsed.data.status)) {
    return { error: `Impossible : la commande est « ${ORDER_STATUS_LABELS[po.status].toLowerCase()} ».` };
  }

  await db.producerOrder.update({
    where: { id: po.id },
    data: { status: parsed.data.status, ...(parsed.data.note ? { producerNote: parsed.data.note } : {}) },
  });

  const message = CUSTOMER_MESSAGES[parsed.data.status];
  if (message) {
    // Même règle que la page de suivi : un producteur anonyme n'est nommé que s'il a confirmé un retrait chez lui.
    const revealed = po.relayPointId === null && ACTIVE_CONFIRMED.includes(parsed.data.status);
    const who = producer.visibility === "ANONYMOUS" && !revealed ? pseudonym(producer.category, producer.commune) : producer.name;
    await sendMail({
      to: po.order.customerEmail,
      subject: `Commande ${ORDER_STATUS_LABELS[parsed.data.status].toLowerCase()} — retrait le ${formatWindow({ date: po.pickupDate, startMinutes: po.startMinutes, endMinutes: po.endMinutes })}`,
      text: [
        `Bonjour ${po.order.customerName},`,
        ``,
        `${who} ${message}`,
        parsed.data.note && `\nMessage du producteur : ${parsed.data.note}`,
        ``,
        `Suivi de votre commande : ${appUrl(`/commande/${po.order.token}`)}`,
      ]
        .filter((l) => l !== "")
        .join("\n"),
    });
  }

  revalidatePath("/espace");
  revalidatePath(`/commande/${po.order.token}`);
  return { ok: ORDER_STATUS_LABELS[parsed.data.status] };
}
