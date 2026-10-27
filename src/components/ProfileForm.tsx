"use client";

import { useActionState, useState } from "react";
import type { Producer, RelayPoint, Visibility } from "@prisma/client";
import { updateProfile } from "@/app/actions/producer";
import { COMMUNE_NAMES } from "@/lib/communes";
import { CATEGORY_ICONS, CATEGORY_LABELS, CATEGORY_TRADE, VISIBILITY_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation";
import { LazyLocationPicker } from "./LazyMap";

type Props = { producer: Producer & { relayPoints: Pick<RelayPoint, "id">[] }; relayPoints: RelayPoint[] };

export function ProfileForm({ producer, relayPoints }: Props) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateProfile, {});
  const [visibility, setVisibility] = useState<Visibility>(producer.visibility);
  const [category, setCategory] = useState(producer.category);
  const [commune, setCommune] = useState(producer.commune);
  const [closed, setClosed] = useState(producer.closed);
  const [position, setPosition] = useState(
    producer.latitude !== null && producer.longitude !== null ? { lat: producer.latitude, lng: producer.longitude } : null,
  );
  const [geoError, setGeoError] = useState("");
  const selectedRelays = new Set(producer.relayPoints.map((r) => r.id));

  const useMyPosition = () => {
    setGeoError("");
    if (!navigator.geolocation) return setGeoError("Géolocalisation indisponible sur cet appareil.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGeoError("Impossible d'obtenir votre position."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">Visibilité de votre exploitation</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => (
            <label
              key={v}
              className={`cursor-pointer rounded-xl border p-3 ${visibility === v ? "border-moss-700 bg-moss-50 ring-1 ring-moss-700" : "border-stone-300 bg-white"}`}
            >
              <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="mr-2" />
              <span className="font-semibold">{VISIBILITY_LABELS[v].title}</span>
              <p className="mt-1 text-sm text-stone-600">{VISIBILITY_LABELS[v].help}</p>
            </label>
          ))}
        </div>
        {visibility === "ANONYMOUS" && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Vous apparaîtrez comme « {CATEGORY_TRADE[category]} à {commune} ». Pensez à ne pas mettre d&apos;éléments qui vous identifient dans la description.
          </p>
        )}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">Votre fiche</legend>
        <label className="block text-sm">
          Nom de l&apos;exploitation {visibility === "ANONYMOUS" && <em className="text-stone-500">(non affiché en mode anonyme)</em>}
          <input name="name" defaultValue={producer.name} required className="field mt-1" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            Activité
            <select name="category" value={category} onChange={(e) => setCategory(e.target.value as typeof category)} className="field mt-1">
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label className="block text-sm">
            Commune
            <select name="commune" value={commune} onChange={(e) => setCommune(e.target.value)} className="field mt-1">
              {COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">
          Présentation
          <textarea name="description" defaultValue={producer.description} rows={4} className="field mt-1" />
        </label>
        <label className="block text-sm">
          Retrait des produits (jours, horaires, conditions)
          <textarea name="pickupInfo" defaultValue={producer.pickupInfo} rows={2} className="field mt-1" placeholder="Ex. : le samedi de 9 h à 12 h, ou sur rendez-vous" />
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-semibold">Coordonnées</legend>
        {visibility !== "PUBLIC" && (
          <p className="text-sm text-stone-600">
            🔒 En mode {VISIBILITY_LABELS[visibility].title.toLowerCase()}, l&apos;adresse, le téléphone et l&apos;e-mail ne sont <strong>pas affichés</strong>
            {visibility === "ANONYMOUS" && " (le site web non plus)"}. Les visiteurs vous écrivent via le formulaire.
          </p>
        )}
        <label className="block text-sm">Adresse<input name="address" defaultValue={producer.address} className="field mt-1" /></label>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">Téléphone<input name="phone" defaultValue={producer.phone} className="field mt-1" /></label>
          <label className="block text-sm">E-mail de contact<input name="email" type="email" defaultValue={producer.email} className="field mt-1" /></label>
          <label className="block text-sm">Site web<input name="website" defaultValue={producer.website} placeholder="https://" className="field mt-1" /></label>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Position sur la carte : cliquez sur la carte ou déplacez le marqueur.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={useMyPosition}>📍 Ma position</button>
              {position && <button type="button" className="btn-ghost text-sm" onClick={() => setPosition(null)}>Effacer</button>}
            </div>
          </div>
          {geoError && <p className="text-sm text-red-700">{geoError}</p>}
          <div className="h-72 overflow-hidden rounded-xl border border-stone-200">
            <LazyLocationPicker value={position} onChange={setPosition} emoji={CATEGORY_ICONS[category]} />
          </div>
          <p className="text-xs text-stone-500">
            {visibility === "PUBLIC" && "Cette position exacte sera affichée publiquement."}
            {visibility === "APPROXIMATE" && "Cette position ne sera jamais affichée telle quelle : le public voit une zone d'environ 1 km."}
            {visibility === "ANONYMOUS" && "Cette position n'est pas utilisée publiquement : seul le centre de la commune est indiqué."}
          </p>
          <input type="hidden" name="latitude" value={position?.lat ?? ""} />
          <input type="hidden" name="longitude" value={position?.lng ?? ""} />
        </div>
      </fieldset>

      {relayPoints.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-lg font-semibold">📦 Points relais où vous déposez vos produits</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {relayPoints.map((r) => (
              <label key={r.id} className="flex items-start gap-2 rounded-lg border border-stone-200 bg-white p-2 text-sm">
                <input type="checkbox" name="relayPointIds" value={r.id} defaultChecked={selectedRelays.has(r.id)} className="mt-1" />
                <span><strong>{r.name}</strong><br /><span className="text-stone-600">{r.address}</span></span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-lg font-semibold">Fermeture temporaire</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="closed" checked={closed} onChange={(e) => setClosed(e.target.checked)} />
          Je suis fermé en ce moment (congés, fin de saison…)
        </label>
        {closed && <input name="closedNote" defaultValue={producer.closedNote} placeholder="Ex. : de retour le 15 mars" className="field" />}
        {!closed && <input type="hidden" name="closedNote" value="" />}
      </fieldset>

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-stone-200 bg-[#fbfaf7] py-3">
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la fiche"}</button>
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}
