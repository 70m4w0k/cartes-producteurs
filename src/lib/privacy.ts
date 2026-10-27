/**
 * Règles de confidentialité : tout ce qui part vers le navigateur à propos d'un
 * producteur DOIT passer par `toPublicProducer`. Les champs masqués ne sont
 * jamais sérialisés, et la position exacte n'est jamais envoyée si le
 * producteur ne l'a pas rendue publique.
 */
import { createHmac } from "node:crypto";
import type { Category, Producer, Product, Visibility } from "@prisma/client";
import { findCommune, VALLEY_CENTER } from "./communes";
import { CATEGORY_TRADE } from "./labels";

export type LocationPrecision = "exact" | "approximate" | "commune";

export type PublicLocation = {
  lat: number;
  lng: number;
  precision: LocationPrecision;
  /** Rayon (m) du cercle à dessiner autour du point quand il n'est pas exact. */
  radiusM: number;
};

export type PublicProduct = Pick<
  Product,
  "id" | "name" | "description" | "unit" | "priceCents" | "stockStatus"
>;

export type PublicProducer = {
  id: string;
  displayName: string;
  isPseudonym: boolean;
  category: Category;
  description: string;
  commune: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  pickupInfo: string;
  visibility: Visibility;
  closed: boolean;
  closedNote: string;
  location: PublicLocation;
  products: PublicProduct[];
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
 * Décalage déterministe et secret : le même producteur est toujours décalé de la
 * même façon (impossible de retrouver la vraie position en rechargeant la page
 * et en faisant la moyenne), et le décalage ne peut pas être recalculé sans le secret.
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
  return { ...metersToDegrees(distanceM, angle), distanceM };
}

function metersToDegrees(distanceM: number, angle: number) {
  const dLat = (distanceM * Math.cos(angle)) / 111_320;
  const dLng = (distanceM * Math.sin(angle)) / (111_320 * Math.cos((VALLEY_CENTER[0] * Math.PI) / 180));
  return { dLat, dLng };
}

export function pseudonym(category: Category, commune: string): string {
  return `${CATEGORY_TRADE[category]} à ${commune}`;
}

function communeCenter(commune: string): [number, number] {
  const c = findCommune(commune);
  return c ? [c.lat, c.lng] : VALLEY_CENTER;
}

export function publicLocation(
  p: Pick<Producer, "id" | "visibility" | "latitude" | "longitude" | "commune">,
  secret?: string,
): PublicLocation {
  const hasExact = p.latitude !== null && p.longitude !== null;

  if (p.visibility === "PUBLIC" && hasExact) {
    return { lat: p.latitude!, lng: p.longitude!, precision: "exact", radiusM: 0 };
  }

  if (p.visibility === "APPROXIMATE" && hasExact) {
    const o = secretOffset(p.id, APPROXIMATE_MIN_OFFSET_M, APPROXIMATE_MAX_OFFSET_M, secret);
    return {
      lat: p.latitude! + o.dLat,
      lng: p.longitude! + o.dLng,
      precision: "approximate",
      radiusM: APPROXIMATE_RADIUS_M,
    };
  }

  // Anonyme, ou position exacte non renseignée : on ne part que du centre de la commune.
  const [lat, lng] = communeCenter(p.commune);
  const o = secretOffset(p.id, 0, COMMUNE_MAX_OFFSET_M, secret);
  return { lat: lat + o.dLat, lng: lng + o.dLng, precision: "commune", radiusM: COMMUNE_RADIUS_M };
}

export function toPublicProducer(
  p: Producer & { products?: Product[] },
  secret?: string,
): PublicProducer {
  const isPublic = p.visibility === "PUBLIC";
  const isAnonymous = p.visibility === "ANONYMOUS";
  const orNull = (v: string, visible: boolean) => (visible && v ? v : null);

  return {
    id: p.id,
    displayName: isAnonymous ? pseudonym(p.category, p.commune) : p.name,
    isPseudonym: isAnonymous,
    category: p.category,
    description: p.description,
    commune: p.commune,
    address: orNull(p.address, isPublic),
    phone: orNull(p.phone, isPublic),
    email: orNull(p.email, isPublic),
    website: orNull(p.website, !isAnonymous),
    pickupInfo: p.pickupInfo,
    visibility: p.visibility,
    closed: p.closed,
    closedNote: p.closedNote,
    location: publicLocation(p, secret),
    products: (p.products ?? []).map(({ id, name, description, unit, priceCents, stockStatus }) => ({
      id,
      name,
      description,
      unit,
      priceCents,
      stockStatus,
    })),
  };
}
