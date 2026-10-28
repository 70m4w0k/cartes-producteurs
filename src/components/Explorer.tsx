"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Category } from "@prisma/client";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/labels";
import type { PublicProducer } from "@/lib/privacy";
import type { ListedProducer, PublicRelayPoint } from "@/lib/queries";
import { StockBadge } from "./StockBadge";

const ProducerMap = dynamic(() => import("./ProducerMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">Chargement de la carte…</div>,
});

const CATEGORIES = Object.keys(CATEGORY_LABELS) as Category[];

function normalize(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function hasAvailableProduct(p: PublicProducer) {
  return p.products.some((pr) => pr.stockStatus === "AVAILABLE" || pr.stockStatus === "LOW");
}

export default function Explorer({ producers, relayPoints }: { producers: ListedProducer[]; relayPoints: PublicRelayPoint[] }) {
  const [categories, setCategories] = useState<Set<Category>>(new Set());
  const [query, setQuery] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [showRelays, setShowRelays] = useState(true);
  const [onlyOrderable, setOnlyOrderable] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number } | null>(null);

  const filtered = useMemo(() => {
    const q = normalize(query.trim());
    return producers.filter((p) => {
      if (categories.size && !categories.has(p.category)) return false;
      if (onlyAvailable && (p.closed || !hasAvailableProduct(p))) return false;
      if (onlyOrderable && !p.acceptsOrders) return false;
      if (!q) return true;
      const haystack = [p.displayName, p.description, p.commune, CATEGORY_LABELS[p.category], ...p.products.map((pr) => pr.name)].join(" ");
      return normalize(haystack).includes(q);
    });
  }, [producers, categories, query, onlyAvailable, onlyOrderable]);

  const toggleCategory = (c: Category) =>
    setCategories((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  return (
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 px-4 py-4 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
      <section className="order-2 space-y-3 md:order-1">
        <input
          type="search"
          className="field"
          placeholder="Rechercher : miel, tomme, Orlu…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Rechercher un producteur ou un produit"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleCategory(c)}
              aria-pressed={categories.has(c)}
              className={`rounded-full border px-3 py-1 text-sm ${
                categories.has(c) ? "border-moss-700 bg-moss-700 text-white" : "border-stone-300 bg-white"
              }`}
            >
              {CATEGORY_ICONS[c]} {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyAvailable} onChange={(e) => setOnlyAvailable(e.target.checked)} />
            Produits disponibles uniquement
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={onlyOrderable} onChange={(e) => setOnlyOrderable(e.target.checked)} />
            Commande en ligne 🧺
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={showRelays} onChange={(e) => setShowRelays(e.target.checked)} />
            Afficher les points relais 📦
          </label>
        </div>

        <p className="text-sm text-stone-500">
          {filtered.length} producteur{filtered.length > 1 ? "s" : ""}
        </p>

        <ul className="space-y-3">
          {filtered.map((p) => (
            <li key={p.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>{CATEGORY_ICONS[p.category]}</span>
                <div className="min-w-0 flex-1">
                  <Link href={`/producteurs/${p.id}`} className="font-semibold hover:underline">
                    {p.displayName}
                  </Link>
                  <p className="text-sm text-stone-600">
                    {CATEGORY_LABELS[p.category]} · {p.commune}
                    {p.acceptsOrders && <span className="ml-2 rounded-full bg-moss-100 px-2 py-0.5 text-xs font-medium text-moss-800">🧺 Commande en ligne</span>}
                  </p>
                  {p.closed && (
                    <p className="mt-1 text-sm font-medium text-red-700">Fermé temporairement{p.closedNote && ` — ${p.closedNote}`}</p>
                  )}
                  {p.products.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {p.products.slice(0, 4).map((pr) => (
                        <li key={pr.id} className="flex items-center justify-between gap-2 text-sm">
                          <span className="truncate">{pr.name}</span>
                          <StockBadge status={pr.stockStatus} />
                        </li>
                      ))}
                      {p.products.length > 4 && <li className="text-xs text-stone-500">+ {p.products.length - 4} autres produits</li>}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  className="btn-ghost text-sm"
                  onClick={() => setFocus({ lat: p.location.lat, lng: p.location.lng })}
                  aria-label={`Voir ${p.displayName} sur la carte`}
                >
                  📍
                </button>
              </div>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">
              Aucun producteur ne correspond à votre recherche.
            </li>
          )}
        </ul>
      </section>

      <section className="order-1 h-[45vh] overflow-hidden rounded-xl border border-stone-200 md:sticky md:top-4 md:order-2 md:h-[calc(100vh-7rem)]">
        <ProducerMap producers={filtered} relayPoints={showRelays ? relayPoints : []} focus={focus} />
      </section>
    </div>
  );
}
