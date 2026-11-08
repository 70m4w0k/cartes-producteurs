"use server";

import { db } from "@/lib/db";
import { appUrl, sendMail } from "@/lib/mail";
import { contactSchema, firstError, type FormState } from "@/lib/validation";

const MAX_MESSAGES_PER_DAY_PER_PLACE = 30;

export async function sendContactMessage(placeId: string, _: FormState, form: FormData): Promise<FormState> {
  const parsed = contactSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };

  const place = await db.place.findFirst({ where: { id: placeId, status: "APPROVED" }, include: { owner: { select: { email: true } } } });
  if (!place) return { error: "Fiche introuvable." };
  if (!place.owner && !place.email) return { error: "Ce lieu ne reçoit pas de messages pour le moment." };

  const recent = await db.contactMessage.count({
    where: { placeId, createdAt: { gte: new Date(Date.now() - 24 * 3600 * 1000) } },
  });
  if (recent >= MAX_MESSAGES_PER_DAY_PER_PLACE) {
    return { error: "Ce lieu a reçu beaucoup de messages aujourd'hui, réessayez demain." };
  }

  const { senderName, senderContact, body } = parsed.data;
  await db.contactMessage.create({ data: { placeId, senderName, senderContact, body } });
  // Le message est lisible dans l'espace pro ; on prévient aussi par e-mail, sans y exposer le visiteur au-delà du nécessaire.
  const to = place.owner?.email ?? place.email;
  await sendMail({
    to,
    subject: `Nouveau message de ${senderName}`,
    text: `${senderName} (${senderContact}) vous a écrit :\n\n${body}\n\n${place.owner ? `Répondez depuis votre espace : ${appUrl("/espace")}` : ""}`,
  });
  return { ok: "Message envoyé ! Vous recevrez une réponse directement." };
}
