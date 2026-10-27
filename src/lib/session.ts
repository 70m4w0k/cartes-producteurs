import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role } from "@prisma/client";
import { db } from "./db";

const COOKIE = "session";
const MAX_AGE_S = 60 * 60 * 24 * 30;

type SessionPayload = { userId: string; role: Role };

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) throw new Error("SESSION_SECRET manquant ou trop court");
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload) {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_S}s`)
    .sign(key());
  (await cookies()).set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify<SessionPayload>(token, key());
    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}

/** Utilisateur connecté (relu en base pour tenir compte d'une suppression), sinon redirection. */
export async function requireUser() {
  const session = await getSession();
  const user = session && (await db.user.findUnique({ where: { id: session.userId } }));
  if (!user) redirect("/connexion");
  return user;
}

export async function requireProducer() {
  const user = await requireUser();
  const producer = await db.producer.findUnique({ where: { userId: user.id } });
  if (!producer) redirect(user.role === "ADMIN" ? "/admin" : "/connexion");
  return producer;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
