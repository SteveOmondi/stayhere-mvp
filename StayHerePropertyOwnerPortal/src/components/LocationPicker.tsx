import { useEffect, useRef, useCallback } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  type MapMouseEvent,
} from "@vis.gl/react-google-maps";

const NAIROBI = { lat: -1.2833, lng: 36.8167 };
const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string;

type LatLng = { lat: number; lng: number };

export type LocationPickerProps = {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
  onClear: () => void;
};

// Render-less child of Map that pans/zooms when pos changes externally (e.g. after place search)
function MapPanner({ pos }: { pos: LatLng | null }) {
  const map = useMap();
  const lastKey = useRef("");

  useEffect(() => {
    if (!map || !pos) return;
    const key = `${pos.lat},${pos.lng}`;
    if (key === lastKey.current) return;
    lastKey.current = key;
    map.panTo(pos);
    map.setZoom(16);
  }, [map, pos]);

  return null;
}

// Binds a google.maps.places.Autocomplete to a plain <input>
function PlacesSearch({ onSelect }: { onSelect: (lat: number, lng: number) => void }) {
  const places = useMapsLibrary("places");
  const inputRef = useRef<HTMLInputElement>(null);
  const acRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!places || !inputRef.current || acRef.current) return;
    acRef.current = new places.Autocomplete(inputRef.current, { fields: ["geometry"] });
    acRef.current.addListener("place_changed", () => {
      const loc = acRef.current!.getPlace()?.geometry?.location;
      if (loc) onSelect(loc.lat(), loc.lng());
    });
  }, [places, onSelect]);

  return (
    <input
      ref={inputRef}
      type="text"
      placeholder="Search address or landmark…"
      className="input text-sm"
    />
  );
}

export function LocationPicker({ lat, lng, onChange, onClear }: LocationPickerProps) {
  const pos: LatLng | null = lat !== null && lng !== null ? { lat, lng } : null;

  const handleMapClick = useCallback(
    (e: MapMouseEvent) => {
      if (e.detail.latLng) onChange(e.detail.latLng.lat, e.detail.latLng.lng);
    },
    [onChange],
  );

  const handleDragEnd = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) onChange(e.latLng.lat(), e.latLng.lng());
    },
    [onChange],
  );

  if (!API_KEY) {
    return (
      <div className="rounded-xl border-2 border-dashed border-black/10 p-6 text-center text-sm text-brand-400">
        Map unavailable — VITE_GOOGLE_MAPS_API_KEY not configured
      </div>
    );
  }

  return (
    <APIProvider apiKey={API_KEY}>
      <div className="space-y-2">
        <PlacesSearch onSelect={onChange} />
        <div className="rounded-xl overflow-hidden border border-black/[0.10]" style={{ height: 256 }}>
          <Map
            defaultCenter={pos ?? NAIROBI}
            defaultZoom={pos ? 15 : 12}
            mapId="DEMO_MAP_ID"
            gestureHandling="greedy"
            onClick={handleMapClick}
            style={{ width: "100%", height: "100%" }}
          >
            <MapPanner pos={pos} />
            {pos && (
              <AdvancedMarker position={pos} draggable onDragEnd={handleDragEnd} />
            )}
          </Map>
        </div>
        <div className="flex items-center justify-between">
          {pos ? (
            <span className="text-xs font-mono text-brand-600">
              {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
            </span>
          ) : (
            <span className="text-xs text-brand-400">
              Click the map or search above to pin the property location
            </span>
          )}
          {pos && (
            <button
              type="button"
              onClick={onClear}
              className="text-xs text-red-400 hover:text-red-600 font-medium"
            >
              Clear pin
            </button>
          )}
        </div>
      </div>
    </APIProvider>
  );
}
