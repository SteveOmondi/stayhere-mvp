import type { Listing } from "./api";

/** Normalise location: the API sometimes returns `location` as a nested object. */
export type LocationFields = {
  country?: string;
  county?: string;
  city?: string;
  suburb?: string;
  street?: string;
  latitude?: number;
  longitude?: number;
};

export function resolveLocation(l: Listing): LocationFields {
  const nested = (l.location && typeof l.location === "object") ? l.location as LocationFields : {};
  return {
    country:   (l.country   as string | undefined) ?? nested.country,
    county:    (l.county    as string | undefined) ?? nested.county,
    city:      (l.city      as string | undefined) ?? nested.city,
    suburb:    (l.suburb    as string | undefined) ?? nested.suburb,
    street:    (l.street    as string | undefined) ?? nested.street,
    latitude:  (l.latitude  as number | undefined) ?? nested.latitude,
    longitude: (l.longitude as number | undefined) ?? nested.longitude,
  };
}

/** Fallback Unsplash real-estate photos used when a listing has no image. */
export const FALLBACK_IMAGES = [
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=900&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80",
  "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=900&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80",
];

/** Deterministic fallback image based on a listing id (stable per listing). */
export function fallbackImage(seed?: string): string {
  if (!seed) return FALLBACK_IMAGES[0];
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return FALLBACK_IMAGES[Math.abs(h) % FALLBACK_IMAGES.length];
}

/** Resolve the primary display image for a listing, falling back gracefully. */
export function primaryImage(l: Listing): string {
  if (l.primaryImageUrl && l.primaryImageUrl.trim()) return l.primaryImageUrl;
  if (l.images && l.images.length && l.images[0]) return l.images[0];
  return fallbackImage(l.id);
}

/** Full ordered image list for a listing, with a fallback when empty. */
export function listingImages(l: Listing): string[] {
  const imgs: string[] = [];
  if (l.primaryImageUrl && l.primaryImageUrl.trim()) imgs.push(l.primaryImageUrl);
  if (l.images) for (const i of l.images) if (i && !imgs.includes(i)) imgs.push(i);
  return imgs.length ? imgs : [fallbackImage(l.id)];
}

export function listingPrice(l: Listing): number {
  return Number(l.rentPrice ?? l.price ?? 0);
}

export function isRent(l: Listing): boolean {
  const t = (l.listingType ?? "").toLowerCase();
  return t.includes("rent") || (!t.includes("sale") && (l.rentPrice ?? 0) > 0);
}

/** Format a number as KES currency, e.g. 45000 → "KES 45,000". */
export function formatKes(amount?: number): string {
  const n = Number(amount ?? 0);
  return "KES " + n.toLocaleString("en-KE", { maximumFractionDigits: 0 });
}

export function listingLocation(l: Listing): string {
  const loc = resolveLocation(l);
  return (
    [loc.suburb, loc.city].filter(Boolean).join(", ") ||
    [loc.county, loc.country].filter(Boolean).join(", ") ||
    "Kenya"
  );
}

export function listingTitle(l: Listing): string {
  const loc = resolveLocation(l);
  return (
    (l.title as string | undefined) ||
    [l.propertyType, l.bedrooms ? `${l.bedrooms}BR` : "", loc.suburb || loc.city]
      .filter(Boolean)
      .join(" · ") ||
    "Property Listing"
  );
}
