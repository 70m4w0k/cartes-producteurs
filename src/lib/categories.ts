import type { PlaceKind } from "@prisma/client";

/** Types affichés dans les onglets : les quatre familles de lieux, plus les événements. */
export type ListingKind = PlaceKind | "EVENEMENT";

export const KINDS: Record<ListingKind, { label: string; one: string; icon: string; color: string }> = {
  EVENEMENT: { label: "Événements", one: "Événement", icon: "🎉", color: "#b04a7a" },
  ACTIVITE: { label: "Activités", one: "Activité", icon: "🥾", color: "#2f7d4f" },
  PRODUCTEUR: { label: "Producteurs", one: "Producteur", icon: "🧺", color: "#b87a12" },
  COMMERCE: { label: "Commerces", one: "Commerce", icon: "🛍️", color: "#2f6fa8" },
  LOCAL: { label: "Marchés & dépôts", one: "Acheter local", icon: "📦", color: "#7a5a2f" },
};
export const KIND_ORDER: ListingKind[] = ["EVENEMENT", "ACTIVITE", "PRODUCTEUR", "COMMERCE", "LOCAL"];

type Sub = { kind: ListingKind; label: string; icon: string; /** Métier, pour le pseudonyme des producteurs anonymes. */ trade?: string };

export const SUBCATEGORIES: Record<string, Sub> = {
  marche: { kind: "EVENEMENT", label: "Marchés", icon: "🧺" },
  fete: { kind: "EVENEMENT", label: "Fêtes de village", icon: "🎊" },
  concert: { kind: "EVENEMENT", label: "Concerts & spectacles", icon: "🎶" },
  foire: { kind: "EVENEMENT", label: "Foires", icon: "🐄" },
  course: { kind: "EVENEMENT", label: "Courses & trails", icon: "🏃" },
  randonnee: { kind: "ACTIVITE", label: "Randonnée", icon: "🥾" },
  canyoning: { kind: "ACTIVITE", label: "Canyoning", icon: "🌊" },
  speleo: { kind: "ACTIVITE", label: "Spéléologie", icon: "🔦" },
  escalade: { kind: "ACTIVITE", label: "Escalade", icon: "🧗" },
  vtt: { kind: "ACTIVITE", label: "VTT", icon: "🚵" },
  neige: { kind: "ACTIVITE", label: "Ski & raquettes", icon: "⛷️" },
  bienetre: { kind: "ACTIVITE", label: "Thermes & détente", icon: "♨️" },
  nature: { kind: "ACTIVITE", label: "Nature & faune", icon: "🦅" },
  miel: { kind: "PRODUCTEUR", label: "Miel", icon: "🍯", trade: "Apiculteur·rice" },
  fromage: { kind: "PRODUCTEUR", label: "Fromage", icon: "🧀", trade: "Fromager·ère" },
  viande: { kind: "PRODUCTEUR", label: "Viande", icon: "🥩", trade: "Éleveur·se" },
  laine: { kind: "PRODUCTEUR", label: "Laine & tissus", icon: "🧶", trade: "Artisan·e textile" },
  champignons: { kind: "PRODUCTEUR", label: "Champignons", icon: "🍄", trade: "Champignonniste" },
  legumes: { kind: "PRODUCTEUR", label: "Fruits & légumes", icon: "🥕", trade: "Maraîcher·ère" },
  boulangerie: { kind: "COMMERCE", label: "Boulangeries", icon: "🥖" },
  epicerie: { kind: "COMMERCE", label: "Épiceries", icon: "🛒" },
  restaurant: { kind: "COMMERCE", label: "Restaurants", icon: "🍽️" },
  bar: { kind: "COMMERCE", label: "Cafés & bars", icon: "☕" },
  boutique: { kind: "COMMERCE", label: "Artisanat & souvenirs", icon: "🎁" },
  location: { kind: "COMMERCE", label: "Location de matériel", icon: "🎿" },
  hebergement: { kind: "COMMERCE", label: "Hébergement", icon: "🛏️" },
  marchelocal: { kind: "LOCAL", label: "Marchés", icon: "🧺" },
  depot: { kind: "LOCAL", label: "Dépôts de produits fermiers", icon: "📦" },
};

export function subcategoriesOf(kind: ListingKind) {
  return Object.entries(SUBCATEGORIES).filter(([, s]) => s.kind === kind);
}

export function subIcon(sub: string) {
  return SUBCATEGORIES[sub]?.icon ?? "📍";
}

export function subLabel(sub: string) {
  return SUBCATEGORIES[sub]?.label ?? sub;
}

export function isSubcategoryOf(kind: ListingKind, sub: string) {
  return SUBCATEGORIES[sub]?.kind === kind;
}

/** Sous-catégories d'activités en montagne, pour afficher le conseil de sécurité. */
export const MOUNTAIN_SUBS = ["randonnee", "canyoning", "escalade", "vtt", "neige"];
