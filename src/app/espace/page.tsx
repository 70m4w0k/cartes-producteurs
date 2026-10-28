import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MessageList } from "@/components/MessageList";
import { OrdersInbox, type InboxOrder } from "@/components/OrdersInbox";
import { ProductManager } from "@/components/ProductManager";
import { ProfileForm } from "@/components/ProfileForm";
import { SlotManager } from "@/components/SlotManager";
import { db } from "@/lib/db";
import { requireProducer } from "@/lib/session";
import { addDays as addDaysIso, parisNow } from "@/lib/slots";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon espace · Producteurs de la vallée d'Ax" };

const STATUS_BANNER = {
  PENDING: { cls: "bg-amber-50 text-amber-900 border-amber-200", text: "Votre fiche est en attente de validation. Vous pouvez déjà la compléter : elle sera visible dès qu'elle sera validée." },
  APPROVED: { cls: "bg-emerald-50 text-emerald-900 border-emerald-200", text: "Votre fiche est en ligne." },
  SUSPENDED: { cls: "bg-red-50 text-red-900 border-red-200", text: "Votre fiche est suspendue et n'est pas visible. Contactez l'administrateur du site." },
} as const;

export default async function ProducerSpacePage() {
  const { id } = await requireProducer();
  const [producer, relayPoints, messages, orders] = await Promise.all([
    db.producer.findUniqueOrThrow({
      where: { id },
      include: {
        products: { orderBy: { name: "asc" } },
        relayPoints: { where: { active: true }, select: { id: true, name: true } },
        pickupSlots: { include: { relayPoint: true }, orderBy: [{ weekday: "asc" }, { startMinutes: "asc" }] },
      },
    }),
    db.relayPoint.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.contactMessage.findMany({ where: { producerId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
    db.producerOrder.findMany({
      where: { producerId: id },
      include: { order: true, items: true, relayPoint: true },
      orderBy: [{ pickupDate: "asc" }, { startMinutes: "asc" }],
      take: 300,
    }),
  ]);
  const today = parisNow().date;
  const toInbox = (o: (typeof orders)[number]): InboxOrder => ({
    id: o.id,
    status: o.status,
    pickupDate: o.pickupDate,
    startMinutes: o.startMinutes,
    endMinutes: o.endMinutes,
    place: o.relayPoint ? `📦 ${o.relayPoint.name}` : "Chez vous",
    atFarm: o.relayPointId === null,
    customerName: o.order.customerName,
    customerEmail: o.order.customerEmail,
    customerPhone: o.order.customerPhone,
    customerNote: o.customerNote,
    producerNote: o.producerNote,
    items: o.items.map(({ id, name, unit, priceCents, quantity }) => ({ id, name, unit, priceCents, quantity })),
  });
  // En cours : à traiter, ou confirmées dont la date n'est pas encore passée de plus d'une semaine.
  const isActive = (o: (typeof orders)[number]) =>
    o.status === "PENDING" || (["CONFIRMED", "READY"].includes(o.status) && o.pickupDate >= addDaysIso(today, -7));
  const activeOrders = orders.filter(isActive).map(toInbox);
  const pastOrders = orders.filter((o) => !isActive(o)).reverse().map(toInbox);
  const pendingOrders = activeOrders.filter((o) => o.status === "PENDING").length;
  const unread = messages.filter((m) => !m.read).length;
  const banner = STATUS_BANNER[producer.status];

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Mon espace</h1>
        <div className="flex gap-2">
          {producer.status === "APPROVED" && <Link href={`/producteurs/${producer.id}`} className="btn-ghost">Voir ma fiche publique</Link>}
          <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
        </div>
      </div>

      <p className={`rounded-lg border p-3 text-sm ${banner.cls}`}>{banner.text}</p>

      <nav className="flex flex-wrap gap-4 text-sm">
        <a href="#commandes" className="underline">Commandes{pendingOrders > 0 && ` (${pendingOrders} à traiter)`}</a>
        <a href="#creneaux" className="underline">Créneaux de retrait</a>
        <a href="#produits" className="underline">Produits &amp; stock</a>
        <a href="#messages" className="underline">Messages{unread > 0 && ` (${unread})`}</a>
        <a href="#fiche" className="underline">Fiche &amp; visibilité</a>
      </nav>

      <section id="commandes" className="scroll-mt-4">
        <h2 className="mb-3 text-xl font-semibold">
          Commandes {pendingOrders > 0 && <span className="rounded-full bg-amber-500 px-2 text-sm text-white">{pendingOrders} à traiter</span>}
        </h2>
        <OrdersInbox active={activeOrders} past={pastOrders} visibility={producer.visibility} />
      </section>

      <section id="creneaux" className="scroll-mt-4">
        <h2 className="mb-1 text-xl font-semibold">Créneaux de retrait</h2>
        <p className="mb-3 text-sm text-stone-600">Les moments où les clients peuvent venir chercher leur commande. Paiement sur place.</p>
        <SlotManager
          slots={producer.pickupSlots.map((s) => ({
            id: s.id,
            weekday: s.weekday,
            startMinutes: s.startMinutes,
            endMinutes: s.endMinutes,
            place: s.relayPoint ? `📦 ${s.relayPoint.name}${s.relayPoint.active ? "" : " (désactivé)"}` : "Chez moi",
          }))}
          relayPoints={producer.relayPoints}
        />
      </section>

      <section id="produits" className="scroll-mt-4">
        <h2 className="mb-3 text-xl font-semibold">Produits &amp; stock</h2>
        <ProductManager products={producer.products} />
      </section>

      <section id="messages" className="scroll-mt-4">
        <h2 className="mb-3 text-xl font-semibold">Messages {unread > 0 && <span className="rounded-full bg-moss-700 px-2 text-sm text-white">{unread}</span>}</h2>
        <MessageList messages={messages} />
      </section>

      <section id="fiche" className="scroll-mt-4">
        <ProfileForm producer={producer} relayPoints={relayPoints} />
      </section>
    </div>
  );
}
