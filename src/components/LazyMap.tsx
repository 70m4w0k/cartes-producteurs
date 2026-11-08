"use client";

import dynamic from "next/dynamic";

const loading = () => <div className="flex h-full min-h-48 items-center justify-center bg-stone-100 text-stone-500">Chargement de la carte…</div>;

/** Cartes chargées uniquement côté navigateur (Leaflet n'aime pas le rendu serveur). */
export const LazyExploreMap = dynamic(() => import("./ExploreMap"), { ssr: false, loading });
export const LazyLocationPicker = dynamic(() => import("./LocationPicker"), { ssr: false, loading });
