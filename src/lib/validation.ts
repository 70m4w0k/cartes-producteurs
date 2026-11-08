import { z } from "zod";
import { isSubcategoryOf } from "./categories";
import { COMMUNE_NAMES } from "./communes";
import { parseHours } from "./hours";

const text = (max: number) => z.string().trim().max(max);
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Adresse web invalide (doit commencer par http:// ou https://)");
const coordinate = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : Number(v)), z.number().min(min).max(max).nullable());
const checkbox = z.preprocess((v) => v === "on" || v === "true", z.boolean());

export const placeKindSchema = z.enum(["PRODUCTEUR", "COMMERCE", "ACTIVITE", "LOCAL"]);
/** Les pros s'inscrivent comme producteur, commerce ou prestataire d'activité ; les marchés sont créés par l'administration. */
export const proKindSchema = z.enum(["PRODUCTEUR", "COMMERCE", "ACTIVITE"]);
export const visibilitySchema = z.enum(["PUBLIC", "APPROXIMATE", "ANONYMOUS"]);
export const stockStatusSchema = z.enum(["AVAILABLE", "LOW", "OUT_OF_STOCK", "OUT_OF_SEASON"]);

const subcategoryMatchesKind = (d: { kind: string; subcategory: string }) => isSubcategoryOf(d.kind as never, d.subcategory);
const subcategoryError = { message: "Catégorie invalide pour ce type de lieu", path: ["subcategory"] };

export const signupSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("E-mail invalide"),
    password: z.string().min(10, "Le mot de passe doit faire au moins 10 caractères").max(200),
    name: text(120).min(2, "Nom trop court"),
    kind: proKindSchema,
    subcategory: z.string(),
    commune: z.enum(COMMUNE_NAMES),
  })
  .refine(subcategoryMatchesKind, subcategoryError);

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

const hoursText = z
  .string()
  .trim()
  .max(500)
  .transform((v, ctx) => {
    if (!v) return null;
    try {
      return parseHours(v);
    } catch (e) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Horaires : ${(e as Error).message}` });
      return z.NEVER;
    }
  });

export const placeSchema = z
  .object({
    kind: placeKindSchema,
    subcategory: z.string(),
    name: text(120).min(2, "Nom trop court"),
    tagline: text(160),
    description: text(3000),
    story: text(2000),
    commune: z.enum(COMMUNE_NAMES),
    address: text(300),
    // Bornes larges autour de la Haute-Ariège pour éviter les erreurs de saisie.
    latitude: coordinate(42.4, 43.1),
    longitude: coordinate(1.4, 2.3),
    phone: text(40),
    email: z.union([z.literal(""), z.string().trim().email("E-mail de contact invalide")]),
    website: optionalUrl,
    labels: z.string().max(300).transform((v) => v.split(",").map((l) => l.trim()).filter(Boolean).slice(0, 8)),
    hours: hoursText,
    season: z.array(z.coerce.number().int().min(1).max(12)).max(12),
    visibility: visibilitySchema,
    closed: checkbox,
    closedNote: text(300),
    sellsAt: z.array(z.string().max(40)).max(30),
    factDuration: text(40).default(""),
    factDistance: text(40).default(""),
    factElevation: text(40).default(""),
    factLevel: z.preprocess((v) => (v === "" || v === undefined ? undefined : Number(v)), z.number().int().min(1).max(3).optional()),
    factAudience: text(120).default(""),
    factPrice: text(60).default(""),
    factMeetingPoint: text(200).default(""),
    factProvider: text(120).default(""),
  })
  .refine(subcategoryMatchesKind, subcategoryError);

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

const timeOfDay = z.string().regex(/^\d{2}:\d{2}$/, "Heure invalide").transform((v) => Number(v.slice(0, 2)) * 60 + Number(v.slice(3)));

export const eventSchema = z
  .object({
    title: text(140).min(3, "Titre trop court"),
    subcategory: z.string().refine((s) => isSubcategoryOf("EVENEMENT", s), "Type d'événement invalide"),
    tagline: text(160),
    description: text(3000),
    programme: z.string().max(2000).transform((v) => v.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 20)),
    commune: z.enum(COMMUNE_NAMES),
    address: text(300),
    latitude: coordinate(42.4, 43.1),
    longitude: coordinate(1.4, 2.3),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide"),
    endDate: z.union([z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)]),
    start: timeOfDay,
    end: timeOfDay,
    price: text(60),
    organiser: text(120),
  })
  .refine((d) => (d.endDate || d.date) > d.date || ((d.endDate || d.date) === d.date && d.end > d.start), {
    message: "La fin doit être après le début",
    path: ["end"],
  });

export const contactSchema = z.object({
  senderName: text(120).min(1, "Indiquez votre nom"),
  senderContact: text(200).min(3, "Indiquez un e-mail ou un téléphone pour qu'on vous réponde"),
  body: text(2000).min(5, "Message trop court"),
  // Champ piège invisible : les robots le remplissent.
  website: z.literal("", { errorMap: () => ({ message: "Message refusé" }) }).optional(),
});

export type FormState = { error?: string; ok?: string };

export function firstError(e: z.ZodError): string {
  return e.issues[0]?.message ?? "Formulaire invalide";
}
