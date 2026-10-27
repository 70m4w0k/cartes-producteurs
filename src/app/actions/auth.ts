"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession } from "@/lib/session";
import { firstError, loginSchema, signupSchema, type FormState } from "@/lib/validation";

export async function signup(_: FormState, form: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { email, password, name, category, commune } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "Un compte existe déjà avec cet e-mail." };
  }

  const user = await db.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash(password, 12),
      producer: { create: { name, category, commune } },
    },
  });
  await createSession({ userId: user.id, role: user.role });
  redirect("/espace");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "E-mail ou mot de passe incorrect." };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) {
    return { error: "E-mail ou mot de passe incorrect." };
  }
  await createSession({ userId: user.id, role: user.role });
  redirect(user.role === "ADMIN" ? "/admin" : "/espace");
}

export async function logout() {
  await destroySession();
  redirect("/");
}
