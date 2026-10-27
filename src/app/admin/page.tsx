import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { ProducerStatusButtons, RelayActiveToggle, RelayPointForm } from "@/components/AdminControls";
import { db } from "@/lib/db";
import { CATEGORY_ICONS, CATEGORY_LABELS, VISIBILITY_LABELS } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Administration · Producteurs de la vallée d'Ax" };

const STATUS_LABELS = { PENDING: "En attente", APPROVED: "Validé", SUSPENDED: "Suspendu" } as const;

export default async function AdminPage() {
  await requireAdmin();
  const [producers, relayPoints] = await Promise.all([
    db.producer.findMany({
      include: { user: { select: { email: true } }, _count: { select: { products: true } } },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    db.relayPoint.findMany({ include: { _count: { select: { producers: true } } }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Administration</h1>
        <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
      </div>

      <section>
        <h2 className="mb-3 text-xl font-semibold">Producteurs ({producers.length})</h2>
        <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-stone-50 text-left">
              <tr>
                <th className="p-3">Producteur</th>
                <th className="p-3">Compte</th>
                <th className="p-3">Visibilité</th>
                <th className="p-3">Statut</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {producers.map((p) => (
                <tr key={p.id}>
                  <td className="p-3">
                    {CATEGORY_ICONS[p.category]}{" "}
                    {p.status === "APPROVED" ? <Link href={`/producteurs/${p.id}`} className="font-medium underline">{p.name}</Link> : <span className="font-medium">{p.name}</span>}
                    <br />
                    <span className="text-stone-500">{CATEGORY_LABELS[p.category]} · {p.commune} · {p._count.products} produit(s)</span>
                  </td>
                  <td className="p-3">{p.user.email}</td>
                  <td className="p-3">{VISIBILITY_LABELS[p.visibility].title}</td>
                  <td className="p-3">{STATUS_LABELS[p.status]}</td>
                  <td className="p-3"><ProducerStatusButtons id={p.id} status={p.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Points relais ({relayPoints.length})</h2>
        <ul className="space-y-2">
          {relayPoints.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-stone-200 bg-white p-3">
              <div>
                <p className="font-medium">{r.name} {!r.active && <span className="text-sm text-red-700">(désactivé)</span>}</p>
                <p className="text-sm text-stone-600">{r.address} · {r._count.producers} producteur(s)</p>
              </div>
              <RelayActiveToggle id={r.id} active={r.active} />
            </li>
          ))}
        </ul>
        <RelayPointForm />
      </section>
    </div>
  );
}
