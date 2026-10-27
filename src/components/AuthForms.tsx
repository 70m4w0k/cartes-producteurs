"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, signup } from "@/app/actions/auth";
import { COMMUNE_NAMES } from "@/lib/communes";
import { CATEGORY_LABELS } from "@/lib/labels";
import type { FormState } from "@/lib/validation";

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">E-mail<input name="email" type="email" required autoComplete="email" className="field mt-1" /></label>
      <label className="block text-sm">Mot de passe<input name="password" type="password" required autoComplete="current-password" className="field mt-1" /></label>
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
      <p className="text-center text-sm">Pas encore de compte ? <Link href="/inscription" className="underline">Inscrire mon exploitation</Link></p>
    </form>
  );
}

export function SignupForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(signup, {});
  return (
    <form action={action} className="space-y-3">
      <label className="block text-sm">Nom de l&apos;exploitation ou de l&apos;atelier<input name="name" required className="field mt-1" /></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Activité
          <select name="category" className="field mt-1" defaultValue="MIEL">
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
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
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn w-full" disabled={pending}>{pending ? "Création…" : "Créer mon compte"}</button>
      <p className="text-xs text-stone-500">
        Votre fiche sera visible après validation par l&apos;équipe. Par défaut, elle est en mode « Discret » : position floutée et coordonnées masquées. Vous pourrez changer cela à tout moment.
      </p>
      <p className="text-center text-sm">Déjà inscrit ? <Link href="/connexion" className="underline">Se connecter</Link></p>
    </form>
  );
}
