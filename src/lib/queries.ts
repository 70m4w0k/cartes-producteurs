import type { PickupSlot, Producer, RelayPoint } from "@prisma/client";
import { db } from "./db";
import { toPublicProducer, type PublicProducer } from "./privacy";
import { upcomingOccurrences, type SlotOccurrence } from "./slots";

export type ListedProducer = PublicProducer & { acceptsOrders: boolean };

type WithSlots = Producer & { pickupSlots: (PickupSlot & { relayPoint: RelayPoint | null })[] };

/** Prochains retraits possibles, en ignorant les créneaux de points relais désactivés. */
function nextPickups(p: WithSlots): (SlotOccurrence & { place: string })[] {
  if (p.closed) return [];
  const slots = p.pickupSlots.filter((s) => s.relayPoint === null || s.relayPoint.active);
  return upcomingOccurrences(slots).map((o) => {
    const relay = slots.find((s) => s.id === o.slotId)?.relayPoint;
    return { ...o, place: relay ? `📦 ${relay.name}` : `Chez le producteur (${p.commune})` };
  });
}

const slotsInclude = { pickupSlots: { include: { relayPoint: true } } } as const;

export type PublicRelayPoint = {
  id: string;
  name: string;
  address: string;
  commune: string;
  lat: number;
  lng: number;
  openingHours: string;
  description: string;
  producers: { id: string; displayName: string; category: PublicProducer["category"] }[];
};

const visibleProducer = { status: "APPROVED" } as const;

export async function getPublicProducers(): Promise<ListedProducer[]> {
  const producers = await db.producer.findMany({
    where: visibleProducer,
    include: { products: { orderBy: { name: "asc" } }, ...slotsInclude },
    orderBy: { createdAt: "asc" },
  });
  return producers.map((p) => ({ ...toPublicProducer(p), acceptsOrders: nextPickups(p).length > 0 }));
}

export async function getPublicProducer(id: string) {
  const p = await db.producer.findFirst({
    where: { id, ...visibleProducer },
    include: {
      products: { orderBy: { name: "asc" } },
      relayPoints: { where: { active: true }, orderBy: { name: "asc" } },
      ...slotsInclude,
    },
  });
  if (!p) return null;
  return { producer: toPublicProducer(p), relayPoints: p.relayPoints, nextPickups: nextPickups(p) };
}

export async function getPublicRelayPoints(): Promise<PublicRelayPoint[]> {
  const relays = await db.relayPoint.findMany({
    where: { active: true },
    include: { producers: { where: visibleProducer, include: { products: false } } },
    orderBy: { name: "asc" },
  });
  return relays.map((r) => ({
    id: r.id,
    name: r.name,
    address: r.address,
    commune: r.commune,
    lat: r.latitude,
    lng: r.longitude,
    openingHours: r.openingHours,
    description: r.description,
    producers: r.producers.map((p) => {
      const pub = toPublicProducer(p);
      return { id: pub.id, displayName: pub.displayName, category: pub.category };
    }),
  }));
}
