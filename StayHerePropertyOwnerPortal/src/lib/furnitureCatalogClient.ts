import { staticApi } from "./api";
import type { FurnitureCatalogItem } from "../types/furniture";

let cache: FurnitureCatalogItem[] | null = null;
let inflight: Promise<FurnitureCatalogItem[]> | null = null;

/** Fetches the furniture catalog once per session and caches it — call before mounting any 3D scene. */
export async function loadFurnitureCatalog(): Promise<FurnitureCatalogItem[]> {
  if (cache) return cache;
  if (!inflight) {
    inflight = staticApi
      .furnitureCatalog()
      .then((items) => {
        cache = items.map((i) => ({
          id: i.id,
          name: i.name,
          category: i.category as FurnitureCatalogItem["category"],
          footprint: i.footprint,
          height: i.height,
          color: i.color,
          icon: i.icon,
        }));
        return cache;
      })
      .finally(() => {
        inflight = null;
      });
  }
  return inflight;
}

export function getFurnitureCatalog(): FurnitureCatalogItem[] {
  if (!cache) throw new Error("Furniture catalog not loaded yet — call loadFurnitureCatalog() first.");
  return cache;
}

export function getCatalogItem(id: string): FurnitureCatalogItem {
  const item = getFurnitureCatalog().find((c) => c.id === id);
  if (!item) throw new Error(`Unknown furniture catalog id: ${id}`);
  return item;
}
