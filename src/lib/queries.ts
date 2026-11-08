import { db } from "./db";
import { toPublicEvent, toPublicPlace, type PublicEvent, type PublicPlace } from "./privacy";

const approved = { status: "APPROVED" } as const;

/** Toutes les données de la carte : la vallée compte quelques centaines de fiches, filtrées ensuite dans le navigateur. */
export async function getMapData(): Promise<{ places: PublicPlace[]; events: PublicEvent[] }> {
  const now = Date.now();
  const [places, events] = await Promise.all([
    db.place.findMany({ where: approved, include: { products: { orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    db.event.findMany({
      where: { ...approved, endsAt: { gte: new Date(now) }, startsAt: { lte: new Date(now + 120 * 86_400_000) } },
      orderBy: { startsAt: "asc" },
    }),
  ]);
  return { places: places.map((p) => toPublicPlace(p)), events: events.map(toPublicEvent) };
}

export async function getPlacePage(id: string) {
  const p = await db.place.findFirst({
    where: { id, ...approved },
    include: {
      products: { orderBy: { name: "asc" } },
      sellsAt: { where: approved },
      sellers: { where: approved, include: { products: true } },
      organisedEvents: { where: { ...approved, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 10 },
      attendedEvents: { where: { ...approved, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" }, take: 10 },
    },
  });
  if (!p) return null;
  const events = [...p.organisedEvents, ...p.attendedEvents]
    .filter((e, i, all) => all.findIndex((x) => x.id === e.id) === i)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return {
    place: toPublicPlace(p),
    sellsAt: p.sellsAt.map((x) => toPublicPlace(x)),
    sellers: p.sellers.map((x) => toPublicPlace(x)),
    events: events.map(toPublicEvent),
  };
}

export async function getEventPage(id: string) {
  const e = await db.event.findFirst({
    where: { id, ...approved },
    include: { participants: { where: approved }, organiserPlace: true },
  });
  if (!e) return null;
  return {
    event: toPublicEvent(e),
    participants: e.participants.map((x) => toPublicPlace(x)),
    organiserPlace: e.organiserPlace && e.organiserPlace.status === "APPROVED" ? toPublicPlace(e.organiserPlace) : null,
  };
}

/** Lieux et événements à proximité (pour suggérer quoi faire autour d'une fiche). */
export async function getNearbyEvents(lat: number, lng: number, km = 6) {
  const d = km / 111;
  const events = await db.event.findMany({
    where: { ...approved, endsAt: { gte: new Date() }, latitude: { gte: lat - d, lte: lat + d }, longitude: { gte: lng - d * 1.4, lte: lng + d * 1.4 } },
    orderBy: { startsAt: "asc" },
    take: 4,
  });
  return events.map(toPublicEvent);
}
