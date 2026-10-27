"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";
import { firstError, relayPointSchema, type FormState } from "@/lib/validation";

const producerStatusSchema = z.enum(["PENDING", "APPROVED", "SUSPENDED"]);

function revalidateAll() {
  revalidatePath("/", "layout");
}

export async function setProducerStatus(producerId: string, status: string) {
  await requireAdmin();
  await db.producer.update({ where: { id: producerId }, data: { status: producerStatusSchema.parse(status) } });
  revalidateAll();
}

export async function createRelayPoint(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = relayPointSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db.relayPoint.create({ data: parsed.data });
  revalidateAll();
  return { ok: "Point relais créé." };
}

export async function setRelayPointActive(relayPointId: string, active: boolean) {
  await requireAdmin();
  await db.relayPoint.update({ where: { id: relayPointId }, data: { active } });
  revalidateAll();
}
