"use client";

import { useActionState, useState } from "react";
import type { Place, PlaceKind, Visibility } from "@prisma/client";
import { KINDS, subcategoriesOf, subIcon, SUBCATEGORIES } from "@/lib/categories";
import { COMMUNE_NAMES } from "@/lib/communes";
import { rangesOn, WEEKDAYS, type WeeklyHours } from "@/lib/hours";
import { MONTHS, VISIBILITY_LABELS } from "@/lib/labels";
import type { ActivityFacts } from "@/lib/privacy";
import type { FormState } from "@/lib/validation";
import { LazyLocationPicker } from "./LazyMap";

type Props = {
  place: Pick<Place, "kind" | "subcategory" | "name" | "tagline" | "description" | "story" | "commune" | "address" | "latitude" | "longitude" | "phone" | "email" | "website" | "labels" | "season" | "visibility" | "closed" | "closedNote"> & { hours: unknown; facts: unknown };
  action: (state: FormState, form: FormData) => Promise<FormState>;
  localPlaces: { id: string; name: string }[];
  sellsAt: string[];
  canChangeKind: boolean;
  submitLabel?: string;
};

const toHHMM = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromHHMM = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3, 5));
type Day = { a: string; b: string; c: string; d: string };

/** Éditeur d'horaires : deux plages par jour (matin / après-midi), sérialisées dans le format de parseHours. */
function HoursEditor({ initial }: { initial: WeeklyHours | null }) {
  const [days, setDays] = useState<Day[]>(() =>
    [1, 2, 3, 4, 5, 6, 7].map((d) => {
      const r = rangesOn(initial, d);
      return { a: r[0] ? toHHMM(r[0][0]) : "", b: r[0] ? toHHMM(r[0][1]) : "", c: r[1] ? toHHMM(r[1][0]) : "", d: r[1] ? toHHMM(r[1][1]) : "" };
    }),
  );
  const serialized = days
    .map((day, i) => {
      const ranges = [[day.a, day.b], [day.c, day.d]].filter(([x, y]) => x && y && fromHHMM(y) > fromHHMM(x)).map(([x, y]) => `${x}-${y}`);
      return ranges.length ? `${i + 1} ${ranges.join(",")}` : "";
    })
    .filter(Boolean)
    .join(" ; ");
  const set = (i: number, k: keyof Day, v: string) => setDays((ds) => ds.map((d, j) => (j === i ? { ...d, [k]: v } : d)));
  return (
    <div className="space-y-2">
      <input type="hidden" name="hours" value={serialized} />
      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead><tr className="text-left text-stone-500"><th className="pr-3 font-normal">Jour</th><th className="font-normal">Matin / plage 1</th><th className="font-normal">Après-midi / plage 2</th></tr></thead>
          <tbody>
            {days.map((d, i) => (
              <tr key={i}>
                <td className="py-1 pr-3">{WEEKDAYS[i + 1]}</td>
                <td className="py-1 pr-3 whitespace-nowrap"><input type="time" className="field w-28" value={d.a} onChange={(e) => set(i, "a", e.target.value)} aria-label={`${WEEKDAYS[i + 1]} début plage 1`} /> – <input type="time" className="field w-28" value={d.b} onChange={(e) => set(i, "b", e.target.value)} aria-label={`${WEEKDAYS[i + 1]} fin plage 1`} /></td>
                <td className="py-1 whitespace-nowrap"><input type="time" className="field w-28" value={d.c} onChange={(e) => set(i, "c", e.target.value)} aria-label={`${WEEKDAYS[i + 1]} début plage 2`} /> – <input type="time" className="field w-28" value={d.d} onChange={(e) => set(i, "d", e.target.value)} aria-label={`${WEEKDAYS[i + 1]} fin plage 2`} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2 text-sm">
        <button type="button" className="btn-ghost" onClick={() => setDays((ds) => ds.map((d, i) => (i < 6 ? { ...ds[0] } : d)))}>Copier le lundi du mardi au samedi</button>
        <button type="button" className="btn-ghost" onClick={() => setDays((ds) => ds.map(() => ({ a: "", b: "", c: "", d: "" })))}>Tout effacer</button>
      </div>
      <p className="text-xs text-stone-500">Laissez un jour vide s&apos;il est fermé. Pour un marché, indiquez ses jours et heures de tenue.</p>
    </div>
  );
}

export function PlaceForm({ place, action, localPlaces, sellsAt, canChangeKind, submitLabel = "Enregistrer la fiche" }: Props) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, {});
  const [kind, setKind] = useState<PlaceKind>(place.kind);
  const [sub, setSub] = useState(place.subcategory);
  const [visibility, setVisibility] = useState<Visibility>(place.visibility);
  const [commune, setCommune] = useState(place.commune);
  const [closed, setClosed] = useState(place.closed);
  const [position, setPosition] = useState(place.latitude !== null && place.longitude !== null ? { lat: place.latitude, lng: place.longitude } : null);
  const facts = (place.facts ?? {}) as ActivityFacts;
  const isProducer = kind === "PRODUCTEUR";
  const subOk = SUBCATEGORIES[sub]?.kind === kind;

  return (
    <form action={formAction} className="space-y-8">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-bold">Identité</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">Type de fiche
            {canChangeKind ? (
              <select name="kind" className="field mt-1" value={kind} onChange={(e) => { const k = e.target.value as PlaceKind; setKind(k); setSub(subcategoriesOf(k)[0][0]); }}>
                {(["PRODUCTEUR", "COMMERCE", "ACTIVITE", "LOCAL"] as PlaceKind[]).map((k) => <option key={k} value={k}>{KINDS[k].icon} {KINDS[k].one}</option>)}
              </select>
            ) : (
              <><input type="hidden" name="kind" value={kind} /><span className="field mt-1 block bg-stone-50">{KINDS[kind].icon} {KINDS[kind].one}</span></>
            )}
          </label>
          <label className="block text-sm">Catégorie
            <select name="subcategory" className="field mt-1" value={subOk ? sub : ""} onChange={(e) => setSub(e.target.value)} required>
              {!subOk && <option value="" disabled>Choisir…</option>}
              {subcategoriesOf(kind).map(([id, s]) => <option key={id} value={id}>{s.icon} {s.label}</option>)}
            </select>
          </label>
        </div>
        <label className="block text-sm">Nom {isProducer && visibility === "ANONYMOUS" && <em className="text-stone-500">(non affiché en mode anonyme)</em>}
          <input name="name" defaultValue={place.name} required className="field mt-1" />
        </label>
        <label className="block text-sm">Accroche (une phrase affichée dans les résultats)
          <input name="tagline" defaultValue={place.tagline} maxLength={160} className="field mt-1" placeholder="Ex. : Miels de montagne récoltés entre 900 et 1 800 m." />
        </label>
        <label className="block text-sm">Présentation
          <textarea name="description" defaultValue={place.description} rows={5} className="field mt-1" />
        </label>
        <label className="block text-sm">Votre histoire (facultatif)
          <textarea name="story" defaultValue={place.story} rows={3} className="field mt-1" />
        </label>
        <label className="block text-sm">Labels et mots-clés, séparés par des virgules
          <input name="labels" defaultValue={place.labels.join(", ")} className="field mt-1" placeholder="Agriculture biologique, Bienvenue à la ferme" />
        </label>
      </fieldset>

      {isProducer && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-bold">Visibilité</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((v) => (
              <label key={v} className={`cursor-pointer rounded-xl border p-3 ${visibility === v ? "border-moss-700 bg-moss-50 ring-1 ring-moss-700" : "border-stone-300 bg-white"}`}>
                <input type="radio" name="visibility" value={v} checked={visibility === v} onChange={() => setVisibility(v)} className="mr-2" />
                <span className="font-bold">{VISIBILITY_LABELS[v].title}</span>
                <p className="mt-1 text-sm text-stone-600">{VISIBILITY_LABELS[v].help}</p>
              </label>
            ))}
          </div>
          {visibility === "ANONYMOUS" && (
            <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
              Vous apparaîtrez comme « {SUBCATEGORIES[sub]?.trade ?? "Producteur·rice"} à {commune} ». Évitez les détails qui vous identifient dans la présentation.
            </p>
          )}
        </fieldset>
      )}
      {!isProducer && <input type="hidden" name="visibility" value="PUBLIC" />}

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-bold">Adresse et contact</legend>
        {isProducer && visibility !== "PUBLIC" && (
          <p className="text-sm text-stone-600">🔒 L&apos;adresse, le téléphone et l&apos;e-mail ne sont <strong>pas affichés</strong> en mode {VISIBILITY_LABELS[visibility].title.toLowerCase()}.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
          <label className="block text-sm">Commune
            <select name="commune" className="field mt-1" value={commune} onChange={(e) => setCommune(e.target.value)}>
              {COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block text-sm">Adresse<input name="address" defaultValue={place.address} className="field mt-1" /></label>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block text-sm">Téléphone<input name="phone" defaultValue={place.phone} className="field mt-1" /></label>
          <label className="block text-sm">E-mail de contact<input name="email" type="email" defaultValue={place.email} className="field mt-1" /></label>
          <label className="block text-sm">Site web<input name="website" defaultValue={place.website} placeholder="https://" className="field mt-1" /></label>
        </div>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm">Position : cliquez sur la carte ou déplacez l&apos;épingle.</p>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost text-sm" onClick={() => navigator.geolocation?.getCurrentPosition((p) => setPosition({ lat: p.coords.latitude, lng: p.coords.longitude }))}>📍 Ma position</button>
              {position && <button type="button" className="btn-ghost text-sm" onClick={() => setPosition(null)}>Effacer</button>}
            </div>
          </div>
          <div className="h-72 overflow-hidden rounded-xl border border-stone-200">
            <LazyLocationPicker value={position} onChange={setPosition} emoji={subIcon(sub)} color={KINDS[kind].color} />
          </div>
          {isProducer && (
            <p className="text-xs text-stone-500">
              {visibility === "PUBLIC" && "Cette position exacte sera affichée publiquement."}
              {visibility === "APPROXIMATE" && "Cette position ne sera jamais affichée telle quelle : le public voit une zone d'environ 1 km."}
              {visibility === "ANONYMOUS" && "Cette position n'est pas utilisée publiquement : seule la commune est indiquée."}
            </p>
          )}
          <input type="hidden" name="latitude" value={position?.lat ?? ""} />
          <input type="hidden" name="longitude" value={position?.lng ?? ""} />
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="mb-2 text-lg font-bold">{kind === "LOCAL" && sub === "marchelocal" ? "Jours de marché" : isProducer ? "Vente à la ferme (horaires)" : "Horaires"}</legend>
        <HoursEditor initial={(place.hours as WeeklyHours | null) ?? null} />
      </fieldset>

      {(kind === "ACTIVITE" || kind === "COMMERCE") && (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-lg font-bold">Saison</legend>
          <p className="text-sm text-stone-600">Cochez les mois où l&apos;activité est proposée. Rien de coché = toute l&apos;année.</p>
          <div className="flex flex-wrap gap-2">
            {MONTHS.map((m, i) => (
              <label key={m} className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm">
                <input type="checkbox" name="season" value={i + 1} defaultChecked={place.season.includes(i + 1)} /> {m}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {kind === "ACTIVITE" && (
        <fieldset className="space-y-3">
          <legend className="mb-2 text-lg font-bold">Infos pratiques</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">Durée<input name="factDuration" defaultValue={facts.duration ?? ""} placeholder="3 h" className="field mt-1" /></label>
            <label className="block text-sm">Distance<input name="factDistance" defaultValue={facts.distance ?? ""} placeholder="7 km" className="field mt-1" /></label>
            <label className="block text-sm">Dénivelé<input name="factElevation" defaultValue={facts.elevation ?? ""} placeholder="+380 m" className="field mt-1" /></label>
            <label className="block text-sm">Niveau
              <select name="factLevel" defaultValue={facts.level ?? ""} className="field mt-1"><option value="">—</option><option value="1">Facile</option><option value="2">Moyen</option><option value="3">Difficile</option></select>
            </label>
            <label className="block text-sm">Public<input name="factAudience" defaultValue={facts.audience ?? ""} placeholder="Dès 8 ans" className="field mt-1" /></label>
            <label className="block text-sm">Tarif<input name="factPrice" defaultValue={facts.price ?? ""} placeholder="Gratuit, 40 €…" className="field mt-1" /></label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Point de départ<input name="factMeetingPoint" defaultValue={facts.meetingPoint ?? ""} className="field mt-1" /></label>
            <label className="block text-sm">Encadrement (prestataire, guide)<input name="factProvider" defaultValue={facts.provider ?? ""} className="field mt-1" /></label>
          </div>
        </fieldset>
      )}

      {isProducer && localPlaces.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-lg font-bold">Marchés et dépôts où l&apos;on trouve vos produits</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {localPlaces.map((l) => (
              <label key={l.id} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-white p-2 text-sm">
                <input type="checkbox" name="sellsAt" value={l.id} defaultChecked={sellsAt.includes(l.id)} /> {l.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="space-y-2">
        <legend className="mb-2 text-lg font-bold">Fermeture temporaire</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="closed" checked={closed} onChange={(e) => setClosed(e.target.checked)} /> Fermé en ce moment (congés, fin de saison…)
        </label>
        {closed && <input name="closedNote" defaultValue={place.closedNote} placeholder="Ex. : de retour le 15 mars" className="field" />}
        {!closed && <input type="hidden" name="closedNote" value="" />}
      </fieldset>

      <div className="sticky bottom-0 z-[1000] flex items-center gap-3 border-t border-stone-200 bg-[#f6f8f5] py-3">
        <button className="btn" disabled={pending}>{pending ? "Enregistrement…" : submitLabel}</button>
        {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
      </div>
    </form>
  );
}
