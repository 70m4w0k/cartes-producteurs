/**
 * Règles de confidentialité : tout ce qui part vers le navigateur à propos d'un lieu
 * DOIT passer par `toPublicPlace`. Seuls les producteurs peuvent choisir d'être discrets
 * ou anonymes ; leurs champs masqués ne sont jamais sérialisés, et leur position exacte
 * n'est jamais envoyée s'ils ne l'ont pas rendue publique.
 */
import { createHmac } from "node:crypto";
import type { Event, Place, PlaceKind, Product, Visibility } from "@prisma/client";
import { SUBCATEGORIES } from "./categories";
import { findCommune, VALLEY_CENTER } from "./communes";
import type { WeeklyHours } from "./hours";

export type LocationPrecision = "exact" | "approximate" | "commune";

export type PublicLocation = {
  lat: number;
  lng: number;
  precision: LocationPrecision;
  /** Rayon (m) du cercle à dessiner autour du point quand il n'est pas exact. */
  radiusM: number;
};

export type PublicProduct = Pick<Product, "id" | "name" | "description" | "unit" | "priceCents" | "stockStatus">;

export type ActivityFacts = {
  duration?: string;
  distance?: string;
  elevation?: string;
  /** 1 facile, 2 moyen, 3 difficile */
  level?: number;
  audience?: string;
  price?: string;
  meetingPoint?: string;
  provider?: string;
};

export type PublicPlace = {
  id: string;
  kind: PlaceKind;
  subcategory: string;
  name: string;
  isPseudonym: boolean;
  tagline: string;
  description: string;
  story: string;
  commune: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  labels: string[];
  hours: WeeklyHours | null;
  season: number[];
  facts: ActivityFacts | null;
  visibility: Visibility;
  closed: boolean;
  closedNote: string;
  stockUpdatedAt: string | null;
  location: PublicLocation;
  products: PublicProduct[];
};

export type PublicEvent = {
  id: string;
  subcategory: string;
  title: string;
  tagline: string;
  description: string;
  programme: string[];
  commune: string;
  address: string;
  location: PublicLocation;
  startsAt: string;
  endsAt: string;
  price: string;
  organiser: string;
  organiserPlaceId: string | null;
};

/** Rayon affiché pour une position floutée ; le décalage réel est toujours inférieur. */
export const APPROXIMATE_RADIUS_M = 1000;
const APPROXIMATE_MIN_OFFSET_M = 300;
const APPROXIMATE_MAX_OFFSET_M = 800;
export const COMMUNE_RADIUS_M = 1500;
const COMMUNE_MAX_OFFSET_M = 400;

function locationSecret(): string {
  const secret = process.env.LOCATION_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("LOCATION_SECRET (ou SESSION_SECRET) doit être défini");
  return secret;
}

/**
 * Décalage déterministe et secret : le même lieu est toujours décalé de la même façon
 * (impossible de retrouver la vraie position en rechargeant la page et en faisant la
 * moyenne), et le décalage ne peut pas être recalculé sans le secret.
 */
export function secretOffset(
  id: string,
  minM: number,
  maxM: number,
  secret: string = locationSecret(),
): { dLat: number; dLng: number; distanceM: number } {
  const digest = createHmac("sha256", secret).update(`loc:${id}`).digest();
  const u1 = digest.readUInt32BE(0) / 0xffffffff;
  const u2 = digest.readUInt32BE(4) / 0xffffffff;
  const angle = u1 * 2 * Math.PI;
  const distanceM = minM + u2 * (maxM - minM);
  const dLat = (distanceM * Math.cos(angle)) / 111_320;
  const dLng = (distanceM * Math.sin(angle)) / (111_320 * Math.cos((VALLEY_CENTER[0] * Math.PI) / 180));
  return { dLat, dLng, distanceM };
}

export function pseudonym(subcategory: string, commune: string): string {
  return `${SUBCATEGORIES[subcategory]?.trade ?? "Producteur·rice"} à ${commune}`;
}

function communeCenter(commune: string): [number, number] {
  const c = findCommune(commune);
  return c ? [c.lat, c.lng] : VALLEY_CENTER;
}

/** Seuls les producteurs ont une visibilité réduite ; les autres lieux sont publics par nature. */
export function effectiveVisibility(p: Pick<Place, "kind" | "visibility">): Visibility {
  return p.kind === "PRODUCTEUR" ? p.visibility : "PUBLIC";
}

export function publicLocation(
  p: Pick<Place, "id" | "kind" | "visibility" | "latitude" | "longitude" | "commune">,
  secret?: string,
): PublicLocation {
  const visibility = effectiveVisibility(p);
  const hasExact = p.latitude !== null && p.longitude !== null;

  if (visibility === "PUBLIC" && hasExact) {
    return { lat: p.latitude!, lng: p.longitude!, precision: "exact", radiusM: 0 };
  }
  if (visibility === "APPROXIMATE" && hasExact) {
    const o = secretOffset(p.id, APPROXIMATE_MIN_OFFSET_M, APPROXIMATE_MAX_OFFSET_M, secret);
    return { lat: p.latitude! + o.dLat, lng: p.longitude! + o.dLng, precision: "approximate", radiusM: APPROXIMATE_RADIUS_M };
  }
  // Anonyme, ou position exacte non renseignée : on ne part que du centre de la commune.
  const [lat, lng] = communeCenter(p.commune);
  const o = secretOffset(p.id, 0, COMMUNE_MAX_OFFSET_M, secret);
  return { lat: lat + o.dLat, lng: lng + o.dLng, precision: "commune", radiusM: COMMUNE_RADIUS_M };
}

export function toPublicPlace(p: Place & { products?: Product[] }, secret?: string): PublicPlace {
  const visibility = effectiveVisibility(p);
  const isPublic = visibility === "PUBLIC";
  const isAnonymous = visibility === "ANONYMOUS";
  const orNull = (v: string, visible: boolean) => (visible && v ? v : null);

  return {
    id: p.id,
    kind: p.kind,
    subcategory: p.subcategory,
    name: isAnonymous ? pseudonym(p.subcategory, p.commune) : p.name,
    isPseudonym: isAnonymous,
    tagline: p.tagline,
    description: p.description,
    story: p.story,
    commune: p.commune,
    address: orNull(p.address, isPublic),
    phone: orNull(p.phone, isPublic),
    email: orNull(p.email, isPublic),
    website: orNull(p.website, !isAnonymous),
    labels: p.labels,
    hours: (p.hours as WeeklyHours | null) ?? null,
    season: p.season,
    facts: (p.facts as ActivityFacts | null) ?? null,
    visibility,
    closed: p.closed,
    closedNote: p.closedNote,
    stockUpdatedAt: p.stockUpdatedAt?.toISOString() ?? null,
    location: publicLocation(p, secret),
    products: (p.products ?? []).map(({ id, name, description, unit, priceCents, stockStatus }) => ({
      id, name, description, unit, priceCents, stockStatus,
    })),
  };
}

export function toPublicEvent(e: Event): PublicEvent {
  return {
    id: e.id,
    subcategory: e.subcategory,
    title: e.title,
    tagline: e.tagline,
    description: e.description,
    programme: e.programme,
    commune: e.commune,
    address: e.address,
    location: { lat: e.latitude, lng: e.longitude, precision: "exact", radiusM: 0 },
    startsAt: e.startsAt.toISOString(),
    endsAt: e.endsAt.toISOString(),
    price: e.price,
    organiser: e.organiser,
    organiserPlaceId: e.organiserPlaceId,
  };
}
