import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Listing } from "../lib/api";
import { formatKes, listingPrice, listingTitle, resolveLocation } from "../lib/format";

type MappableListing = { listing: Listing; lat: number; lng: number };

function markerIcon(priceLabel: string, highlighted: boolean) {
  const html = `
    <div class="map-price-pin ${highlighted ? "map-price-pin-active" : ""}">
      <span class="badge-gold">${priceLabel}</span>
    </div>
  `;
  return L.divIcon({
    html,
    className: "map-price-pin-wrapper",
    iconSize: undefined,
    iconAnchor: [0, 0],
  });
}

/** Keeps the map's view fit to the available markers whenever the listing set changes. */
function FitBounds({ points }: { points: MappableListing[] }) {
  const map = useMap();
  useMemo(() => {
    if (!points.length) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [48, 48] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points.map((p) => p.lat + "," + p.lng).join("|")]);
  return null;
}

export function ListingsMap({
  listings,
  hoveredListingId,
  onHoverListing,
  onSelectListing,
}: {
  listings: Listing[];
  hoveredListingId: string | null;
  onHoverListing: (id: string | null) => void;
  onSelectListing: (id: string) => void;
}) {
  const points: MappableListing[] = useMemo(() => {
    const out: MappableListing[] = [];
    for (const l of listings) {
      const loc = resolveLocation(l);
      const lat = loc.latitude;
      const lng = loc.longitude;
      if (typeof lat === "number" && typeof lng === "number" && !Number.isNaN(lat) && !Number.isNaN(lng)) {
        out.push({ listing: l, lat, lng });
      }
    }
    return out;
  }, [listings]);

  const defaultCenter: [number, number] = points.length
    ? [points[0].lat, points[0].lng]
    : [-1.286389, 36.817223]; // Nairobi fallback

  return (
    <div className="h-full w-full overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom
        style={{ height: "100%", width: "100%", background: "#0a0f1e" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitBounds points={points} />
        {points.map(({ listing: l, lat, lng }) => (
          <Marker
            key={l.id}
            position={[lat, lng]}
            icon={markerIcon(formatKes(listingPrice(l)), hoveredListingId === l.id)}
            eventHandlers={{
              mouseover: () => onHoverListing(l.id),
              mouseout: () => onHoverListing(null),
              click: () => onSelectListing(l.id),
            }}
          >
            <Popup>
              <div className="text-xs font-medium">{listingTitle(l)}</div>
              <div className="text-xs">{formatKes(listingPrice(l))}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
