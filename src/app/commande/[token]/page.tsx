import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderView } from "@/app/actions/orders";
import { CancelOrderButton } from "@/components/CancelOrderButton";
import { RoutePlanner } from "@/components/RoutePlanner";
import { CATEGORY_ICONS, formatPrice } from "@/lib/labels";
import { ACTIVE_CONFIRMED, CUSTOMER_CANCELLABLE, ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, orderTotal } from "@/lib/orders";
import { formatWindow } from "@/lib/slots";

export const dynamic = "force-dynamic";
// Le lien est secret : on ne l'indexe pas et on ne le transmet pas aux sites externes (Google Maps…).
export const metadata: Metadata = {
  title: "Ma commande · Producteurs de la vallée d'Ax",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const order = await getOrderView((await params).token);
  if (!order) notFound();

  const routeDates = [
    ...new Set(order.producerOrders.filter((po) => ACTIVE_CONFIRMED.includes(po.status) && po.place.location).map((po) => po.pickupDate)),
  ].sort();
  const active = order.producerOrders.filter((po) => !["REJECTED", "CANCELLED"].includes(po.status));
  const total = orderTotal(active.flatMap((po) => po.items));
  const pendingCount = order.producerOrders.filter((po) => po.status === "PENDING").length;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
      <div>
        <h1 className="text-2xl font-bold">Ma commande</h1>
        <p className="text-stone-600">
          Passée le {order.createdAt.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", day: "numeric", month: "long" })} par {order.customerName}.
        </p>
        <p className="mt-2 rounded-lg bg-moss-50 p-3 text-sm">
          🔖 Gardez cette page dans vos favoris : son adresse est personnelle et vous permet de suivre votre commande. Elle vous a aussi été envoyée par e-mail.
        </p>
      </div>

      {pendingCount > 0 && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          ⏳ {pendingCount} producteur{pendingCount > 1 ? "s doivent" : " doit"} encore confirmer. Vous serez prévenu par e-mail.
        </p>
      )}

      <ul className="space-y-4">
        {order.producerOrders.map((po) => (
          <li key={po.id} className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h2 className="font-semibold">
                {CATEGORY_ICONS[po.category]}{" "}
                <Link href={`/producteurs/${po.producerId}`} className="hover:underline">{po.producerName}</Link>
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_STYLES[po.status]}`}>{ORDER_STATUS_LABELS[po.status]}</span>
            </div>
            <ul className="text-sm">
              {po.items.map((i) => (
                <li key={i.id} className="flex justify-between gap-2">
                  <span>{i.quantity} × {i.name} {i.unit && <span className="text-stone-500">({i.unit})</span>}</span>
                  <span className="tabular-nums">{i.priceCents === null ? "sur demande" : formatPrice(i.priceCents * i.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-stone-50 p-3 text-sm">
              <p className="first-letter:uppercase"><strong>{formatWindow({ date: po.pickupDate, startMinutes: po.startMinutes, endMinutes: po.endMinutes })}</strong></p>
              {po.place.kind === "relay" ? (
                <p>📦 {po.place.name} — {po.place.address}</p>
              ) : po.revealed ? (
                <>
                  <p>📍 {po.place.address || `Commune de ${po.place.commune}`}</p>
                  {po.place.phone && <p>📞 <a className="underline" href={`tel:${po.place.phone.replace(/\s/g, "")}`}>{po.place.phone}</a></p>}
                </>
              ) : (
                <p>📍 Chez le producteur, à {po.place.commune}. L&apos;adresse exacte s&apos;affichera ici dès la confirmation.</p>
              )}
            </div>
            {po.customerNote && <p className="text-sm text-stone-600">Votre message : {po.customerNote}</p>}
            {po.producerNote && <p className="text-sm">💬 Message du producteur : {po.producerNote}</p>}
            {CUSTOMER_CANCELLABLE.includes(po.status) && (
              <div className="text-right"><CancelOrderButton token={order.token} producerOrderId={po.id} /></div>
            )}
          </li>
        ))}
      </ul>

      <p className="text-right">
        Total : <strong>{formatPrice(total.cents)}</strong>
        {total.hasUnpriced && <span className="text-stone-500"> + produits à prix sur demande</span>}
        <br />
        <span className="text-sm text-stone-600">💶 À régler sur place, à chaque producteur.</span>
      </p>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">🧭 Itinéraire de retrait</h2>
        {routeDates.length === 0 ? (
          <p className="text-stone-500">L&apos;itinéraire sera disponible dès qu&apos;un producteur aura confirmé votre commande.</p>
        ) : (
          <RoutePlanner token={order.token} dates={routeDates} />
        )}
      </section>
    </div>
  );
}
