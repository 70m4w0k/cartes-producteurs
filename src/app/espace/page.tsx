import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MessageList } from "@/components/MessageList";
import { ProductManager } from "@/components/ProductManager";
import { ProfileForm } from "@/components/ProfileForm";
import { db } from "@/lib/db";
import { requireProducer } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Mon espace · Producteurs de la vallée d'Ax" };

const STATUS_BANNER = {
  PENDING: { cls: "bg-amber-50 text-amber-900 border-amber-200", text: "Votre fiche est en attente de validation. Vous pouvez déjà la compléter : elle sera visible dès qu'elle sera validée." },
  APPROVED: { cls: "bg-emerald-50 text-emerald-900 border-emerald-200", text: "Votre fiche est en ligne." },
  SUSPENDED: { cls: "bg-red-50 text-red-900 border-red-200", text: "Votre fiche est suspendue et n'est pas visible. Contactez l'administrateur du site." },
} as const;

export default async function ProducerSpacePage() {
  const { id } = await requireProducer();
  const [producer, relayPoints, messages] = await Promise.all([
    db.producer.findUniqueOrThrow({
      where: { id },
      include: { products: { orderBy: { name: "asc" } }, relayPoints: { select: { id: true } } },
    }),
    db.relayPoint.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.contactMessage.findMany({ where: { producerId: id }, orderBy: { createdAt: "desc" }, take: 100 }),
  ]);
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

      <nav className="flex gap-4 text-sm">
        <a href="#produits" className="underline">Produits &amp; stock</a>
        <a href="#messages" className="underline">Messages{unread > 0 && ` (${unread})`}</a>
        <a href="#fiche" className="underline">Fiche &amp; visibilité</a>
      </nav>

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
