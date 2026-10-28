"use client";

import { useTransition } from "react";
import { cancelProducerOrder } from "@/app/actions/orders";

export function CancelOrderButton({ token, producerOrderId }: { token: string; producerOrderId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="text-sm text-red-700 underline"
      onClick={() => confirm("Annuler cette partie de la commande ?") && start(() => cancelProducerOrder(token, producerOrderId))}
    >
      Annuler
    </button>
  );
}
