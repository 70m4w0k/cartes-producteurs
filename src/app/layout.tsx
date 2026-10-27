import type { Metadata } from "next";
import Link from "next/link";
import { getSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Producteurs de la vallée d'Ax",
  description: "Trouvez les petits producteurs de la vallée d'Ax-les-Thermes : miel, fromage, viande, tissus, champignons.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="fr">
      <body className="min-h-screen flex flex-col">
        <header className="border-b border-stone-200 bg-white">
          <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
            <Link href="/" className="mr-auto text-lg font-bold text-moss-800">
              🏔️ Producteurs de la vallée d&apos;Ax
            </Link>
            <Link href="/" className="hover:underline">Carte</Link>
            <Link href="/points-relais" className="hover:underline">Points relais</Link>
            {session?.role === "ADMIN" && <Link href="/admin" className="hover:underline">Admin</Link>}
            {session ? (
              <Link href={session.role === "ADMIN" ? "/admin" : "/espace"} className="btn">Mon espace</Link>
            ) : (
              <Link href="/connexion" className="btn">Espace producteur</Link>
            )}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
        <footer className="border-t border-stone-200 bg-white px-4 py-4 text-center text-sm text-stone-500">
          Annuaire local des producteurs de Haute-Ariège ·{" "}
          <Link href="/inscription" className="underline">Vous êtes producteur ? Inscrivez-vous</Link>
        </footer>
      </body>
    </html>
  );
}
