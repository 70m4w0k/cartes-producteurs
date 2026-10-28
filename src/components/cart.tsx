"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { MAX_QUANTITY } from "@/lib/orders";

export type CartItem = { productId: string; quantity: number };

type CartContextValue = {
  items: CartItem[];
  /** false tant que le panier n'a pas été relu depuis le navigateur. */
  loaded: boolean;
  count: number;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
};

const STORAGE_KEY = "panier-v1";
const CartContext = createContext<CartContextValue | null>(null);

function readStorage(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(raw)
      ? raw.filter((i) => typeof i?.productId === "string" && Number.isInteger(i?.quantity) && i.quantity > 0)
      : [];
  } catch {
    return [];
  }
}

const clamp = (q: number) => Math.max(1, Math.min(MAX_QUANTITY, Math.round(q)));

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setItems(readStorage());
    setLoaded(true);
    // Synchronise les onglets ouverts en parallèle.
    const onStorage = (e: StorageEvent) => e.key === STORAGE_KEY && setItems(readStorage());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Stockage indisponible (navigation privée…) : le panier reste en mémoire.
    }
  }, [items, loaded]);

  const add = useCallback((productId: string, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === productId);
      return existing
        ? prev.map((i) => (i.productId === productId ? { ...i, quantity: clamp(i.quantity + quantity) } : i))
        : [...prev, { productId, quantity: clamp(quantity) }];
    });
  }, []);
  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, quantity: clamp(quantity) } : i)));
  }, []);
  const remove = useCallback((productId: string) => setItems((prev) => prev.filter((i) => i.productId !== productId)), []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo(
    () => ({ items, loaded, count: items.reduce((n, i) => n + i.quantity, 0), add, setQuantity, remove, clear }),
    [items, loaded, add, setQuantity, remove, clear],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}
