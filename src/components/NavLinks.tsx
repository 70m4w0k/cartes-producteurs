"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

const LINKS = [
  { href: "/", label: "Explorer", match: (p: string, t: string | null) => p === "/" && t !== "EVENEMENT" && t !== "LOCAL" },
  { href: "/?type=EVENEMENT", label: "Agenda", match: (p: string, t: string | null) => p === "/" && t === "EVENEMENT" },
  { href: "/?type=LOCAL", label: "Acheter local", match: (p: string, t: string | null) => p === "/" && t === "LOCAL" },
];

export function NavLinks() {
  const pathname = usePathname();
  const type = useSearchParams().get("type");
  return (
    <>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={l.match(pathname, type) ? "page" : undefined}
          className="rounded-lg px-2.5 py-1.5 hover:bg-stone-100 aria-[current=page]:bg-stone-100 aria-[current=page]:font-bold">
          {l.label}
        </Link>
      ))}
    </>
  );
}
