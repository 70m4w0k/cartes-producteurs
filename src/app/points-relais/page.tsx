import Link from "next/link";
import { LazyProducerMap } from "@/components/LazyMap";
import { CATEGORY_ICONS } from "@/lib/labels";
import { getPublicRelayPoints } from "@/lib/queries";

export const dynamic = "force-dynamic";
export const metadata = { title: "Points relais · Producteurs de la vallée d'Ax" };

export default async function RelayPointsPage() {
  const relayPoints = await getPublicRelayPoints();
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">📦 Points relais</h1>
        <p className="text-stone-600">
          Des lieux de la vallée où les producteurs déposent leurs produits : pratique pour tout récupérer au même endroit.
        </p>
      </div>
      <div className="h-80 overflow-hidden rounded-xl border border-stone-200">
        <LazyProducerMap producers={[]} relayPoints={relayPoints} zoom={11} />
      </div>
      {relayPoints.length === 0 && <p className="text-stone-500">Aucun point relais pour le moment.</p>}
      <ul className="grid gap-4 sm:grid-cols-2">
        {relayPoints.map((r) => (
          <li key={r.id} id={r.id} className="scroll-mt-4 rounded-xl border border-stone-200 bg-white p-4 target:ring-2 target:ring-blue-500">
            <h2 className="font-semibold">{r.name}</h2>
            <p className="text-sm text-stone-600">{r.address}</p>
            {r.openingHours && <p className="mt-1 text-sm">🕒 {r.openingHours}</p>}
            {r.description && <p className="mt-1 text-sm text-stone-700">{r.description}</p>}
            <h3 className="mt-3 text-sm font-semibold">Producteurs présents</h3>
            {r.producers.length === 0 ? (
              <p className="text-sm text-stone-500">Aucun pour l&apos;instant.</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-sm">
                {r.producers.map((p) => (
                  <li key={p.id}>
                    {CATEGORY_ICONS[p.category]}{" "}
                    <Link href={`/producteurs/${p.id}`} className="underline">{p.displayName}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
