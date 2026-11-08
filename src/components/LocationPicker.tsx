"use client";

import { LayersControl, MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { BASE_LAYERS, VALLEY_BOUNDS, pinIcon } from "./map-shared";

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
  emoji: string;
  color: string;
};

function ClickHandler({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function LocationPicker({ value, onChange, emoji, color }: Props) {
  return (
    <MapContainer {...(value ? { center: [value.lat, value.lng] as [number, number], zoom: 15 } : { bounds: VALLEY_BOUNDS })} className="h-full w-full">
      <LayersControl position="topright">
        {BASE_LAYERS.map((l, i) => (
          <LayersControl.BaseLayer key={l.id} name={l.name} checked={i === 0}>
            <TileLayer url={l.url} attribution={l.attribution} maxZoom={l.maxZoom} subdomains={l.subdomains ?? "abc"} />
          </LayersControl.BaseLayer>
        ))}
      </LayersControl>
      <ClickHandler onChange={onChange} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={pinIcon(emoji, color)}
          draggable
          eventHandlers={{ dragend: (e) => { const ll = e.target.getLatLng(); onChange({ lat: ll.lat, lng: ll.lng }); } }}
        />
      )}
    </MapContainer>
  );
}
