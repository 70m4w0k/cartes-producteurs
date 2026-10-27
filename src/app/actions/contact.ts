"use server";

import { db } from "@/lib/db";
import { contactSchema, firstError, type FormState } from "@/lib/validation";

const MAX_MESSAGES_PER_DAY_PER_PRODUCER = 30;

export async function sendContactMessage(producerId: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const producer = await db.producer.findFirst({ where: { id: producerId, status: "APPROVED" } });
  if (!producer) return { error: "Producteur introuvable." };

  const recent = await db.contactMessage.count({
    where: { producerId, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (recent >= MAX_MESSAGES_PER_DAY_PER_PRODUCER) {
    return { error: "Ce producteur a reçu beaucoup de messages aujourd'hui, réessayez demain." };
  }

  const { senderName, senderContact, body } = parsed.data;
  await db.contactMessage.create({ data: { producerId, senderName, senderContact, body } });
  return { ok: "Message envoyé ! Le producteur vous répondra directement." };
}
