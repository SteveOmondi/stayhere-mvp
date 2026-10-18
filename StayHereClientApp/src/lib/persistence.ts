/** Per-visitor, per-listing furniture layout persistence — a visitor's own rearrangement in the
 * 3D Live view is saved only in their browser (never sent to the backend), so it never affects
 * what other visitors or the owner see. Ported from the validated prototype's persistence.ts. */
import type { PlacedFurnitureItem } from "../types/furniture";

const KEY_PREFIX = "stayhere:layout:";
const DEBOUNCE_MS = 500;

const timers = new Map<string, number>();

export function loadLayout(listingId: string): PlacedFurnitureItem[] | null {
  try {
    const raw = localStorage.getItem(KEY_PREFIX + listingId);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as PlacedFurnitureItem[];
  } catch {
    return null;
  }
}

export function saveLayoutDebounced(listingId: string, items: PlacedFurnitureItem[]) {
  const existing = timers.get(listingId);
  if (existing) window.clearTimeout(existing);
  const handle = window.setTimeout(() => {
    localStorage.setItem(KEY_PREFIX + listingId, JSON.stringify(items));
    timers.delete(listingId);
  }, DEBOUNCE_MS);
  timers.set(listingId, handle);
}

export function clearLayout(listingId: string) {
  localStorage.removeItem(KEY_PREFIX + listingId);
}
