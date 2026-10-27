import type { Category, StockStatus, Visibility } from "@prisma/client";

export const CATEGORY_LABELS: Record<Category, string> = {
  MIEL: "Miel",
  FROMAGE: "Fromage",
  VIANDE: "Viande",
  TEXTILE: "Tissus & laine",
  CHAMPIGNONS: "Champignons",
  AUTRE: "Autre",
};

/** Libellé neutre du métier, utilisé pour construire le pseudonyme des producteurs anonymes. */
export const CATEGORY_TRADE: Record<Category, string> = {
  MIEL: "Apiculteur·rice",
  FROMAGE: "Fromager·ère",
  VIANDE: "Éleveur·se",
  TEXTILE: "Artisan·e textile",
  CHAMPIGNONS: "Producteur·rice de champignons",
  AUTRE: "Producteur·rice",
};

export const CATEGORY_ICONS: Record<Category, string> = {
  MIEL: "🍯",
  FROMAGE: "🧀",
  VIANDE: "🥩",
  TEXTILE: "🧶",
  CHAMPIGNONS: "🍄",
  AUTRE: "🧺",
};

export const STOCK_LABELS: Record<StockStatus, string> = {
  AVAILABLE: "Disponible",
  LOW: "Stock limité",
  OUT_OF_STOCK: "Rupture de stock",
  OUT_OF_SEASON: "Hors saison",
};

export const STOCK_STYLES: Record<StockStatus, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800",
  LOW: "bg-amber-100 text-amber-800",
  OUT_OF_STOCK: "bg-red-100 text-red-800",
  OUT_OF_SEASON: "bg-stone-200 text-stone-700",
};

export const VISIBILITY_LABELS: Record<Visibility, { title: string; help: string }> = {
  PUBLIC: {
    title: "Public",
    help: "Votre nom, votre adresse exacte et vos coordonnées sont visibles par tous.",
  },
  APPROXIMATE: {
    title: "Discret",
    help: "Votre nom est visible, mais votre position est floutée (~1 km) et vos adresse, téléphone et e-mail sont masqués. Les visiteurs vous contactent via un formulaire.",
  },
  ANONYMOUS: {
    title: "Anonyme",
    help: "Votre nom est remplacé par un pseudonyme (ex. « Apiculteur·rice à Orlu »). Seule la commune est affichée. Les visiteurs vous contactent via un formulaire.",
  },
};

export function formatPrice(cents: number | null): string {
  if (cents === null) return "Prix sur demande";
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}
