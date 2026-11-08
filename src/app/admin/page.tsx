import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { StatusButtons } from "@/components/AdminControls";
import { EventManager } from "@/components/EventManager";
import { KINDS, KIND_ORDER, subIcon, subLabel } from "@/lib/categories";
import { db } from "@/lib/db";
import { formatDate, parisNow } from "@/lib/hours";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration · Vallée d'Ax" };

const STATUS_LABELS = { PENDING: "En attente", APPROVED: "En ligne", SUSPENDED: "Suspendue" } as const;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireAdmin();
  const { type } = await searchParams;
  const kindFilter = KIND_ORDER.includes(type as never) && type !== "EVENEMENT" ? (type as "PRODUCTEUR") : undefined;
  const [places, pending, events, standaloneEvents] = await Promise.all([
    db.place.findMany({ where: kindFilter ? { kind: kindFilter } : {}, include: { owner: { select: { email: true } } }, orderBy: [{ kind: "asc" }, { name: "asc" }] }),
    db.place.findMany({ where: { status: "PENDING" }, include: { owner: { select: { email: true } } }, orderBy: { createdAt: "asc" } }),
    db.event.findMany({ where: { endsAt: { gte: new Date() } }, include: { organiserPlace: { select: { name: true } } }, orderBy: { startsAt: "asc" } }),
    db.event.findMany({ where: { organiserPlaceId: null, endsAt: { gte: new Date() } }, orderBy: { startsAt: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Administration</h1>
        <div className="flex gap-2">
          <Link href="/admin/lieux/nouveau" className="btn">➕ Nouvelle fiche</Link>
          <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">À valider ({pending.length})</h2>
        {pending.length === 0 ? <p className="text-stone-500">Rien à valider.</p> : (
          <ul className="space-y-2">
            {pending.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <div><p className="font-bold">{subIcon(p.subcategory)} {p.name}</p><p className="text-sm text-stone-600">{subLabel(p.subcategory)} · {p.commune} · {p.owner?.email ?? "sans compte"}</p></div>
                <div className="flex gap-2"><Link href={`/admin/lieux/${p.id}`} className="btn-ghost text-sm">Voir / modifier</Link><StatusButtons id={p.id} status={p.status} target="place" /></div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Fiches ({places.length})</h2>
          <nav className="flex flex-wrap gap-1 text-sm">
            <Link href="/admin" className={`chip ${!kindFilter ? "font-bold" : ""}`}>Toutes</Link>
            {(["PRODUCTEUR", "COMMERCE", "ACTIVITE", "LOCAL"] as const).map((k) => <Link key={k} href={`/admin?type=${k}`} className={`chip ${kindFilter === k ? "font-bold" : ""}`}>{KINDS[k].icon} {KINDS[k].label}</Link>)}
          </nav>
        </div>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left"><tr><th className="p-3">Fiche</th><th className="p-3">Compte</th><th className="p-3">Statut</th><th className="p-3" /></tr></thead>
            <tbody className="divide-y divide-stone-200">
              {places.map((p) => (
                <tr key={p.id}>
                  <td className="p-3"><Link href={`/admin/lieux/${p.id}`} className="font-bold underline">{subIcon(p.subcategory)} {p.name}</Link><br /><span className="text-stone-500">{subLabel(p.subcategory)} · {p.commune}</span></td>
                  <td className="p-3">{p.owner?.email ?? <span className="text-stone-400">Gérée par l&apos;administration</span>}</td>
                  <td className="p-3">{STATUS_LABELS[p.status]}</td>
                  <td className="p-3"><StatusButtons id={p.id} status={p.status} target="place" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Événements à venir ({events.length})</h2>
        <ul className="space-y-2">
          {events.map((e) => {
            const s = parisNow(e.startsAt);
            return (
              <li key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
                <div>
                  <p className="font-bold">{subIcon(e.subcategory)} {e.title} {e.status !== "APPROVED" && <span className="badge-off">{STATUS_LABELS[e.status]}</span>}</p>
                  <p className="text-sm text-stone-600 first-letter:uppercase">{formatDate(s.date)} · {e.commune} · {e.organiserPlace?.name ?? "Administration"}</p>
                </div>
                <StatusButtons id={e.id} status={e.status} target="event" />
              </li>
            );
          })}
        </ul>
        <h3 className="pt-2 font-bold">Événements publiés par l&apos;administration</h3>
        <p className="text-sm text-stone-600">Fêtes de village, concerts, foires… qui ne dépendent d&apos;aucune fiche.</p>
        <EventManager organiserPlaceId={null} defaultCommune="Ax-les-Thermes" events={standaloneEvents.map((e) => ({ ...e, startsAt: e.startsAt.toISOString(), endsAt: e.endsAt.toISOString() }))} />
      </section>
    </div>
  );
}
