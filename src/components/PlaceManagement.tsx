import Link from "next/link";
import { updatePlace } from "@/app/actions/places";
import { db } from "@/lib/db";
import { KINDS, subLabel } from "@/lib/categories";
import { EventManager } from "./EventManager";
import { MessageList } from "./MessageList";
import { PlaceForm } from "./PlaceForm";
import { ProductManager } from "./ProductManager";

const STATUS_BANNER = {
  PENDING: { cls: "bg-amber-50 text-amber-900 border-amber-200", text: "Fiche en attente de validation. Vous pouvez déjà la compléter : elle sera visible dès qu'elle sera validée." },
  APPROVED: { cls: "bg-emerald-50 text-emerald-900 border-emerald-200", text: "Fiche en ligne." },
  SUSPENDED: { cls: "bg-red-50 text-red-900 border-red-200", text: "Fiche suspendue : elle n'est pas visible. Contactez l'administration." },
} as const;

/** Gestion complète d'une fiche : utilisée dans l'espace pro et dans l'administration. */
export async function PlaceManagement({ placeId, isAdmin }: { placeId: string; isAdmin: boolean }) {
  const [place, localPlaces, events, messages] = await Promise.all([
    db.place.findUniqueOrThrow({ where: { id: placeId }, include: { products: { orderBy: { name: "asc" } }, sellsAt: { select: { id: true } } } }),
    db.place.findMany({ where: { kind: "LOCAL", status: "APPROVED" }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    db.event.findMany({ where: { organiserPlaceId: placeId, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
    db.contactMessage.findMany({ where: { placeId }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
  const unread = messages.filter((m) => !m.read).length;
  const banner = STATUS_BANNER[place.status];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{place.name}</h1>
          <p className="text-stone-600">{KINDS[place.kind].icon} {KINDS[place.kind].one} · {subLabel(place.subcategory)} · {place.commune}</p>
        </div>
        {place.status === "APPROVED" && <Link href={`/lieux/${place.id}`} className="btn-ghost">Voir ma page publique</Link>}
      </div>
      <p className={`rounded-lg border p-3 text-sm ${banner.cls}`}>{banner.text}</p>

      <nav className="flex flex-wrap gap-2 text-sm">
        <a href="#fiche" className="btn-ghost">Ma fiche</a>
        {place.kind === "PRODUCTEUR" && <a href="#produits" className="btn-ghost">Produits & stock</a>}
        <a href="#evenements" className="btn-ghost">Événements ({events.length})</a>
        <a href="#messages" className="btn-ghost">Messages{unread ? ` (${unread} non lus)` : ""}</a>
      </nav>

      {place.kind === "PRODUCTEUR" && (
        <section id="produits" className="site-sec space-y-3">
          <h2 className="text-xl font-bold">Produits & stock</h2>
          <p className="text-sm text-stone-600">Un geste suffit pour signaler une rupture : les visiteurs voient la date de mise à jour.</p>
          <ProductManager placeId={place.id} products={place.products} />
        </section>
      )}

      <section id="evenements" className="site-sec space-y-3">
        <h2 className="text-xl font-bold">Événements</h2>
        <EventManager
          organiserPlaceId={place.id}
          defaultCommune={place.commune}
          events={events.map((e) => ({ ...e, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt.toISOString() }))}
        />
      </section>

      <section id="messages" className="site-sec space-y-3">
        <h2 className="text-xl font-bold">Messages {unread > 0 && <span className="count">{unread}</span>}</h2>
        <MessageList messages={messages} />
      </section>

      <section id="fiche" className="site-sec space-y-3">
        <h2 className="text-xl font-bold">Ma fiche</h2>
        <PlaceForm
          place={place}
          action={updatePlace.bind(null, place.id)}
          localPlaces={localPlaces.filter((l) => l.id !== place.id)}
          sellsAt={place.sellsAt.map((s) => s.id)}
          canChangeKind={isAdmin}
        />
      </section>
    </div>
  );
}
