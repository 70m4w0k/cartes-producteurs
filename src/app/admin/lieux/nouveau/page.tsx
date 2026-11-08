import Link from "next/link";
import { createPlace } from "@/app/actions/places";
import { PlaceForm } from "@/components/PlaceForm";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewPlacePage() {
  await requireAdmin();
  const localPlaces = await db.place.findMany({ where: { kind: "LOCAL", status: "APPROVED" }, select: { id: true, name: true }, orderBy: { name: "asc" } });
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Link href="/admin" className="text-sm text-stone-500 hover:underline">← Administration</Link>
      <h1 className="text-2xl font-bold">Nouvelle fiche</h1>
      <p className="text-stone-600">Pour référencer un lieu sans compte pro : site de randonnée, marché, commerce… Elle est publiée directement.</p>
      <PlaceForm
        place={{ kind: "ACTIVITE", subcategory: "randonnee", name: "", tagline: "", description: "", story: "", commune: "Ax-les-Thermes", address: "", latitude: null, longitude: null, phone: "", email: "", website: "", labels: [], season: [], visibility: "PUBLIC", closed: false, closedNote: "", hours: null, facts: null }}
        action={createPlace}
        localPlaces={localPlaces}
        sellsAt={[]}
        canChangeKind
        submitLabel="Créer la fiche"
      />
    </div>
  );
}
