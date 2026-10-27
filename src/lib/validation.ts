import { z } from "zod";
import { COMMUNE_NAMES } from "./communes";

const text = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Adresse web invalide (doit commencer par http:// ou https://)");

export const categorySchema = z.enum(["MIEL", "FROMAGE", "VIANDE", "TEXTILE", "CHAMPIGNONS", "AUTRE"]);
export const visibilitySchema = z.enum(["PUBLIC", "APPROXIMATE", "ANONYMOUS"]);
export const stockStatusSchema = z.enum(["AVAILABLE", "LOW", "OUT_OF_STOCK", "OUT_OF_SEASON"]);

const coordinate = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(min).max(max).nullable());

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail invalide"),
  password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères").max(200),
  name: text(120).min(2, "Nom trop court"),
  category: categorySchema,
  commune: z.enum(COMMUNE_NAMES),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const profileSchema = z.object({
  name: text(120).min(2, "Nom trop court"),
  category: categorySchema,
  description: text(2000),
  commune: z.enum(COMMUNE_NAMES),
  address: text(300),
  // Bornes larges autour de la Haute-Ariège pour éviter les erreurs de saisie.
  latitude: coordinate(42.4, 43.1),
  longitude: coordinate(1.4, 2.3),
  phone: text(40),
  email: z.union([z.literal(""), z.string().trim().email("E-mail de contact invalide")]),
  website: optionalUrl,
  pickupInfo: text(1000),
  visibility: visibilitySchema,
  closed: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  closedNote: text(300),
  relayPointIds: z.array(z.string()).max(50),
});

export const productSchema = z.object({
  name: text(120).min(1, "Nom requis"),
  description: text(1000),
  unit: text(60),
  price: z.preprocess(
    (v) => (typeof v === "string" ? v.replace(",", ".").trim() : v),
    z.union([z.literal(""), z.coerce.number().min(0).max(100000)]),
  ),
  stockStatus: stockStatusSchema,
});

export const contactSchema = z.object({
  senderName: text(120).min(1, "Indiquez votre nom"),
  senderContact: text(200).min(3, "Indiquez un e-mail ou un téléphone pour qu'on vous réponde"),
  body: text(2000).min(5, "Message trop court"),
  // Champ piège invisible : les robots le remplissent.
  website: z.literal("").optional(),
});

export const relayPointSchema = z.object({
  name: text(120).min(2),
  address: text(300).min(2),
  commune: z.enum(COMMUNE_NAMES),
  latitude: z.coerce.number().min(42.4).max(43.1),
  longitude: z.coerce.number().min(1.4).max(2.3),
  openingHours: text(500),
  description: text(1000),
});

export type FormState = { error?: string; ok?: string };

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Formulaire invalide";
}
