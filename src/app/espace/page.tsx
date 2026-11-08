import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { PlaceManagement } from "@/components/PlaceManagement";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Espace pro · Vallée d'Ax" };

export default async function ProSpacePage({ searchParams }: { searchParams: Promise<{ lieu?: string }> }) {
  const user = await requireUser();
  const places = await db.place.findMany({ where: { ownerId: user.id }, orderBy: { createdAt: "asc" }, select: { id: true, name: true } });
  if (!places.length) redirect(user.role === "ADMIN" ? "/admin" : "/inscription");
  const { lieu } = await searchParams;
  const current = places.find((p) => p.id === lieu) ?? places[0];

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-500">Espace pro · {user.email}</p>
        <div className="flex gap-2">
          {user.role === "ADMIN" && <Link href="/admin" className="btn-ghost">Administration</Link>}
          <form action={logout}><button className="btn-ghost">Se déconnecter</button></form>
        </div>
      </div>
      {places.length > 1 && (
        <nav className="flex flex-wrap gap-2">
          {places.map((p) => <Link key={p.id} href={`/espace?lieu=${p.id}`} className={`chip ${p.id === current.id ? "font-bold" : ""}`} aria-current={p.id === current.id ? "page" : undefined}>{p.name}</Link>)}
        </nav>
      )}
      <PlaceManagement placeId={current.id} isAdmin={user.role === "ADMIN"} />
    </div>
  );
}
