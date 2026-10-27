import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { LazyProducerMap } from "@/components/LazyMap";
import { StockBadge } from "@/components/StockBadge";
import { CATEGORY_ICONS, CATEGORY_LABELS, formatPrice } from "@/lib/labels";
import { getPublicProducer } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getPublicProducer((await params).id);
  return { title: data ? `${data.producer.displayName} · Producteurs de la vallée d'Ax` : "Producteur introuvable" };
}

export default async function ProducerPage({ params }: Params) {
  const data = await getPublicProducer((await params).id);
  if (!data) notFound();
  const { producer: p, relayPoints } = data;
  const hasDirectContact = p.phone || p.email;

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Retour à la carte</Link>

      <header className="flex items-start gap-4">
        <span className="text-5xl" aria-hidden>{CATEGORY_ICONS[p.category]}</span>
        <div>
          <h1 className="text-2xl font-bold">{p.displayName}</h1>
          <p className="text-stone-600">{CATEGORY_LABELS[p.category]} · {p.commune}</p>
          {p.isPseudonym && (
            <p className="mt-1 text-sm italic text-stone-500">Ce producteur a choisi de rester anonyme.</p>
          )}
        </div>
      </header>

      {p.closed && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <strong>Fermé temporairement.</strong> {p.closedNote}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          {p.description && <p className="whitespace-pre-line">{p.description}</p>}

          <section>
            <h2 className="mb-2 text-lg font-semibold">Produits</h2>
            {p.products.length === 0 ? (
              <p className="text-stone-500">Aucun produit renseigné pour le moment.</p>
            ) : (
              <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
                {p.products.map((pr) => (
                  <li key={pr.id} className="flex flex-wrap items-start justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="font-medium">{pr.name}</p>
                      {pr.description && <p className="text-sm text-stone-600">{pr.description}</p>}
                      <p className="text-sm text-stone-700">
                        {formatPrice(pr.priceCents)}
                        {pr.unit && pr.priceCents !== null && ` ${pr.unit}`}
                      </p>
                    </div>
                    <StockBadge status={pr.stockStatus} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {p.pickupInfo && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">Retrait sur place</h2>
              <p className="whitespace-pre-line">{p.pickupInfo}</p>
            </section>
          )}

          {relayPoints.length > 0 && (
            <section>
              <h2 className="mb-2 text-lg font-semibold">📦 Disponible aussi en point relais</h2>
              <ul className="space-y-2">
                {relayPoints.map((r) => (
                  <li key={r.id} className="rounded-lg border border-stone-200 bg-white p-3">
                    <Link href={`/points-relais#${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                    <p className="text-sm text-stone-600">{r.address}</p>
                    {r.openingHours && <p className="text-sm">{r.openingHours}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4">
          <div className="h-64 overflow-hidden rounded-xl border border-stone-200">
            <LazyProducerMap producers={[p]} zoom={13} linkToProducer={false} />
          </div>
          <div className="space-y-1 rounded-xl border border-stone-200 bg-white p-4 text-sm">
            <h2 className="mb-1 font-semibold">Coordonnées</h2>
            {p.address ? <p>📍 {p.address}</p> : <p>📍 Commune de {p.commune}{p.location.precision === "approximate" && " (position approximative)"}</p>}
            {p.phone && <p>📞 <a href={`tel:${p.phone.replace(/\s/g, "")}`} className="underline">{p.phone}</a></p>}
            {p.email && <p>✉️ <a href={`mailto:${p.email}`} className="underline">{p.email}</a></p>}
            {p.website && <p>🌐 <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="underline">{p.website.replace(/^https?:\/\//, "")}</a></p>}
            {p.address && (
              <a
                className="btn mt-2"
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.openstreetmap.org/directions?to=${p.location.lat},${p.location.lng}`}
              >
                Itinéraire
              </a>
            )}
          </div>
          <div className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="mb-2 font-semibold">{hasDirectContact ? "Ou écrire au producteur" : "Contacter le producteur"}</h2>
            <ContactForm producerId={p.id} />
          </div>
        </aside>
      </div>
    </div>
  );
}
