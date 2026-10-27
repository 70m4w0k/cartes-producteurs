"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
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
