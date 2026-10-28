"use client";

import { useState, useTransition } from "react";
import type { OrderStatus, Visibility } from "@prisma/client";
import { updateOrderStatus } from "@/app/actions/producer";
import { formatPrice } from "@/lib/labels";
import { ORDER_STATUS_LABELS, ORDER_STATUS_STYLES, orderTotal, PRODUCER_TRANSITIONS } from "@/lib/orders";
import { formatWindow } from "@/lib/slots";

export type InboxOrder = {
  id: string;
  status: OrderStatus;
  pickupDate: string;
  startMinutes: number;
  endMinutes: number;
  place: string;
  atFarm: boolean;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerNote: string;
  producerNote: string;
  items: { id: string; name: string; unit: string; priceCents: number | null; quantity: number }[];
};

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "✅ Confirmer",
  READY: "📦 Prête",
  PICKED_UP: "🤝 Retirée",
  REJECTED: "Refuser",
};

function OrderCard({ order, visibility }: { order: InboxOrder; visibility: Visibility }) {
  const [pending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const total = orderTotal(order.items);
  const actions = PRODUCER_TRANSITIONS[order.status];

  const run = (status: OrderStatus, msg = "") =>
    start(async () => {
      const res = await updateOrderStatus(order.id, status, msg);
      setError(res.error ?? "");
      if (!res.error) setRejecting(false);
    });

  return (
    <li className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold first-letter:uppercase">{formatWindow({ date: order.pickupDate, startMinutes: order.startMinutes, endMinutes: order.endMinutes })}</p>
          <p className="text-sm text-stone-600">{order.place}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${ORDER_STATUS_STYLES[order.status]}`}>{ORDER_STATUS_LABELS[order.status]}</span>
      </div>
      <p className="text-sm">
        👤 <strong>{order.customerName}</strong> · <a className="underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>
        {order.customerPhone && <> · <a className="underline" href={`tel:${order.customerPhone.replace(/\s/g, "")}`}>{order.customerPhone}</a></>}
      </p>
      <ul className="text-sm">
        {order.items.map((i) => (
          <li key={i.id}>{i.quantity} × {i.name} {i.unit && <span className="text-stone-500">({i.unit})</span>}</li>
        ))}
      </ul>
      <p className="text-sm">
        Total : <strong>{formatPrice(total.cents)}</strong>
        {total.hasUnpriced && " + prix sur demande"}
      </p>
      {order.customerNote && <p className="rounded bg-stone-50 p-2 text-sm">💬 {order.customerNote}</p>}
      {order.producerNote && <p className="text-sm text-stone-600">Votre réponse : {order.producerNote}</p>}

      {order.status === "PENDING" && order.atFarm && visibility !== "PUBLIC" && (
        <p className="text-xs text-stone-500">🔒 En confirmant, votre nom, votre adresse et votre téléphone seront communiqués à ce client uniquement.</p>
      )}

      {actions.length > 0 && !rejecting && (
        <div className="flex flex-wrap gap-2">
          {actions.map((s) =>
            s === "REJECTED" ? (
              <button key={s} type="button" className="btn-ghost text-red-700" disabled={pending} onClick={() => setRejecting(true)}>
                {ACTION_LABELS[s]}
              </button>
            ) : (
              <button key={s} type="button" className="btn" disabled={pending} onClick={() => run(s)}>
                {ACTION_LABELS[s]}
              </button>
            ),
          )}
        </div>
      )}
      {rejecting && (
        <div className="space-y-2">
          <textarea className="field" rows={2} placeholder="Motif (envoyé au client) : rupture, créneau impossible…" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex gap-2">
            <button type="button" className="btn bg-red-700" disabled={pending} onClick={() => run("REJECTED", note)}>Confirmer le refus</button>
            <button type="button" className="btn-ghost" onClick={() => setRejecting(false)}>Annuler</button>
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}
    </li>
  );
}

export function OrdersInbox({ active, past, visibility }: { active: InboxOrder[]; past: InboxOrder[]; visibility: Visibility }) {
  return (
    <div className="space-y-3">
      {active.length === 0 && <p className="text-stone-500">Aucune commande en cours.</p>}
      <ul className="space-y-3">
        {active.map((o) => <OrderCard key={o.id} order={o} visibility={visibility} />)}
      </ul>
      {past.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm text-stone-600">Historique ({past.length})</summary>
          <ul className="mt-3 space-y-3">
            {past.map((o) => <OrderCard key={o.id} order={o} visibility={visibility} />)}
          </ul>
        </details>
      )}
    </div>
  );
}
