import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Page introuvable</h1>
      <p className="mt-2 text-stone-600">Ce producteur n&apos;existe pas ou n&apos;est plus référencé.</p>
      <Link href="/" className="btn mt-6">Retour à la carte</Link>
    </div>
  );
}
