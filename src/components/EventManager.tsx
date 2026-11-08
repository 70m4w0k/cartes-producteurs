"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteEvent, saveEvent } from "@/app/actions/places";
import { subcategoriesOf, subIcon, KINDS } from "@/lib/categories";
import { COMMUNE_NAMES } from "@/lib/communes";
import { addDays, formatDate, formatMinutes, parisNow } from "@/lib/hours";
import type { FormState } from "@/lib/validation";
import { LazyLocationPicker } from "./LazyMap";

export type ManagedEvent = {
  id: string; title: string; subcategory: string; tagline: string; description: string; programme: string[]; commune: string; address: string;
  latitude: number; longitude: number; startsAt: string; endsAt: string; price: string; organiser: string; status: string;
};

const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

function EventForm({ event, organiserPlaceId, defaultCommune, onDone }: { event?: ManagedEvent; organiserPlaceId: string | null; defaultCommune: string; onDone?: () => void }) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, form) => {
    const res = await saveEvent(event?.id ?? null, organiserPlaceId, prev, form);
    if (res.ok) onDone?.();
    return res;
  }, {});
  const s = event ? parisNow(new Date(event.startsAt)) : null;
  const e = event ? parisNow(new Date(event.endsAt)) : null;
  const [position, setPosition] = useState(event ? { lat: event.latitude, lng: event.longitude } : null);
  const [showMap, setShowMap] = useState(false);
  const [sub, setSub] = useState(event?.subcategory ?? "fete");
  const today = parisNow().date;

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <label className="block text-sm">Titre<input name="title" required defaultValue={event?.title} className="field mt-1" placeholder="Portes ouvertes à la ferme" /></label>
        <label className="block text-sm">Type
          <select name="subcategory" className="field mt-1" value={sub} onChange={(ev) => setSub(ev.target.value)}>
            {subcategoriesOf("EVENEMENT").map(([id, c]) => <option key={id} value={id}>{c.icon} {c.label}</option>)}
          </select>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block text-sm">Date<input type="date" name="date" required min={today} defaultValue={s?.date ?? addDays(today, 7)} className="field mt-1" /></label>
        <label className="block text-sm">Début<input type="time" name="start" required defaultValue={s ? hhmm(s.minutes) : "10:00"} className="field mt-1" /></label>
        <label className="block text-sm">Fin<input type="time" name="end" required defaultValue={e ? hhmm(e.minutes) : "17:00"} className="field mt-1" /></label>
        <label className="block text-sm">Jusqu&apos;au (si plusieurs jours)<input type="date" name="endDate" defaultValue={e && s && e.date !== s.date ? e.date : ""} className="field mt-1" /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">Commune
          <select name="commune" className="field mt-1" defaultValue={event?.commune ?? defaultCommune}>{COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="block text-sm">Lieu précis / adresse<input name="address" defaultValue={event?.address} className="field mt-1" placeholder="Place du village" /></label>
        <label className="block text-sm">Tarif<input name="price" defaultValue={event?.price ?? "Gratuit"} className="field mt-1" /></label>
      </div>
      <label className="block text-sm">Accroche<input name="tagline" defaultValue={event?.tagline} maxLength={160} className="field mt-1" /></label>
      <label className="block text-sm">Description<textarea name="description" rows={3} defaultValue={event?.description} className="field mt-1" /></label>
      <label className="block text-sm">Programme (une ligne par horaire)<textarea name="programme" rows={3} defaultValue={event?.programme.join("\n")} className="field mt-1" placeholder={"10 h : ouverture\n15 h : dégustation"} /></label>
      <label className="block text-sm">Organisateur (si différent de votre fiche)<input name="organiser" defaultValue={event?.organiser} className="field mt-1" /></label>
      <div className="space-y-2">
        <button type="button" className="text-sm underline" onClick={() => setShowMap((v) => !v)}>{showMap ? "Masquer la carte" : "Placer précisément sur la carte (facultatif)"}</button>
        {showMap && <div className="h-64 overflow-hidden rounded-xl border border-stone-200"><LazyLocationPicker value={position} onChange={setPosition} emoji={subIcon(sub)} color={KINDS.EVENEMENT.color} /></div>}
        <input type="hidden" name="latitude" value={position?.lat ?? ""} />
        <input type="hidden" name="longitude" value={position?.lng ?? ""} />
      </div>
      {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      <button className="btn" disabled={pending}>{event ? "Enregistrer" : "Publier l'événement"}</button>
    </form>
  );
}

function EventRow({ event, organiserPlaceId, defaultCommune }: { event: ManagedEvent; organiserPlaceId: string | null; defaultCommune: string }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const s = parisNow(new Date(event.startsAt));
  const e = parisNow(new Date(event.endsAt));
  return (
    <li className="space-y-3 rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-bold">{subIcon(event.subcategory)} {event.title}</p>
          <p className="text-sm text-stone-600 first-letter:uppercase">{formatDate(s.date)}, {formatMinutes(s.minutes)} – {formatMinutes(e.minutes)} · {event.commune}</p>
          {event.status !== "APPROVED" && <p className="text-xs text-amber-800">{event.status === "PENDING" ? "En attente de validation" : "Masqué par l'administration"}</p>}
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost text-sm" onClick={() => setEditing((v) => !v)}>{editing ? "Fermer" : "Modifier"}</button>
          {confirming ? (
            <button type="button" className="btn-ghost text-sm text-red-700" disabled={pending} onClick={() => start(() => deleteEvent(event.id))}>Confirmer la suppression</button>
          ) : (
            <button type="button" className="btn-ghost text-sm text-red-700" onClick={() => setConfirming(true)}>Supprimer</button>
          )}
        </div>
      </div>
      {editing && <EventForm event={event} organiserPlaceId={organiserPlaceId} defaultCommune={defaultCommune} onDone={() => setEditing(false)} />}
    </li>
  );
}

export function EventManager({ events, organiserPlaceId, defaultCommune }: { events: ManagedEvent[]; organiserPlaceId: string | null; defaultCommune: string }) {
  const [formKey, setFormKey] = useState(0);
  return (
    <div className="space-y-4">
      {events.length === 0 ? <p className="text-stone-500">Aucun événement à venir.</p> : (
        <ul className="space-y-2">{events.map((e) => <EventRow key={e.id} event={e} organiserPlaceId={organiserPlaceId} defaultCommune={defaultCommune} />)}</ul>
      )}
      <details className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
        <summary className="cursor-pointer font-bold">➕ Ajouter un événement</summary>
        <p className="mt-2 text-sm text-stone-600">Portes ouvertes, dégustation, présence sur une foire… Il apparaît dans l&apos;agenda et sur la carte.</p>
        <div className="mt-3"><EventForm key={formKey} organiserPlaceId={organiserPlaceId} defaultCommune={defaultCommune} onDone={() => setFormKey((k) => k + 1)} /></div>
      </details>
    </div>
  );
}
