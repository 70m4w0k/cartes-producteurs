"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { findCommune } from "@/lib/communes";
import { db } from "@/lib/db";
import { parisToUtc } from "@/lib/hours";
import { publicLocation } from "@/lib/privacy";
import { requireAdmin, requirePlaceAccess, requireUser } from "@/lib/session";
import {
  eventSchema,
  firstError,
  placeSchema,
  productSchema,
  stockStatusSchema,
  type FormState,
} from "@/lib/validation";

function revalidatePlace(placeId: string) {
  revalidatePath("/");
  revalidatePath(`/lieux/${placeId}`);
  revalidatePath("/espace");
  revalidatePath("/admin");
}

function placeData(form: FormData) {
  const parsed = placeSchema.safeParse({
    ...Object.fromEntries(form),
    closed: form.get("closed") ?? "false",
    season: form.getAll("season"),
    sellsAt: form.getAll("sellsAt"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const d = parsed.data;
  const facts = {
    duration: d.factDuration, distance: d.factDistance, elevation: d.factElevation, level: d.factLevel,
    audience: d.factAudience, price: d.factPrice, meetingPoint: d.factMeetingPoint, provider: d.factProvider,
  };
  const hasFacts = Object.values(facts).some((v) => v !== undefined && v !== "");
  return {
    data: {
      kind: d.kind, subcategory: d.subcategory, name: d.name, tagline: d.tagline, description: d.description, story: d.story,
      commune: d.commune, address: d.address, latitude: d.latitude, longitude: d.longitude, phone: d.phone, email: d.email,
      website: d.website, labels: d.labels, season: [...new Set(d.season)].sort((a, b) => a - b),
      hours: d.hours ?? undefined, visibility: d.kind === "PRODUCTEUR" ? d.visibility : "PUBLIC",
      closed: d.closed, closedNote: d.closed ? d.closedNote : "",
      facts: hasFacts ? (facts as Prisma.InputJsonValue) : undefined,
    },
    sellsAt: d.sellsAt,
  } as const;
}

async function validSellingPlaces(ids: string[]) {
  return db.place.findMany({ where: { id: { in: ids }, kind: "LOCAL" }, select: { id: true } });
}

/** Enregistre une fiche existante (propriétaire ou admin). Le type de lieu ne change que par l'admin. */
export async function updatePlace(placeId: string, _: FormState, form: FormData): Promise<FormState> {
  const { user, place } = await requirePlaceAccess(placeId);
  const result = placeData(form);
  if ("error" in result) return { error: result.error };
  if (user.role !== "ADMIN" && result.data.kind !== place.kind) return { error: "Le type de fiche ne peut être changé que par l'administration." };
  const sellsAt = await validSellingPlaces(result.sellsAt);
  await db.place.update({
    where: { id: place.id },
    data: { ...result.data, hours: result.data.hours ?? Prisma.DbNull, facts: result.data.facts ?? Prisma.DbNull, sellsAt: { set: sellsAt } },
  });
  revalidatePlace(place.id);
  return { ok: "Fiche enregistrée." };
}

/** L'administration (office de tourisme) peut créer des fiches sans compte pro : activités, marchés, commerces… */
export async function createPlace(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const result = placeData(form);
  if ("error" in result) return { error: result.error };
  const sellsAt = await validSellingPlaces(result.sellsAt);
  const place = await db.place.create({ data: { ...result.data, status: "APPROVED", sellsAt: { connect: sellsAt } } });
  revalidatePlace(place.id);
  redirect(`/admin/lieux/${place.id}`);
}

// ——— Produits ———————————————————————————————————————————————————————————

async function ownProduct(productId: string) {
  const product = await db.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Produit introuvable");
  await requirePlaceAccess(product.placeId);
  return product;
}

function productData(form: FormData) {
  const parsed = productSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) } as const;
  const { price, ...rest } = parsed.data;
  return { data: { ...rest, priceCents: price === "" ? null : Math.round(price * 100) } } as const;
}

export async function createProduct(placeId: string, _: FormState, form: FormData): Promise<FormState> {
  const { place } = await requirePlaceAccess(placeId);
  if (place.kind !== "PRODUCTEUR") return { error: "Seuls les producteurs présentent des produits." };
  const result = productData(form);
  if ("error" in result) return { error: result.error };
  await db.$transaction([
    db.product.create({ data: { ...result.data, placeId } }),
    db.place.update({ where: { id: placeId }, data: { stockUpdatedAt: new Date() } }),
  ]);
  revalidatePlace(placeId);
  return { ok: "Produit ajouté." };
}

export async function updateProduct(_: FormState, form: FormData): Promise<FormState> {
  const product = await ownProduct(String(form.get("id")));
  const result = productData(form);
  if ("error" in result) return { error: result.error };
  await db.$transaction([
    db.product.update({ where: { id: product.id }, data: result.data }),
    db.place.update({ where: { id: product.placeId }, data: { stockUpdatedAt: new Date() } }),
  ]);
  revalidatePlace(product.placeId);
  return { ok: "Produit mis à jour." };
}

export async function setStockStatus(productId: string, status: string) {
  const product = await ownProduct(productId);
  await db.$transaction([
    db.product.update({ where: { id: product.id }, data: { stockStatus: stockStatusSchema.parse(status) } }),
    db.place.update({ where: { id: product.placeId }, data: { stockUpdatedAt: new Date() } }),
  ]);
  revalidatePlace(product.placeId);
}

export async function deleteProduct(productId: string) {
  const product = await ownProduct(productId);
  await db.product.delete({ where: { id: product.id } });
  revalidatePlace(product.placeId);
}

// ——— Événements ——————————————————————————————————————————————————————————

/**
 * Crée ou modifie un événement. Un pro le rattache à l'une de ses fiches (il apparaît alors comme
 * organisateur) ; l'administration peut publier des événements sans fiche (fête de village…).
 */
export async function saveEvent(eventId: string | null, organiserPlaceId: string | null, _: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const organiser = organiserPlaceId ? (await requirePlaceAccess(organiserPlaceId)).place : null;
  if (!organiser && user.role !== "ADMIN") return { error: "Choisissez la fiche qui organise l'événement." };
  if (eventId) {
    const existing = await db.event.findUnique({ where: { id: eventId } });
    if (!existing) return { error: "Événement introuvable." };
    if (user.role !== "ADMIN" && existing.organiserPlaceId !== organiser?.id) return { error: "Événement non autorisé." };
  }

  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  // Position : celle saisie, sinon celle (publique) de la fiche organisatrice si elle est dans la même commune, sinon le centre de la commune.
  const fallback = organiser && organiser.commune === d.commune ? publicLocation(organiser) : null;
  const commune = findCommune(d.commune)!;
  const data = {
    title: d.title, subcategory: d.subcategory, tagline: d.tagline, description: d.description, programme: d.programme,
    commune: d.commune, address: d.address,
    latitude: d.latitude ?? fallback?.lat ?? commune.lat, longitude: d.longitude ?? fallback?.lng ?? commune.lng,
    startsAt: parisToUtc(d.date, d.start), endsAt: parisToUtc(d.endDate || d.date, d.end),
    price: d.price, organiser: d.organiser || organiser?.name || "",
  };
  // Les événements des fiches validées sont publiés directement ; l'administration peut les masquer.
  const status = user.role === "ADMIN" || organiser?.status === "APPROVED" ? "APPROVED" : "PENDING";
  if (eventId) await db.event.update({ where: { id: eventId }, data });
  else await db.event.create({ data: { ...data, status, organiserPlaceId: organiser?.id ?? null, participants: organiser ? { connect: { id: organiser.id } } : undefined } });
  revalidatePath("/");
  revalidatePath("/espace");
  revalidatePath("/admin");
  return { ok: eventId ? "Événement mis à jour." : status === "APPROVED" ? "Événement publié dans l'agenda." : "Événement enregistré : il sera visible quand votre fiche sera validée." };
}

export async function deleteEvent(eventId: string) {
  const user = await requireUser();
  const event = await db.event.findUnique({ where: { id: eventId } });
  if (!event) return;
  if (user.role !== "ADMIN") {
    if (!event.organiserPlaceId) throw new Error("Événement non autorisé");
    await requirePlaceAccess(event.organiserPlaceId);
  }
  await db.event.delete({ where: { id: eventId } });
  revalidatePath("/");
  revalidatePath("/espace");
  revalidatePath("/admin");
}

// ——— Messages ————————————————————————————————————————————————————————————

async function ownMessage(messageId: string) {
  const m = await db.contactMessage.findUnique({ where: { id: messageId } });
  if (!m) throw new Error("Message introuvable");
  await requirePlaceAccess(m.placeId);
  return m;
}

export async function setMessageRead(messageId: string, read: boolean) {
  const m = await ownMessage(messageId);
  await db.contactMessage.update({ where: { id: m.id }, data: { read } });
  revalidatePath("/espace");
}

export async function deleteMessage(messageId: string) {
  const m = await ownMessage(messageId);
  await db.contactMessage.delete({ where: { id: m.id } });
  revalidatePath("/espace");
}
