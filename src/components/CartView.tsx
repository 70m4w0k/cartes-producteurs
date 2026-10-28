"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { getCartDetails, placeOrder, type CartGroup } from "@/app/actions/orders";
import { CATEGORY_ICONS, formatPrice } from "@/lib/labels";
import { orderTotal } from "@/lib/orders";
import { formatWindow } from "@/lib/slots";
import type { Category } from "@prisma/client";
import { QuantityStepper } from "./AddToCart";
import { useCart } from "./cart";

function TotalLine({ items }: { items: { priceCents: number | null; quantity: number }[] }) {
  const t = orderTotal(items);
  return (
    <span>
      {formatPrice(t.cents)}
      {t.hasUnpriced && <span className="text-stone-500"> + prix sur demande</span>}
    </span>
  );
}

export function CartView() {
  const cart = useCart();
  const router = useRouter();
  const [groups, setGroups] = useState<CartGroup[] | null>(null);
  const [pickups, setPickups] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [submitting, startSubmit] = useTransition();

  // Recharge prix, stocks et créneaux à jour depuis le serveur à chaque changement du panier.
  const cartKey = JSON.stringify(cart.items);
  useEffect(() => {
    if (!cart.loaded) return;
    let cancelled = false;
    getCartDetails(cart.items).then((g) => !cancelled && setGroups(g));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartKey, cart.loaded]);

  // Retire du panier les produits qui n'existent plus.
  useEffect(() => {
    if (!groups) return;
    const known = new Set(groups.flatMap((g) => g.items.map((i) => i.productId)));
    cart.items.filter((i) => !known.has(i.productId)).forEach((i) => cart.remove(i.productId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  const orderable = useMemo(
    () => (groups ?? []).filter((g) => !g.unavailable).map((g) => ({ ...g, items: g.items.filter((i) => i.orderable) })).filter((g) => g.items.length > 0),
    [groups],
  );

  if (!cart.loaded || groups === null) return <p className="text-stone-500">Chargement du panier…</p>;

  if (groups.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 p-8 text-center">
        <p className="text-stone-600">Votre panier est vide.</p>
        <Link href="/" className="btn mt-4">Découvrir les producteurs</Link>
      </div>
    );
  }

  const submit = (form: FormData) => {
    setError("");
    const missing = orderable.find((g) => !pickups[g.producer.id]);
    if (missing) return setError(`Choisissez un créneau de retrait pour ${missing.producer.displayName}.`);
    startSubmit(async () => {
      const result = await placeOrder({
        customerName: form.get("customerName"),
        customerEmail: form.get("customerEmail"),
        customerPhone: form.get("customerPhone"),
        groups: orderable.map((g) => ({
          producerId: g.producer.id,
          pickup: pickups[g.producer.id],
          note: notes[g.producer.id] ?? "",
          items: g.items.map(({ productId, quantity }) => ({ productId, quantity })),
        })),
      });
      if ("error" in result) {
        setError(result.error);
        getCartDetails(cart.items).then(setGroups);
        return;
      }
      // Les produits non commandables restent dans le panier.
      orderable.forEach((g) => g.items.forEach((i) => cart.remove(i.productId)));
      router.push(`/commande/${result.token}`);
    });
  };

  return (
    <form action={submit} className="space-y-6">
      {groups.map((g) => (
        <section key={g.producer.id} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">
            {CATEGORY_ICONS[g.producer.category as Category]}{" "}
            <Link href={`/producteurs/${g.producer.id}`} className="hover:underline">{g.producer.displayName}</Link>
          </h2>
          {g.unavailable && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">{g.unavailable}</p>}
          <ul className="divide-y divide-stone-100">
            {g.items.map((i) => (
              <li key={i.productId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <div className="min-w-0">
                  <p className={i.orderable ? "" : "text-stone-400 line-through"}>{i.name}</p>
                  <p className="text-sm text-stone-600">
                    {formatPrice(i.priceCents)} {i.priceCents !== null && i.unit}
                    {!i.orderable && <span className="ml-2 text-red-700 no-underline">Plus disponible</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <QuantityStepper value={i.quantity} onChange={(v) => cart.setQuantity(i.productId, v)} label={`Quantité de ${i.name}`} />
                  <button type="button" className="text-sm text-red-700 underline" onClick={() => cart.remove(i.productId)}>
                    Retirer
                  </button>
                </div>
              </li>
            ))}
          </ul>
          {!g.unavailable && g.items.some((i) => i.orderable) && (
            <>
              <label className="block text-sm">
                Retrait
                <select
                  required
                  className="field mt-1"
                  value={pickups[g.producer.id] ?? ""}
                  onChange={(e) => setPickups((p) => ({ ...p, [g.producer.id]: e.target.value }))}
                >
                  <option value="" disabled>Choisir un créneau…</option>
                  {g.pickupOptions.map((o) => (
                    <option key={o.key} value={o.key}>
                      {formatWindow(o)} · {o.place}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm">
                Message au producteur (facultatif)
                <input
                  className="field mt-1"
                  maxLength={1000}
                  value={notes[g.producer.id] ?? ""}
                  onChange={(e) => setNotes((n) => ({ ...n, [g.producer.id]: e.target.value }))}
                />
              </label>
              <p className="text-right text-sm">
                Sous-total : <strong><TotalLine items={g.items.filter((i) => i.orderable)} /></strong>
              </p>
            </>
          )}
        </section>
      ))}

      {orderable.length > 0 && (
        <section className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="font-semibold">Vos coordonnées</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">Nom<input name="customerName" required autoComplete="name" className="field mt-1" /></label>
            <label className="block text-sm">E-mail<input name="customerEmail" type="email" required autoComplete="email" className="field mt-1" /></label>
            <label className="block text-sm">Téléphone (facultatif)<input name="customerPhone" type="tel" autoComplete="tel" className="field mt-1" /></label>
          </div>
          <p className="text-xs text-stone-500">
            Vos coordonnées sont transmises uniquement aux producteurs concernés. Vous recevrez un lien pour suivre votre commande.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-3">
            <p>
              Total : <strong><TotalLine items={orderable.flatMap((g) => g.items)} /></strong>
              <br />
              <span className="text-sm text-stone-600">💶 Paiement sur place, au moment du retrait.</span>
            </p>
            <button className="btn" disabled={submitting}>{submitting ? "Envoi…" : "Envoyer la commande"}</button>
          </div>
          {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
        </section>
      )}
    </form>
  );
}
