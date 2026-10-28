"use client";

import { useActionState, useTransition } from "react";
import { addPickupSlot, deletePickupSlot } from "@/app/actions/producer";
import { formatMinutes, WEEKDAY_LABELS } from "@/lib/slots";
import type { FormState } from "@/lib/validation";

type Slot = { id: string; weekday: number; startMinutes: number; endMinutes: number; place: string };

export function SlotManager({ slots, relayPoints }: { slots: Slot[]; relayPoints: { id: string; name: string }[] }) {
  const [state, action, saving] = useActionState<FormState, FormData>(addPickupSlot, {});
  const [pending, start] = useTransition();

  return (
    <div className="space-y-3">
      {slots.length === 0 ? (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Ajoutez au moins un créneau pour que les visiteurs puissent commander en ligne.
        </p>
      ) : (
        <ul className="divide-y divide-stone-200 rounded-xl border border-stone-200 bg-white">
          {slots.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 p-3 text-sm">
              <span>
                <strong>{WEEKDAY_LABELS[s.weekday]}</strong> {formatMinutes(s.startMinutes)} – {formatMinutes(s.endMinutes)} · {s.place}
              </span>
              <button type="button" disabled={pending} className="text-red-700 underline" onClick={() => start(() => deletePickupSlot(s.id))}>
                Supprimer
              </button>
            </li>
          ))}
        </ul>
      )}
      <form action={action} className="grid gap-3 rounded-xl border border-dashed border-stone-300 bg-white p-4 sm:grid-cols-[1fr_auto_auto_1.5fr_auto] sm:items-end">
        <label className="block text-sm">
          Jour
          <select name="weekday" className="field mt-1" defaultValue="6">
            {WEEKDAY_LABELS.slice(1).map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
          </select>
        </label>
        <label className="block text-sm">De<input name="start" type="time" required defaultValue="09:00" className="field mt-1" /></label>
        <label className="block text-sm">À<input name="end" type="time" required defaultValue="12:00" className="field mt-1" /></label>
        <label className="block text-sm">
          Lieu
          <select name="relayPointId" className="field mt-1" defaultValue="">
            <option value="">Chez moi</option>
            {relayPoints.map((r) => <option key={r.id} value={r.id}>📦 {r.name}</option>)}
          </select>
        </label>
        <button className="btn" disabled={saving}>Ajouter</button>
        {(state.error || state.ok) && (
          <p className={`text-sm sm:col-span-5 ${state.error ? "text-red-700" : "text-emerald-700"}`}>{state.error ?? state.ok}</p>
        )}
      </form>
      {relayPoints.length === 0 && (
        <p className="text-xs text-stone-500">Pour proposer un retrait en point relais, cochez d&apos;abord vos points relais dans votre fiche ci-dessous.</p>
      )}
    </div>
  );
}
