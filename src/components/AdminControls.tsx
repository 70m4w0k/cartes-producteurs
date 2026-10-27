"use client";

import { useActionState, useTransition } from "react";
import type { ProducerStatus } from "@prisma/client";
import { createRelayPoint, setProducerStatus, setRelayPointActive } from "@/app/actions/admin";
import { COMMUNE_NAMES } from "@/lib/communes";
import type { FormState } from "@/lib/validation";

export function ProducerStatusButtons({ id, status }: { id: string; status: ProducerStatus }) {
  const [pending, start] = useTransition();
  const set = (s: ProducerStatus) => start(() => setProducerStatus(id, s));
  return (
    <div className="flex gap-2">
      {status !== "APPROVED" && <button disabled={pending} className="btn text-sm" onClick={() => set("APPROVED")}>Valider</button>}
      {status !== "SUSPENDED" && <button disabled={pending} className="btn-ghost text-sm text-red-700" onClick={() => set("SUSPENDED")}>Suspendre</button>}
    </div>
  );
}

export function RelayActiveToggle({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button disabled={pending} className="btn-ghost text-sm" onClick={() => start(() => setRelayPointActive(id, !active))}>
      {active ? "Désactiver" : "Réactiver"}
    </button>
  );
}

export function RelayPointForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createRelayPoint, {});
  return (
    <form action={action} className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <h3 className="font-semibold">Nouveau point relais</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Nom<input name="name" required className="field mt-1" placeholder="Office de tourisme d'Ax" /></label>
        <label className="block text-sm">
          Commune
          <select name="commune" className="field mt-1" defaultValue="Ax-les-Thermes">
            {COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">Adresse<input name="address" required className="field mt-1" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">Latitude<input name="latitude" required inputMode="decimal" className="field mt-1" placeholder="42.7208" /></label>
        <label className="block text-sm">Longitude<input name="longitude" required inputMode="decimal" className="field mt-1" placeholder="1.8386" /></label>
      </div>
      <label className="block text-sm">Horaires<input name="openingHours" className="field mt-1" /></label>
      <label className="block text-sm">Description<input name="description" className="field mt-1" /></label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <button className="btn" disabled={pending}>Créer</button>
    </form>
  );
}
