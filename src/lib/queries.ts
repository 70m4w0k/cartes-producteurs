import { db } from "./db";
import { toPublicProducer, type PublicProducer } from "./privacy";

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

export async function getPublicProducers(): Promise<PublicProducer[]> {
  const producers = await db.producer.findMany({
    where: visibleProducer,
    include: { products: { orderBy: { name: "asc" } } },
    orderBy: { createdAt: "asc" },
  });
  return producers.map((p) => toPublicProducer(p));
}

export async function getPublicProducer(id: string) {
  const p = await db.producer.findFirst({
    where: { id, ...visibleProducer },
    include: {
      products: { orderBy: { name: "asc" } },
      relayPoints: { where: { active: true }, orderBy: { name: "asc" } },
    },
  });
  if (!p) return null;
  return { producer: toPublicProducer(p), relayPoints: p.relayPoints };
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
