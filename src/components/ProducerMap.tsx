"use client";

import Link from "next/link";
import { Fragment, useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import { VALLEY_CENTER } from "@/lib/communes";
import { CATEGORY_ICONS, CATEGORY_LABELS } from "@/lib/labels";
import type { PublicProducer } from "@/lib/privacy";
import type { PublicRelayPoint } from "@/lib/queries";
import { emojiIcon, TILE_ATTRIBUTION, TILE_URL } from "./map-shared";

type MapProducer = Pick<PublicProducer, "id" | "displayName" | "category" | "closed" | "location" | "commune">;

type Props = {
  producers: MapProducer[];
  relayPoints?: PublicRelayPoint[];
  focus?: { lat: number; lng: number } | null;
  zoom?: number;
  className?: string;
  linkToProducer?: boolean;
};

function FlyTo({ focus }: { focus?: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (focus) map.flyTo([focus.lat, focus.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [focus, map]);
  return null;
}

const PRECISION_NOTE = {
  exact: null,
  approximate: "Position approximative (~1 km)",
  commune: "Seule la commune est indiquée",
} as const;

export default function ProducerMap({
  producers,
  relayPoints = [],
  focus,
  zoom = 12,
  className = "h-full w-full",
  linkToProducer = true,
}: Props) {
  const center: [number, number] =
    producers.length === 1 && !relayPoints.length
      ? [producers[0].location.lat, producers[0].location.lng]
      : VALLEY_CENTER;

  return (
    <MapContainer center={center} zoom={zoom} scrollWheelZoom className={className}>
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FlyTo focus={focus} />
      {producers.map((p) => (
        <Fragment key={p.id}>
          {p.location.radiusM > 0 && (
            <Circle
              center={[p.location.lat, p.location.lng]}
              radius={p.location.radiusM}
              pathOptions={{ color: "#3b5c33", weight: 1, fillOpacity: 0.08, dashArray: "4 4" }}
            />
          )}
          <Marker
            position={[p.location.lat, p.location.lng]}
            icon={emojiIcon(CATEGORY_ICONS[p.category], p.closed ? "closed" : "producer")}
            title={p.displayName}
          >
            <Popup>
              <div className="space-y-1">
                <p className="font-semibold">{p.displayName}</p>
                <p className="text-xs text-stone-600">
                  {CATEGORY_LABELS[p.category]} · {p.commune}
                  {p.closed && " · Fermé temporairement"}
                </p>
                {PRECISION_NOTE[p.location.precision] && (
                  <p className="text-xs italic text-stone-500">{PRECISION_NOTE[p.location.precision]}</p>
                )}
                {linkToProducer && (
                  <Link href={`/producteurs/${p.id}`} className="text-sm font-medium text-moss-700 underline">
                    Voir la fiche
                  </Link>
                )}
              </div>
            </Popup>
          </Marker>
        </Fragment>
      ))}
      {relayPoints.map((r) => (
        <Marker key={r.id} position={[r.lat, r.lng]} icon={emojiIcon("📦", "relay")} title={r.name}>
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">📦 {r.name}</p>
              <p className="text-xs text-stone-600">{r.address}</p>
              {r.openingHours && <p className="text-xs">{r.openingHours}</p>}
              <Link href={`/points-relais#${r.id}`} className="text-sm font-medium text-blue-700 underline">
                Producteurs présents ({r.producers.length})
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
