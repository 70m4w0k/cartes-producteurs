import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { NavLinks } from "@/components/NavLinks";
import { getSession } from "@/lib/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vallée d'Ax · à voir, à faire, à goûter",
  description: "Activités, producteurs, commerces, marchés et événements de la vallée d'Ax-les-Thermes, en Haute-Ariège.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&display=swap" />
      </head>
      <body className="flex min-h-dvh flex-col">
        <header className="sticky top-0 z-[1100] border-b border-stone-200 bg-white">
          <nav className="flex h-[57px] items-center gap-x-1 gap-y-1 px-4 text-[0.95rem]">
            <Link href="/" className="mr-auto flex flex-col leading-tight">
              <span className="font-display text-lg font-bold text-moss-800">Vallée d&apos;Ax</span>
              <span className="hidden text-[0.7rem] uppercase tracking-wider text-stone-500 sm:block">Haute-Ariège · à voir, à faire, à goûter</span>
            </Link>
            <Suspense><NavLinks /></Suspense>
            <Link href={session ? (session.role === "ADMIN" ? "/admin" : "/espace") : "/connexion"} className="ml-1 rounded-lg border border-stone-300 px-2.5 py-1.5 hover:bg-stone-100">
              {session ? (session.role === "ADMIN" ? "Admin" : "Mon espace") : "Espace pro"}
            </Link>
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
