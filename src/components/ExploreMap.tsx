"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { Circle, LayersControl, MapContainer, Marker, Popup, ScaleControl, TileLayer, ZoomControl, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import { BASE_LAYERS, VALLEY_BOUNDS, clusterIcon, dotIcon, pinIcon } from "./map-shared";

export type MapMarker = {
  id: string;
  href: string;
  lat: number;
  lng: number;
  /** Rayon (m) d'une position floutée, 0 sinon. */
  radiusM: number;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  muted?: boolean;
};

type Props = {
  markers: MapMarker[];
  /** Cercle de recherche « autour de… ». */
  circle?: { lat: number; lng: number; km: number } | null;
  highlightId?: string | null;
  onMarkerClick?: (id: string) => void;
  /** Zoom maximal lors du recadrage automatique (une seule fiche : on reste assez large pour voir les alentours). */
  maxFitZoom?: number;
  className?: string;
};

/**
 * Recadre la carte sur les résultats à chaque nouvelle recherche. Si la carte est masquée
 * (mobile, vue liste), on attend qu'elle redevienne visible : Leaflet ne sait pas cadrer une carte de taille nulle.
 */
function FitToResults({ markers, circle, maxFitZoom }: Pick<Props, "markers" | "circle" | "maxFitZoom">) {
  const map = useMap();
  const key = markers.map((m) => m.id).join(",") + (circle ? `|${circle.lat},${circle.lng},${circle.km}` : "");
  const pending = useRef(true);

  const fit = (animate: boolean) => {
    const size = map.getSize();
    if (!size.x || !size.y) {
      pending.current = true;
      return;
    }
    pending.current = false;
    const pts: L.LatLngExpression[] = markers.map((m) => [m.lat, m.lng]);
    let bounds = pts.length ? L.latLngBounds(pts) : L.latLngBounds(VALLEY_BOUNDS);
    if (circle) bounds = bounds.extend(L.latLng(circle.lat, circle.lng).toBounds(circle.km * 2000));
    const opts = { padding: [48, 48] as [number, number], maxZoom: maxFitZoom ?? 14 };
    if (animate) map.flyToBounds(bounds, { ...opts, duration: 0.6 });
    else map.fitBounds(bounds, opts);
  };

  useEffect(() => {
    fit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, map]);

  useEffect(() => {
    const el = map.getContainer();
    const ro = new ResizeObserver(() => {
      map.invalidateSize();
      if (pending.current) fit(false);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, key]);
  return null;
}

function MapButtons() {
  const map = useMap();
  const [me, setMe] = useState<L.LatLng | null>(null);
  const [error, setError] = useState("");
  const locate = () => {
    setError("");
    if (!navigator.geolocation) return setError("Géolocalisation indisponible");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const ll = L.latLng(p.coords.latitude, p.coords.longitude);
        setMe(ll);
        map.flyTo(ll, Math.max(map.getZoom(), 13));
      },
      () => setError("Position refusée ou indisponible"),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };
  return (
    <>
      <div className="leaflet-top leaflet-left">
        <div className="leaflet-control map-tools">
          <button type="button" onClick={locate} title="Me localiser" aria-label="Me localiser">◎</button>
          <button type="button" onClick={() => map.flyToBounds(VALLEY_BOUNDS, { duration: 0.6 })} title="Voir toute la vallée" aria-label="Voir toute la vallée">⤢</button>
        </div>
        {error && <div className="leaflet-control map-error">{error}</div>}
      </div>
      {me && <Marker position={me} icon={dotIcon()} title="Vous êtes ici" />}
    </>
  );
}

function OpenPopupFor({ id, refs }: { id?: string | null; refs: React.RefObject<Map<string, L.Marker>> }) {
  useEffect(() => {
    if (id) refs.current?.get(id)?.openPopup();
  }, [id, refs]);
  return null;
}

export default function ExploreMap({ markers, circle, highlightId, onMarkerClick, maxFitZoom, className = "h-full w-full" }: Props) {
  const refs = useRef(new Map<string, L.Marker>());
  const [popupFor, setPopupFor] = useState<string | null>(null);
  const sorted = useMemo(() => [...markers].sort((a, b) => (a.id === highlightId ? 1 : b.id === highlightId ? -1 : 0)), [markers, highlightId]);

  return (
    <MapContainer bounds={VALLEY_BOUNDS} zoomControl={false} scrollWheelZoom className={className}>
      <LayersControl position="topright">
        {BASE_LAYERS.map((l, i) => (
          <LayersControl.BaseLayer key={l.id} name={l.name} checked={i === 0}>
            <TileLayer url={l.url} attribution={l.attribution} maxZoom={l.maxZoom} subdomains={l.subdomains ?? "abc"} detectRetina />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>
      <ZoomControl position="bottomright" />
      <ScaleControl position="bottomleft" imperial={false} />
      <MapButtons />
      <FitToResults markers={markers} circle={circle} maxFitZoom={maxFitZoom} />
      <OpenPopupFor id={popupFor} refs={refs} />
      {circle && (
        <Circle center={[circle.lat, circle.lng]} radius={circle.km * 1000} pathOptions={{ color: "#b87a12", weight: 2, dashArray: "6 6", fillOpacity: 0.05 }} />
      )}
      {sorted.filter((m) => m.radiusM > 0).map((m) => (
        <Circle key={`c-${m.id}`} center={[m.lat, m.lng]} radius={m.radiusM} pathOptions={{ color: m.color, weight: 1, dashArray: "3 5", fillOpacity: 0.06, opacity: 0.6 }} />
      ))}
      {/* Les épingles proches se regroupent en pastilles numérotées, comme sur Google Maps. */}
      <MarkerClusterGroup chunkedLoading maxClusterRadius={36} showCoverageOnHover={false} spiderfyOnMaxZoom iconCreateFunction={clusterIcon}>
        {sorted.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={pinIcon(m.icon, m.color, { highlight: m.id === highlightId, muted: m.muted })}
            title={m.title}
            zIndexOffset={m.id === highlightId ? 1000 : 0}
            ref={(r) => {
              if (r) refs.current.set(m.id, r);
              else refs.current.delete(m.id);
            }}
            eventHandlers={{ click: () => { onMarkerClick?.(m.id); setPopupFor(m.id); } }}
          >
            <Popup>
              <div className="map-card">
                <p className="map-card-title">{m.title}</p>
                <p className="map-card-sub">{m.subtitle}</p>
                {m.radiusM > 0 && <p className="map-card-note">Position approximative</p>}
                <Link href={m.href} className="map-card-link">Voir la fiche →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
