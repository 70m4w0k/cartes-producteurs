import Link from "next/link";
import { notFound } from "next/navigation";
import { PlaceManagement } from "@/components/PlaceManagement";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminPlacePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!(await db.place.findUnique({ where: { id }, select: { id: true } }))) notFound();
  return (
    <div className="mx-auto max-w-4xl space-y-4 px-4 py-6">
      <Link href="/admin" className="text-sm text-stone-500 hover:underline">← Administration</Link>
      <PlaceManagement placeId={id} isAdmin />
    </div>
  );
}
