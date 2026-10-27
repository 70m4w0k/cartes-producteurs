"use client";

import dynamic from "next/dynamic";

/** Carte chargée uniquement côté navigateur (Leaflet n'aime pas le rendu serveur). */
export const LazyProducerMap = dynamic(() => import("./ProducerMap"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">Chargement de la carte…</div>,
});

export const LazyLocationPicker = dynamic(() => import("./LocationPicker"), {
  ssr: false,
  loading: () => <div className="flex h-full items-center justify-center bg-stone-100 text-stone-500">Chargement de la carte…</div>,
});
