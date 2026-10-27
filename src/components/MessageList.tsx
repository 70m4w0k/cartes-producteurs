"use client";

import { useTransition } from "react";
import type { ContactMessage } from "@prisma/client";
import { deleteMessage, setMessageRead } from "@/app/actions/producer";

export function MessageList({ messages }: { messages: ContactMessage[] }) {
  const [pending, startTransition] = useTransition();
  if (messages.length === 0) return <p className="text-stone-500">Aucun message.</p>;
  return (
    <ul className="space-y-3">
      {messages.map((m) => (
        <li key={m.id} className={`rounded-xl border p-4 ${m.read ? "border-stone-200 bg-white" : "border-moss-600 bg-moss-50"}`}>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-semibold">{m.senderName} · <span className="font-normal">{m.senderContact}</span></p>
            <time className="text-xs text-stone-500">{m.createdAt.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}</time>
          </div>
          <p className="mt-2 whitespace-pre-line">{m.body}</p>
          <div className="mt-3 flex gap-2 text-sm">
            <button type="button" disabled={pending} className="btn-ghost" onClick={() => startTransition(() => setMessageRead(m.id, !m.read))}>
              {m.read ? "Marquer non lu" : "Marquer comme lu"}
            </button>
            <button
              type="button"
              disabled={pending}
              className="btn-ghost text-red-700"
              onClick={() => confirm("Supprimer ce message ?") && startTransition(() => deleteMessage(m.id))}
            >
              Supprimer
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
