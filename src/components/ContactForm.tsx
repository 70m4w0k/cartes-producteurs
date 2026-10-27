"use client";

import { useActionState } from "react";
import { sendContactMessage } from "@/app/actions/contact";
import type { FormState } from "@/lib/validation";

export function ContactForm({ producerId }: { producerId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(sendContactMessage.bind(null, producerId), {});

  if (state.ok) return <p className="rounded-lg bg-emerald-50 p-4 text-emerald-800">{state.ok}</p>;

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          Votre nom
          <input name="senderName" required className="field mt-1" />
        </label>
        <label className="block text-sm">
          E-mail ou téléphone
          <input name="senderContact" required className="field mt-1" />
        </label>
      </div>
      <label className="block text-sm">
        Message
        <textarea name="body" required rows={4} className="field mt-1" placeholder="Bonjour, je souhaiterais réserver…" />
      </label>
      {/* Champ piège anti-robots, invisible pour les humains. */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button className="btn" disabled={pending}>{pending ? "Envoi…" : "Envoyer"}</button>
      <p className="text-xs text-stone-500">
        Vos coordonnées sont transmises uniquement à ce producteur pour qu&apos;il puisse vous répondre.
      </p>
    </form>
  );
}
