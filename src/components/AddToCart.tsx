"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "./cart";

export function QuantityStepper({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div className="inline-flex items-center rounded-lg border border-stone-300 bg-white" role="group" aria-label={label}>
      <button type="button" className="px-2.5 py-1 text-lg leading-none" onClick={() => onChange(value - 1)} aria-label="Moins">−</button>
      <span className="min-w-6 text-center tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="px-2.5 py-1 text-lg leading-none" onClick={() => onChange(value + 1)} aria-label="Plus">+</button>
    </div>
  );
}

export function AddToCart({ productId, productName }: { productId: string; productName: string }) {
  const { items, add, loaded } = useCart();
  const [quantity, setQuantity] = useState(1);
  const inCart = items.find((i) => i.productId === productId)?.quantity ?? 0;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <QuantityStepper value={quantity} onChange={(v) => setQuantity(Math.max(1, Math.min(50, v)))} label={`Quantité de ${productName}`} />
      <button type="button" className="btn py-1 text-sm" disabled={!loaded} onClick={() => add(productId, quantity)}>
        Ajouter
      </button>
      {inCart > 0 && (
        <Link href="/panier" className="w-full text-right text-xs text-moss-700 underline">
          {inCart} dans le panier
        </Link>
      )}
    </div>
  );
}
