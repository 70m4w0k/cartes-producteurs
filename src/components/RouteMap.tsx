"use client";

import L from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import type { RoutePlan } from "@/app/actions/orders";
import { TILE_ATTRIBUTION, TILE_URL } from "./map-shared";

function numberIcon(label: string, start = false) {
  return L.divIcon({
    html: `<div class="marker-pin" style="font-size:14px;font-weight:700;${start ? "border-color:#1d4ed8" : ""}">${label}</div>`,
    className: "",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -16],
  });
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length) map.fitBounds(points, { padding: [40, 40], maxZoom: 14 });
  }, [map, points]);
  return null;
}

export default function RouteMap({ plan }: { plan: RoutePlan }) {
  const origin: [number, number] = [plan.origin.lat, plan.origin.lng];
  const stops = plan.stops.map((s) => [s.lat, s.lng] as [number, number]);
  const line = plan.geometry ?? [origin, ...stops];
  return (
    <MapContainer center={origin} zoom={12} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <FitBounds points={[origin, ...stops]} />
      <Polyline positions={line} pathOptions={{ color: "#3b5c33", weight: 4, dashArray: plan.geometry ? undefined : "6 8" }} />
      <Marker position={origin} icon={numberIcon("🏁", true)}>
        <Popup>Départ</Popup>
      </Marker>
      {plan.stops.map((s, i) => (
        <Marker key={s.producerOrderId} position={[s.lat, s.lng]} icon={numberIcon(String(i + 1))}>
          <Popup>
            <strong>{i + 1}. {s.place}</strong>
            {s.address && <><br />{s.address}</>}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
