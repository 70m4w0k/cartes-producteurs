"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Occurrence } from "@/lib/agenda";
import { KINDS, KIND_ORDER, SUBCATEGORIES, subcategoriesOf, subIcon, subLabel, type ListingKind } from "@/lib/categories";
import { COMMUNE_NAMES } from "@/lib/communes";
import { formatDate, formatMinutes, openStatus } from "@/lib/hours";
import { LEVEL_LABELS } from "@/lib/labels";
import type { PublicEvent, PublicPlace } from "@/lib/privacy";
import { communePoint, countFilters, DEFAULT_FILTERS, distanceKm, inSeason, search, WHEN_LABELS, type Filters, type When } from "@/lib/search";
import { LazyExploreMap } from "./LazyMap";
import type { MapMarker } from "./ExploreMap";

type Props = { places: PublicPlace[]; events: PublicEvent[] };

const RADII = [0, 2, 5, 10, 20];

/** Les filtres sont dans l'adresse de la page : une recherche se partage par simple lien. */
function filtersFromParams(sp: URLSearchParams): Filters {
  const type = sp.get("type");
  return {
    ...DEFAULT_FILTERS,
    q: sp.get("q") ?? "",
    kind: type && type in KINDS ? (type as ListingKind) : "ALL",
    subs: (sp.get("cat") ?? "").split(",").filter((s) => s in SUBCATEGORIES),
    commune: COMMUNE_NAMES.includes(sp.get("commune") as never) ? sp.get("commune")! : "",
    radiusKm: RADII.includes(Number(sp.get("rayon"))) ? Number(sp.get("rayon")) : 0,
    when: (sp.get("quand") as When) in WHEN_LABELS ? (sp.get("quand") as When) : "any",
    from: sp.get("du") ?? "",
    to: sp.get("au") ?? "",
    openNow: sp.get("ouvert") === "1",
    showOutOfSeason: sp.get("horsaison") === "1",
  };
}

function filtersToQuery(f: Filters) {
  const sp = new URLSearchParams();
  if (f.q) sp.set("q", f.q);
  if (f.kind !== "ALL") sp.set("type", f.kind);
  if (f.subs.length) sp.set("cat", f.subs.join(","));
  if (f.commune) sp.set("commune", f.commune);
  if (f.commune && f.radiusKm) sp.set("rayon", String(f.radiusKm));
  if (f.when !== "any") sp.set("quand", f.when);
  if (f.when === "custom") { if (f.from) sp.set("du", f.from); if (f.to) sp.set("au", f.to); }
  if (f.openNow) sp.set("ouvert", "1");
  if (f.showOutOfSeason && f.when !== "any") sp.set("horsaison", "1");
  const s = sp.toString();
  return s ? `?${s}` : "";
}

type Row =
  | { type: "occ"; key: string; occ: Occurrence; href: string; markerId: string }
  | { type: "place"; key: string; place: PublicPlace; href: string; markerId: string };

const occHref = (o: Occurrence) => (o.source === "event" ? `/evenements/${o.refId}` : `/lieux/${o.refId}`);

export default function Explorer({ places, events }: Props) {
  const sp = useSearchParams();
  const router = useRouter();
  const [f, setF] = useState<Filters>(() => filtersFromParams(new URLSearchParams(sp.toString())));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [hover, setHover] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Les liens du menu (Agenda, Acheter local) changent l'adresse : on suit.
  const spKey = sp.toString();
  useEffect(() => { setF(filtersFromParams(new URLSearchParams(spKey))); }, [spKey]);

  const update = (patch: Partial<Filters>) => {
    const next = { ...f, ...patch };
    setF(next);
    router.replace(`/${filtersToQuery(next)}`, { scroll: false });
  };

  const result = useMemo(() => search(places, events, f), [places, events, f]);
  const ref = f.commune ? communePoint(f.commune) : null;

  const counts: Record<ListingKind, number> = {
    EVENEMENT: result.occurrences.length,
    ACTIVITE: result.places.ACTIVITE.length,
    PRODUCTEUR: result.places.PRODUCTEUR.length,
    COMMERCE: result.places.COMMERCE.length,
    LOCAL: result.places.LOCAL.length,
  };
  const total = KIND_ORDER.reduce((s, k) => s + counts[k], 0);

  const rowsOf = (k: ListingKind): Row[] =>
    k === "EVENEMENT"
      ? result.occurrences.map((o) => ({ type: "occ", key: o.key, occ: o, href: occHref(o), markerId: o.refId }))
      : result.places[k].map((p) => ({ type: "place", key: p.id, place: p, href: `/lieux/${p.id}`, markerId: p.id }));
  const visibleRows = f.kind === "ALL" ? KIND_ORDER.flatMap(rowsOf) : rowsOf(f.kind);

  const markers: MapMarker[] = useMemo(() => {
    const seen = new Map<string, MapMarker>();
    for (const r of visibleRows) {
      if (seen.has(r.markerId)) continue;
      if (r.type === "occ") {
        const o = r.occ;
        const isMarket = o.source === "market";
        seen.set(r.markerId, {
          id: r.markerId, href: r.href, lat: o.location.lat, lng: o.location.lng, radiusM: 0, icon: subIcon(o.subcategory),
          color: isMarket ? KINDS.LOCAL.color : KINDS.EVENEMENT.color, title: o.title,
          subtitle: `${formatDate(o.date, "short")} · ${formatMinutes(o.startMinutes)} – ${formatMinutes(o.endMinutes)} · ${o.commune}`,
        });
      } else {
        const p = r.place;
        seen.set(r.markerId, {
          id: p.id, href: r.href, lat: p.location.lat, lng: p.location.lng, radiusM: p.location.radiusM, icon: subIcon(p.subcategory),
          color: KINDS[p.kind].color, title: p.name, subtitle: `${subLabel(p.subcategory)} · ${p.commune}`, muted: p.closed,
        });
      }
    }
    return [...seen.values()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, f.kind]);

  // Un clic sur une épingle fait défiler la liste jusqu'au résultat correspondant.
  useEffect(() => {
    if (!selected) return;
    listRef.current?.querySelector(`[data-marker="${CSS.escape(selected)}"]`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selected]);

  const circle = f.commune && f.radiusKm && ref ? { ...ref, km: f.radiusKm } : null;
  const activeCount = countFilters(f);

  const pills: { label: string; clear: Partial<Filters> }[] = [];
  f.subs.forEach((s) => pills.push({ label: `${subIcon(s)} ${subLabel(s)}`, clear: { subs: f.subs.filter((x) => x !== s) } }));
  if (f.commune) pills.push({ label: f.radiusKm ? `📍 ${f.commune} + ${f.radiusKm} km` : `📍 ${f.commune}`, clear: { commune: "", radiusKm: 0 } });
  if (f.when !== "any") pills.push({ label: `🗓️ ${f.when === "custom" && f.from ? `${formatDate(result.window.from, "short")} → ${formatDate(result.window.to, "short")}` : WHEN_LABELS[f.when]}`, clear: { when: "any", from: "", to: "" } });
  if (f.openNow) pills.push({ label: "🕒 Ouvert maintenant", clear: { openNow: false } });

  const renderRow = (r: Row) => {
    const active = hover === r.markerId || selected === r.markerId;
    if (r.type === "occ") {
      const o = r.occ;
      return (
        <Link key={r.key} href={r.href} data-marker={r.markerId} onMouseEnter={() => setHover(r.markerId)} onMouseLeave={() => setHover(null)}
          className={`result ${active ? "is-active" : ""}`} style={{ ["--tc" as string]: o.source === "market" ? KINDS.LOCAL.color : KINDS.EVENEMENT.color }}>
          <span className="result-ic" aria-hidden>{subIcon(o.subcategory)}</span>
          <span className="min-w-0">
            <span className="result-title">{o.title}</span>
            <span className="result-meta">
              <b className="first-letter:uppercase">{formatDate(o.date, "short")}, {formatMinutes(o.startMinutes)} – {formatMinutes(o.endMinutes)}</b>
              <span>{o.commune}</span>
              {o.price && <span>{o.price}</span>}
              {ref && <span>{distanceKm(ref, o.location).toFixed(1)} km</span>}
            </span>
            {o.tagline && <span className="result-desc">{o.tagline}</span>}
          </span>
        </Link>
      );
    }
    const p = r.place;
    const status = p.closed ? { open: false, label: "Fermé temporairement" } : openStatus(p.hours);
    const outOfSeason = !inSeason(p.season, result.window);
    return (
      <Link key={r.key} href={r.href} data-marker={r.markerId} onMouseEnter={() => setHover(r.markerId)} onMouseLeave={() => setHover(null)}
        className={`result ${active ? "is-active" : ""}`} style={{ ["--tc" as string]: KINDS[p.kind].color }}>
        <span className="result-ic" aria-hidden>{subIcon(p.subcategory)}</span>
        <span className="min-w-0">
          <span className="result-title">{p.name}</span>
          <span className="result-meta">
            <span>{subLabel(p.subcategory)}</span>
            <span>{p.commune}</span>
            {p.facts?.duration && <span>{p.facts.duration}</span>}
            {p.facts?.level && <span>{LEVEL_LABELS[p.facts.level]}</span>}
            {ref && <span>{distanceKm(ref, p.location).toFixed(1)} km</span>}
            {outOfSeason && <span className="badge-off">Hors saison</span>}
          </span>
          {p.tagline && <span className="result-desc">{p.tagline}</span>}
          {status && <span className={status.open ? "badge-ok" : "badge-off"}>{status.label}</span>}
        </span>
      </Link>
    );
  };

  let list: React.ReactNode;
  if (total === 0 || (f.kind !== "ALL" && counts[f.kind] === 0)) {
    list = <p className="rounded-xl border border-dashed border-stone-300 p-6 text-center text-stone-500">Aucun résultat. Élargissez la zone, les dates ou retirez un filtre.</p>;
  } else if (f.kind === "ALL") {
    list = KIND_ORDER.filter((k) => counts[k]).map((k) => (
      <section key={k} className="space-y-2">
        <div className="flex items-baseline justify-between gap-2 pt-2">
          <h2 className="font-display text-lg font-bold" style={{ color: KINDS[k].color }}>{KINDS[k].icon} {KINDS[k].label}</h2>
          {counts[k] > 4 && <button type="button" className="btn-ghost text-sm" onClick={() => update({ kind: k, subs: [] })}>Tout voir ({counts[k]})</button>}
        </div>
        {rowsOf(k).slice(0, 4).map(renderRow)}
      </section>
    ));
  } else if (f.kind === "EVENEMENT") {
    let last = "";
    list = rowsOf("EVENEMENT").map((r) => {
      const day = r.type === "occ" ? r.occ.date : "";
      const head = day !== last ? <p key={`d-${day}`} className="pt-2 font-display font-bold first-letter:uppercase">{formatDate(day)}</p> : null;
      last = day;
      return [head, renderRow(r)];
    });
  } else list = visibleRows.map(renderRow);

  return (
    <div className="explorer" data-mobile={mobileView}>
      <div className="explorer-bar">
        <form role="search" className="flex gap-2" onSubmit={(e) => e.preventDefault()}>
          <input type="search" className="field text-base" placeholder="Rechercher : randonnée, fromage, marché, Orlu…" value={f.q}
            onChange={(e) => update({ q: e.target.value })} aria-label="Rechercher" />
          <button type="button" className={`btn-ghost whitespace-nowrap ${filtersOpen ? "is-on" : ""}`} aria-expanded={filtersOpen} aria-controls="filters" onClick={() => setFiltersOpen((o) => !o)}>
            ⚙️ Filtres{activeCount > 0 && <span className="count">{activeCount}</span>}
          </button>
        </form>
        <div className="tabs" role="tablist" aria-label="Type">
          <button role="tab" aria-selected={f.kind === "ALL"} onClick={() => update({ kind: "ALL", subs: [] })}>Tout <span className="n">{total}</span></button>
          {KIND_ORDER.map((k) => (
            <button key={k} role="tab" aria-selected={f.kind === k} onClick={() => update({ kind: k, subs: [] })}>
              {KINDS[k].icon} {KINDS[k].label} <span className="n">{counts[k]}</span>
            </button>
          ))}
        </div>
        {filtersOpen && (
          <div id="filters" className="filters-panel">
            {f.kind !== "ALL" && (
              <div className="flex flex-wrap gap-2" role="group" aria-label="Catégories">
                {subcategoriesOf(f.kind).map(([id, s]) => (
                  <button key={id} type="button" className="chip" aria-pressed={f.subs.includes(id)}
                    onClick={() => update({ subs: f.subs.includes(id) ? f.subs.filter((x) => x !== id) : [...f.subs, id] })}>
                    {s.icon} {s.label}
                  </button>
                ))}
              </div>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">Où
                <select className="field mt-1" value={f.commune} onChange={(e) => update({ commune: e.target.value, radiusKm: e.target.value ? f.radiusKm || 5 : 0 })}>
                  <option value="">Toute la vallée</option>
                  {COMMUNE_NAMES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block text-sm">Rayon
                <select className="field mt-1" value={f.radiusKm} disabled={!f.commune} onChange={(e) => update({ radiusKm: Number(e.target.value) })}>
                  {RADII.map((r) => <option key={r} value={r}>{r ? `${r} km` : "Commune seule"}</option>)}
                </select>
              </label>
              <label className="block text-sm">Quand
                <select className="field mt-1" value={f.when} onChange={(e) => update({ when: e.target.value as When })}>
                  {Object.entries(WHEN_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 self-end pb-2 text-sm">
                <input type="checkbox" checked={f.openNow} onChange={(e) => update({ openNow: e.target.checked })} /> Ouvert maintenant
              </label>
              {f.when === "custom" && (
                <>
                  <label className="block text-sm">Du<input type="date" className="field mt-1" value={f.from || result.window.from} onChange={(e) => update({ from: e.target.value })} /></label>
                  <label className="block text-sm">Au<input type="date" className="field mt-1" value={f.to || result.window.to} onChange={(e) => update({ to: e.target.value })} /></label>
                </>
              )}
            </div>
            <div className="flex justify-between gap-2">
              <button type="button" className="text-sm underline" onClick={() => update({ ...DEFAULT_FILTERS, q: f.q, kind: f.kind })}>Réinitialiser les filtres</button>
              <button type="button" className="btn" onClick={() => setFiltersOpen(false)}>Voir {f.kind === "ALL" ? total : counts[f.kind]} résultats</button>
            </div>
          </div>
        )}
        {pills.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {pills.map((p) => (
              <button key={p.label} type="button" className="pill" onClick={() => update(p.clear)} aria-label={`Retirer le filtre ${p.label}`}>{p.label} ✕</button>
            ))}
          </div>
        )}
      </div>

      <div className="explorer-map" aria-label="Carte des résultats">
        <LazyExploreMap markers={markers} circle={circle} highlightId={hover ?? selected} onMarkerClick={(id) => { setSelected(id); setMobileView("list"); }} />
      </div>

      <div className="explorer-list" ref={listRef}>
        <p className="text-sm text-stone-500">
          {f.kind === "ALL" ? total : counts[f.kind]} résultat{(f.kind === "ALL" ? total : counts[f.kind]) > 1 ? "s" : ""} · la carte se recadre sur la recherche
        </p>
        {result.hiddenOutOfSeason > 0 && (
          <p className="rounded-lg bg-stone-100 p-2 text-sm">
            {result.hiddenOutOfSeason} activité{result.hiddenOutOfSeason > 1 ? "s" : ""} hors saison masquée{result.hiddenOutOfSeason > 1 ? "s" : ""} ·{" "}
            <button type="button" className="underline" onClick={() => update({ showOutOfSeason: true })}>Afficher</button>
          </p>
        )}
        {list}
      </div>

      <button type="button" className="explorer-fab btn" onClick={() => setMobileView((v) => (v === "list" ? "map" : "list"))}>
        {mobileView === "list" ? `🗺️ Carte (${markers.length})` : "☰ Liste"}
      </button>
    </div>
  );
}
