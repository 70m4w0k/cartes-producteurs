import type { StockStatus, Visibility } from "@prisma/client";

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
  PUBLIC: { title: "Public", help: "Votre nom, votre adresse exacte et vos coordonnées sont visibles par tous." },
  APPROXIMATE: {
    title: "Discret",
    help: "Votre nom est visible, mais votre position est floutée (~1 km) et vos adresse, téléphone et e-mail sont masqués. Les visiteurs vous écrivent via un formulaire.",
  },
  ANONYMOUS: {
    title: "Anonyme",
    help: "Votre nom est remplacé par un pseudonyme (ex. « Apiculteur·rice à Orlu »). Seule la commune est affichée. Les visiteurs vous écrivent via un formulaire.",
  },
};

export const LEVEL_LABELS: Record<number, string> = { 1: "Facile", 2: "Moyen", 3: "Difficile" };

export const MONTHS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

export function formatPrice(cents: number | null): string {
  if (cents === null) return "Prix sur demande";
  return (cents / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

export function formatSeason(season: number[]): string {
  if (!season.length) return "Toute l'année";
  return [...season].map((m) => MONTHS[m - 1]).join(", ");
}

export function stockAge(iso: string | null): string | null {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  return days <= 0 ? "stock mis à jour aujourd'hui" : days === 1 ? "stock mis à jour hier" : `stock mis à jour il y a ${days} jours`;
}
