import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContactForm } from "@/components/ContactForm";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { LazyExploreMap } from "@/components/LazyMap";
import { DateRow, Hero, HoursTable, PlaceRow, Section } from "@/components/PlaceBits";
import { StockBadge } from "@/components/StockBadge";
import { eventOccurrence, marketOccurrences } from "@/lib/agenda";
import { KINDS, MOUNTAIN_SUBS, subIcon, subLabel } from "@/lib/categories";
import { addDays, formatMinutes, openStatus, parisNow, rangesOn, WEEKDAYS } from "@/lib/hours";
import { formatPrice, formatSeason, LEVEL_LABELS, stockAge } from "@/lib/labels";
import { getNearbyEvents, getPlacePage } from "@/lib/queries";
import { inSeason } from "@/lib/search";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getPlacePage((await params).id);
  return data ? { title: `${data.place.name} · Vallée d'Ax`, description: data.place.tagline } : { title: "Fiche introuvable" };
}

function weeklyText(hours: Parameters<typeof rangesOn>[0]) {
  return [1, 2, 3, 4, 5, 6, 7]
    .flatMap((d) => rangesOn(hours, d).map(([a, b]) => `${WEEKDAYS[d].toLowerCase()} ${formatMinutes(a)} – ${formatMinutes(b)}`))
    .join(", ");
}

export default async function PlacePage({ params }: Params) {
  const data = await getPlacePage((await params).id);
  if (!data) notFound();
  const { place: p, sellsAt, sellers, events } = data;
  const today = parisNow().date;
  const win = { from: today, to: addDays(today, 35) };
  const status = p.closed ? { open: false, label: `Fermé temporairement${p.closedNote ? ` · ${p.closedNote}` : ""}` } : openStatus(p.hours);
  const outOfSeason = !inSeason(p.season, { from: today, to: today });
  const hidden = p.visibility !== "PUBLIC";
  const nearby = p.kind === "ACTIVITE" || p.kind === "COMMERCE" ? await getNearbyEvents(p.location.lat, p.location.lng) : [];

  // Dates à venir : marchés où le producteur vend + événements auxquels il participe.
  const dates =
    p.kind === "PRODUCTEUR"
      ? [
          ...sellsAt.flatMap((m) => marketOccurrences(m, win).map((o) => ({ o, href: `/lieux/${m.id}` }))),
          ...events.map((e) => ({ o: eventOccurrence(e), href: `/evenements/${e.id}` })),
        ].sort((a, b) => a.o.date.localeCompare(b.o.date) || a.o.startMinutes - b.o.startMinutes).slice(0, 6)
      : p.kind === "LOCAL"
        ? marketOccurrences(p, win).slice(0, 6).map((o) => ({ o, href: `/lieux/${p.id}` }))
        : events.map((e) => ({ o: eventOccurrence(e), href: `/evenements/${e.id}` }));

  const sections: { id: string; title: string }[] = [{ id: "presentation", title: "Présentation" }];
  if (p.kind === "ACTIVITE") sections.push({ id: "pratique", title: "Infos pratiques" });
  if (p.products.length) sections.push({ id: "produits", title: "Produits" });
  if (p.kind === "PRODUCTEUR") sections.push({ id: "trouver", title: "Où nous trouver" });
  if ((p.kind === "COMMERCE" || p.kind === "LOCAL") && p.hours) sections.push({ id: "horaires", title: p.kind === "LOCAL" && p.subcategory === "marchelocal" ? "Jours de marché" : "Horaires" });
  if (sellers.length) sections.push({ id: "producteurs", title: "Producteurs présents" });
  if (dates.length) sections.push({ id: "agenda", title: "Prochaines dates" });
  sections.push({ id: "contact", title: "Contact" });

  const f = p.facts;
  const facts = f
    ? ([
        ["Durée", f.duration], ["Distance", f.distance], ["Dénivelé", f.elevation], ["Niveau", f.level ? LEVEL_LABELS[f.level] : ""],
        ["Public", f.audience], ["Tarif", f.price], ["Saison", formatSeason(p.season)],
      ].filter(([, v]) => v) as [string, string][])
    : [];

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
      <Link href="/" className="text-sm text-stone-500 hover:underline">← Retour à la carte</Link>
      <Hero kind={p.kind} subcategory={p.subcategory} title={p.name} tagline={p.tagline}>
        <p className="flex flex-wrap items-center gap-2 text-sm">
          📍 {p.commune}
          {status && <span className={status.open ? "badge-ok" : "badge-off"} style={{ marginTop: 0 }}>{status.label}</span>}
          {p.season.length > 0 && outOfSeason && <span className="badge-off" style={{ marginTop: 0 }}>Hors saison ({formatSeason(p.season)})</span>}
        </p>
      </Hero>

      <nav className="site-nav" aria-label="Sections de la fiche">
        {sections.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          <Section id="presentation" title="Présentation">
            {p.description && <p className="max-w-prose whitespace-pre-line">{p.description}</p>}
            {p.story && <p className="max-w-prose whitespace-pre-line text-stone-600">{p.story}</p>}
            {p.isPseudonym && <p className="text-sm italic text-stone-500">Ce producteur a choisi de rester anonyme : écrivez-lui avec le formulaire de contact.</p>}
            {p.labels.length > 0 && <div className="flex flex-wrap gap-2">{p.labels.map((l) => <span key={l} className="rounded-md border border-stone-300 px-2 text-xs text-stone-600">{l}</span>)}</div>}
          </Section>

          {p.kind === "ACTIVITE" && (
            <Section id="pratique" title="Infos pratiques">
              {facts.length > 0 && (
                <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {facts.map(([k, v]) => (
                    <div key={k} className="rounded-xl border border-stone-200 bg-white p-3">
                      <dt className="text-xs uppercase tracking-wide text-stone-500">{k}</dt>
                      <dd className="font-display text-lg font-bold">{v}</dd>
                    </div>
                  ))}
                </dl>
              )}
              {f?.meetingPoint && <p>🚩 Point de départ : {f.meetingPoint}</p>}
              {f?.provider && <p>🧭 Encadrement : {f.provider}</p>}
              {p.hours && <HoursTable hours={p.hours} />}
              {MOUNTAIN_SUBS.includes(p.subcategory) && (
                <p className="rounded-lg bg-stone-100 p-3 text-sm">⛰️ En montagne, vérifiez la météo avant de partir et prévenez quelqu&apos;un de votre itinéraire.</p>
              )}
            </Section>
          )}

          {p.products.length > 0 && (
            <Section id="produits" title="Produits">
              {stockAge(p.stockUpdatedAt) && <p className="text-sm text-stone-500">{stockAge(p.stockUpdatedAt)}</p>}
              <ul className="grid gap-2 sm:grid-cols-2">
                {p.products.map((pr) => (
                  <li key={pr.id} className="flex items-start justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
                    <div className="min-w-0">
                      <p className="font-bold">{pr.name}</p>
                      {pr.description && <p className="text-sm text-stone-600">{pr.description}</p>}
                      <p className="text-sm text-stone-700">{formatPrice(pr.priceCents)}{pr.unit && pr.priceCents !== null && ` · ${pr.unit}`}</p>
                    </div>
                    <StockBadge status={pr.stockStatus} />
                  </li>
                ))}
              </ul>
              <p className="rounded-lg bg-stone-100 p-3 text-sm">Pas de vente en ligne : achat sur place, à la ferme ou sur les marchés.</p>
            </Section>
          )}

          {p.kind === "PRODUCTEUR" && (
            <Section id="trouver" title="Où nous trouver">
              {p.hours && (
                <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4">
                  <h3 className="font-bold">🏡 Vente à la ferme</h3>
                  <HoursTable hours={p.hours} />
                </div>
              )}
              {sellsAt.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-bold">Retrouvez nos produits ici</h3>
                  {sellsAt.map((m) => (
                    <PlaceRow key={m.id} href={`/lieux/${m.id}`} icon={subIcon(m.subcategory)} title={m.name}
                      subtitle={m.subcategory === "marchelocal" && m.hours ? `Chaque ${weeklyText(m.hours)}` : m.tagline || subLabel(m.subcategory)} />
                  ))}
                </div>
              )}
              {!p.hours && !sellsAt.length && <p className="text-stone-500">Contactez le producteur pour savoir où trouver ses produits.</p>}
            </Section>
          )}

          {(p.kind === "COMMERCE" || p.kind === "LOCAL") && p.hours && (
            <Section id="horaires" title={p.subcategory === "marchelocal" ? "Jours de marché" : "Horaires"}>
              <HoursTable hours={p.hours} />
            </Section>
          )}

          {sellers.length > 0 && (
            <Section id="producteurs" title="Producteurs présents">
              {sellers.map((s) => {
                const available = s.products.filter((x) => x.stockStatus === "AVAILABLE" || x.stockStatus === "LOW").map((x) => x.name);
                return <PlaceRow key={s.id} href={`/lieux/${s.id}`} icon={subIcon(s.subcategory)} title={s.name} subtitle={available.length ? `Vend : ${available.join(", ")}` : subLabel(s.subcategory)} />;
              })}
            </Section>
          )}

          {dates.length > 0 && (
            <Section id="agenda" title="Prochaines dates">
              {dates.map(({ o, href }) => <DateRow key={o.key} occ={o} href={href} />)}
            </Section>
          )}

          {nearby.length > 0 && (
            <Section id="autour" title="Événements à proximité">
              {nearby.map((e) => <DateRow key={e.id} occ={eventOccurrence(e)} href={`/evenements/${e.id}`} />)}
            </Section>
          )}

          <Section id="contact" title="Contact">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 text-sm">
                <p>📍 {p.address ?? `Commune de ${p.commune}`}</p>
                {hidden && <p className="text-stone-500">{p.isPseudonym ? "Seule la commune est indiquée." : "Position approximative : le producteur préfère rester discret."}</p>}
                {p.phone && <p>📞 <a className="underline" href={`tel:${p.phone.replace(/\s/g, "")}`}>{p.phone}</a></p>}
                {p.email && <p>✉️ <a className="underline" href={`mailto:${p.email}`}>{p.email}</a></p>}
                {p.website && <p>🌐 <a className="underline" href={p.website} target="_blank" rel="noopener noreferrer nofollow">{p.website.replace(/^https?:\/\//, "")}</a></p>}
                {!hidden && (
                  <a className="btn w-full" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${p.location.lat},${p.location.lng}`}>
                    Itinéraire (Google Maps)
                  </a>
                )}
                <CopyLinkButton />
              </div>
              <div className="rounded-xl border border-stone-200 bg-white p-4">
                <h3 className="mb-2 font-bold">Écrire</h3>
                <ContactForm placeId={p.id} />
              </div>
            </div>
          </Section>
        </div>

        <aside className="space-y-3 lg:sticky lg:top-[120px] lg:self-start">
          <div className="h-80 overflow-hidden rounded-2xl border border-stone-200">
            <LazyExploreMap
              maxFitZoom={13}
              markers={[{ id: p.id, href: `/lieux/${p.id}`, lat: p.location.lat, lng: p.location.lng, radiusM: p.location.radiusM, icon: subIcon(p.subcategory), color: KINDS[p.kind].color, title: p.name, subtitle: `${subLabel(p.subcategory)} · ${p.commune}` }]}
            />
          </div>
          <p className="text-xs text-stone-500">Zoomez ou dézoomez pour voir les alentours ; changez de fond (plan, relief, satellite) en haut à droite.</p>
        </aside>
      </div>
    </div>
  );
}
