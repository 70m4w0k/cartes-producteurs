"use client";

import Link from "next/link";
import { useCart } from "./cart";

export function CartLink() {
  const { count } = useCart();
  return (
    <Link href="/panier" className="relative hover:underline" aria-label={`Panier, ${count} article${count > 1 ? "s" : ""}`}>
      🧺 Panier
      {count > 0 && (
        <span className="ml-1 rounded-full bg-moss-700 px-1.5 py-0.5 text-xs font-semibold text-white">{count}</span>
      )}
    </Link>
  );
}
