"use client";

import { useActionState, useTransition } from "react";
import type { Product, StockStatus } from "@prisma/client";
import { createProduct, deleteProduct, setStockStatus, updateProduct } from "@/app/actions/producer";
import { formatPrice, STOCK_LABELS, STOCK_STYLES } from "@/lib/labels";
import type { FormState } from "@/lib/validation";

const STATUSES = Object.keys(STOCK_LABELS) as StockStatus[];

function ProductFields({ product }: { product?: Product }) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <label className="block text-sm">Nom<input name="name" required defaultValue={product?.name} className="field mt-1" placeholder="Miel de bruyère" /></label>
        <label className="block text-sm">
          Prix (€)
          <input name="price" inputMode="decimal" defaultValue={product?.priceCents != null ? (product.priceCents / 100).toFixed(2).replace(".", ",") : ""} className="field mt-1" placeholder="vide = sur demande" />
        </label>
        <label className="block text-sm">Unité<input name="unit" defaultValue={product?.unit} className="field mt-1" placeholder="le pot de 500 g" /></label>
      </div>
      <label className="block text-sm">Description<input name="description" defaultValue={product?.description} className="field mt-1" /></label>
      <label className="block text-sm">
        Stock
        <select name="stockStatus" defaultValue={product?.stockStatus ?? "AVAILABLE"} className="field mt-1">
          {STATUSES.map((s) => <option key={s} value={s}>{STOCK_LABELS[s]}</option>)}
        </select>
      </label>
    </>
  );
}

function NewProductForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createProduct, {});
  return (
    <details className="rounded-xl border border-dashed border-stone-300 bg-white p-4">
      <summary className="cursor-pointer font-semibold">➕ Ajouter un produit</summary>
      <form action={action} className="mt-3 space-y-3">
        <ProductFields />
        {state.error && <p className="text-sm text-red-700">{state.error}</p>}
        {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
        <button className="btn" disabled={pending}>Ajouter</button>
      </form>
    </details>
  );
}

function ProductRow({ product }: { product: Product }) {
  const [pending, startTransition] = useTransition();
  const [state, action, saving] = useActionState<FormState, FormData>(updateProduct, {});

  return (
    <li className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">{product.name}</p>
        <p className="text-sm text-stone-600">{formatPrice(product.priceCents)} {product.priceCents !== null && product.unit}</p>
      </div>
      {/* Boutons larges : mise à jour du stock en un geste depuis un téléphone. */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label={`Stock de ${product.name}`}>
        {STATUSES.map((s) => (
          <button
            key={s}
            type="button"
            disabled={pending}
            aria-pressed={product.stockStatus === s}
            onClick={() => startTransition(() => setStockStatus(product.id, s))}
            className={`rounded-lg px-2 py-2 text-sm font-medium ${
              product.stockStatus === s ? `${STOCK_STYLES[s]} ring-2 ring-current` : "border border-stone-200 bg-stone-50 text-stone-600"
            }`}
          >
            {STOCK_LABELS[s]}
          </button>
        ))}
      </div>
      <details>
        <summary className="cursor-pointer text-sm text-stone-600">Modifier / supprimer</summary>
        <form action={action} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={product.id} />
          <ProductFields product={product} />
          {state.error && <p className="text-sm text-red-700">{state.error}</p>}
          {state.ok && <p className="text-sm text-emerald-700">{state.ok}</p>}
          <div className="flex gap-2">
            <button className="btn" disabled={saving}>Enregistrer</button>
            <button
              type="button"
              className="btn-ghost text-red-700"
              onClick={() => {
                if (confirm(`Supprimer « ${product.name} » ?`)) startTransition(() => deleteProduct(product.id));
              }}
            >
              Supprimer
            </button>
          </div>
        </form>
      </details>
    </li>
  );
}

export function ProductManager({ products }: { products: Product[] }) {
  return (
    <div className="space-y-3">
      {products.length === 0 && <p className="text-stone-500">Aucun produit pour l&apos;instant.</p>}
      <ul className="space-y-3">
        {products.map((p) => <ProductRow key={p.id} product={p} />)}
      </ul>
      <NewProductForm />
    </div>
  );
}
