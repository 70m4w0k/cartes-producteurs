"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

const statusSchema = z.enum(["PENDING", "APPROVED", "SUSPENDED"]);

export async function setPlaceStatus(placeId: string, status: string) {
  await requireAdmin();
  await db.place.update({ where: { id: placeId }, data: { status: statusSchema.parse(status) } });
  revalidatePath("/", "layout");
}

export async function setEventStatus(eventId: string, status: string) {
  await requireAdmin();
  await db.event.update({ where: { id: eventId }, data: { status: statusSchema.parse(status) } });
  revalidatePath("/", "layout");
}
