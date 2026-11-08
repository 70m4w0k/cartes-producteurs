import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CopyLinkButton } from "@/components/CopyLinkButton";
import { LazyExploreMap } from "@/components/LazyMap";
import { Hero, PlaceRow, Section } from "@/components/PlaceBits";
import { eventOccurrence } from "@/lib/agenda";
import { KINDS, subIcon, subLabel } from "@/lib/categories";
import { formatDate, formatMinutes } from "@/lib/hours";
import { getEventPage } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const data = await getEventPage((await params).id);
  return data ? { title: `${data.event.title} · Vallée d'Ax`, description: data.event.tagline } : { title: "Événement introuvable" };
}

export default async function EventPage({ params }: Params) {
  const data = await getEventPage((await params).id);
  if (!data) notFound();
  const { event: e, participants, organiserPlace } = data;
  const o = eventOccurrence(e);
  const when = o.endDate === o.date
    ? `${formatDate(o.date)}, ${formatMinutes(o.startMinutes)} – ${formatMinutes(o.endMinutes)}`
    : `Du ${formatDate(o.date)} (${formatMinutes(o.startMinutes)}) au ${formatDate(o.endDate)} (${formatMinutes(o.endMinutes)})`;

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-5">
      <Link href="/?type=EVENEMENT" className="text-sm text-stone-500 hover:underline">← Retour à l&apos;agenda</Link>
      <Hero kind="EVENEMENT" subcategory={e.subcategory} title={e.title} tagline={e.tagline}>
        <p className="text-sm first-letter:uppercase">🗓️ {when} · 📍 {e.commune}</p>
      </Hero>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-10">
          <dl className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {[["Quand", when], ["Tarif", e.price || "Non précisé"], ["Organisateur", e.organiser || "—"]].map(([k, v]) => (
              <div key={k} className="rounded-xl border border-stone-200 bg-white p-3">
                <dt className="text-xs uppercase tracking-wide text-stone-500">{k}</dt>
                <dd className="font-bold first-letter:uppercase">{v}</dd>
              </div>
            ))}
          </dl>
          {e.description && <Section id="presentation" title="Présentation"><p className="max-w-prose whitespace-pre-line">{e.description}</p></Section>}
          {e.programme.length > 0 && (
            <Section id="programme" title="Programme">
              <ul className="list-disc space-y-1 pl-5">{e.programme.map((l) => <li key={l}>{l}</li>)}</ul>
            </Section>
          )}
          {participants.length > 0 && (
            <Section id="presents" title="Producteurs et commerçants présents">
              {participants.map((p) => <PlaceRow key={p.id} href={`/lieux/${p.id}`} icon={subIcon(p.subcategory)} title={p.name} subtitle={`${subLabel(p.subcategory)} · ${p.commune}`} />)}
            </Section>
          )}
          <Section id="pratique" title="Y aller">
            <div className="space-y-2 rounded-xl border border-stone-200 bg-white p-4 text-sm">
              <p>📍 {e.address || `Commune de ${e.commune}`}</p>
              {organiserPlace && <p>Organisé par <Link className="underline" href={`/lieux/${organiserPlace.id}`}>{organiserPlace.name}</Link></p>}
              <a className="btn w-full" target="_blank" rel="noopener noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${e.location.lat},${e.location.lng}`}>Itinéraire (Google Maps)</a>
              <CopyLinkButton />
            </div>
          </Section>
        </div>
        <aside className="lg:sticky lg:top-[120px] lg:self-start">
          <div className="h-80 overflow-hidden rounded-2xl border border-stone-200">
            <LazyExploreMap maxFitZoom={13}
              markers={[{ id: e.id, href: `/evenements/${e.id}`, lat: e.location.lat, lng: e.location.lng, radiusM: 0, icon: subIcon(e.subcategory), color: KINDS.EVENEMENT.color, title: e.title, subtitle: `${subLabel(e.subcategory)} · ${e.commune}` }]} />
          </div>
        </aside>
      </div>
    </div>
  );
}
