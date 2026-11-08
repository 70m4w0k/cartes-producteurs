"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { login, signup } from "@/app/actions/auth";
import { COMMUNE_NAMES } from "@/lib/communes";
import { KINDS, subcategoriesOf } from "@/lib/categories";
import type { FormState } from "@/lib/validation";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">E-mail<input name="email" type="email" required autoComplete="email" className="field mt-1" /></label>
      <label className="block text-sm">Mot de passe<input name="password" type="password" required autoComplete="current-password" className="field mt-1" /></label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
      <p className="text-center text-sm">Pas encore de compte ? <Link href="/inscription" className="underline">Créer ma fiche</Link></p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, {});
  const [kind, setKind] = useState<"PRODUCTEUR" | "COMMERCE" | "ACTIVITE">("PRODUCTEUR");
  return (
    <form action={action} className="space-y-3">
      <fieldset>
        <legend className="mb-1 text-sm">Vous êtes…</legend>
        <div className="grid grid-cols-3 gap-2">
          {(["PRODUCTEUR", "COMMERCE", "ACTIVITE"] as const).map((k) => (
            <label key={k} className={`cursor-pointer rounded-lg border p-2 text-center text-sm ${kind === k ? "border-moss-700 bg-moss-50 font-bold" : "border-stone-300"}`}>
              <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="sr-only" />
              {KINDS[k].icon}<br />{k === "ACTIVITE" ? "Prestataire d'activités" : KINDS[k].one}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">Nom de votre exploitation, commerce ou structure<input name="name" required className="field mt-1" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Catégorie
          <select key={kind} name="subcategory" className="field mt-1" defaultValue={subcategoriesOf(kind)[0][0]}>
            {subcategoriesOf(kind).map(([id, c]) => <option key={id} value={id}>{c.icon} {c.label}</option>)}
          </select>
        </label>
        <label className="block text-sm">
          Commune
          <select name="commune" className="field mt-1" defaultValue="Ax-les-Thermes">
            {COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>
      <label className="block text-sm">E-mail (pour vous connecter, jamais affiché sans votre accord)<input name="email" type="email" required autoComplete="email" className="field mt-1" /></label>
      <label className="block text-sm">Mot de passe (10 caractères minimum)<input name="password" type="password" required minLength={10} autoComplete="new-password" className="field mt-1" /></label>
      {state.error && <p className="text-sm text-red-700" role="alert">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Création…" : "Créer ma fiche"}</button>
      <p className="text-xs text-stone-500">
        Gratuit. Votre fiche sera visible après validation par l&apos;équipe.
        {kind === "PRODUCTEUR" && " Par défaut, elle est en mode « Discret » : position floutée et coordonnées masquées. Vous pourrez changer cela à tout moment."}
      </p>
      <p className="text-center text-sm">Déjà inscrit ? <Link href="/connexion" className="underline">Se connecter</Link></p>
    </form>
  );
}
