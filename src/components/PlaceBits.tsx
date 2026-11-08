import Link from "next/link";
import type { Occurrence } from "@/lib/agenda";
import { KINDS, subIcon, subLabel, type ListingKind } from "@/lib/categories";
import { formatDate, formatMinutes, parisNow, rangesOn, WEEKDAYS, type WeeklyHours } from "@/lib/hours";

/** Bandeau d'en-tête d'une fiche : couleur du type, relief stylisé, pictogramme. */
export function Hero({ kind, subcategory, title, tagline, children }: { kind: ListingKind; subcategory: string; title: string; tagline?: string; children?: React.ReactNode }) {
  const color = KINDS[kind].color;
  return (
    <div className="relative flex min-h-56 items-end overflow-hidden rounded-2xl" style={{ background: `color-mix(in srgb, ${color} 30%, white)` }}>
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 260" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <path d="M0 170 L110 80 L190 130 L300 40 L410 120 L500 70 L610 128 L700 82 L800 116 V260 H0Z" fill={color} opacity=".35" />
        <path d="M0 210 L140 150 L260 186 L380 132 L520 178 L650 142 L800 172 V260 H0Z" fill={color} opacity=".6" />
        <text x="690" y="120" fontSize="96" textAnchor="middle">{subIcon(subcategory)}</text>
      </svg>
      <div className="relative w-full space-y-1.5 bg-gradient-to-t from-black/55 to-transparent p-5 text-white">
        <p className="text-xs font-bold uppercase tracking-wider">{KINDS[kind].icon} {KINDS[kind].one} · {subLabel(subcategory)}</p>
        <h1 className="text-3xl font-bold text-white sm:text-4xl">{title}</h1>
        {tagline && <p className="max-w-2xl">{tagline}</p>}
        {children}
      </div>
    </div>
  );
}

export function HoursTable({ hours }: { hours: WeeklyHours | null }) {
  if (!hours) return null;
  const today = parisNow().weekday;
  return (
    <table className="w-full text-sm">
      <tbody>
        {[1, 2, 3, 4, 5, 6, 7].map((d) => {
          const r = rangesOn(hours, d);
          return (
            <tr key={d} className={`border-t border-stone-200 first:border-0 ${d === today ? "font-bold" : ""}`}>
              <td className="py-1.5">{WEEKDAYS[d]}</td>
              <td className="py-1.5 text-right tabular-nums">{r.length ? r.map(([a, b]) => `${formatMinutes(a)} – ${formatMinutes(b)}`).join(" · ") : <span className="text-stone-400">Fermé</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export function DateRow({ occ, href }: { occ: Pick<Occurrence, "date" | "startMinutes" | "endMinutes" | "title" | "commune">; href: string }) {
  const d = new Date(`${occ.date}T12:00:00Z`);
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 hover:border-moss-600">
      <span className="w-12 flex-none rounded-lg bg-stone-100 py-1 text-center leading-tight">
        <span className="block text-[0.7rem] uppercase text-stone-500">{d.toLocaleDateString("fr-FR", { weekday: "short", timeZone: "UTC" })}</span>
        <span className="block font-display text-xl font-bold">{d.getUTCDate()}</span>
        <span className="block text-[0.7rem] uppercase text-stone-500">{d.toLocaleDateString("fr-FR", { month: "short", timeZone: "UTC" })}</span>
      </span>
      <span className="min-w-0">
        <span className="block font-bold">{occ.title}</span>
        <span className="block text-sm text-stone-600">{formatMinutes(occ.startMinutes)} – {formatMinutes(occ.endMinutes)} · {occ.commune}</span>
      </span>
    </Link>
  );
}

export function PlaceRow({ href, icon, title, subtitle }: { href: string; icon: string; title: string; subtitle: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-2.5 hover:border-moss-600">
      <span className="text-2xl" aria-hidden>{icon}</span>
      <span className="min-w-0"><span className="block font-bold">{title}</span><span className="block text-sm text-stone-600">{subtitle}</span></span>
    </Link>
  );
}

export function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="site-sec space-y-3">
      <h2 className="text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export { formatDate };
