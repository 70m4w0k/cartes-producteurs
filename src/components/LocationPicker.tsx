"use client";

import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { VALLEY_CENTER } from "@/lib/communes";
import { emojiIcon, TILE_ATTRIBUTION, TILE_URL } from "./map-shared";

type Props = {
  value: { lat: number; lng: number } | null;
  onChange: (v: { lat: number; lng: number }) => void;
  emoji: string;
};

function ClickHandler({ onChange }: Pick<Props, "onChange">) {
  useMapEvents({ click: (e) => onChange({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

export default function LocationPicker({ value, onChange, emoji }: Props) {
  return (
    <MapContainer center={value ? [value.lat, value.lng] : VALLEY_CENTER} zoom={value ? 14 : 11} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ClickHandler onChange={onChange} />
      {value && (
        <Marker
          position={[value.lat, value.lng]}
          icon={emojiIcon(emoji)}
          draggable
          eventHandlers={{
            dragend: (e) => {
              const ll = e.target.getLatLng();
              onChange({ lat: ll.lat, lng: ll.lng });
            },
          }}
        />
      )}
    </MapContainer>
  );
}
