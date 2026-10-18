import { useEffect, useState } from "react";
import type { Listing } from "../../lib/api";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import { loadFurnitureCatalog } from "../../lib/furnitureCatalogClient";
import { autoSeedFromRooms } from "../../lib/autoSeed";
import { useLayoutStore } from "../../store/layoutStore";
import { FloorPlanTabs } from "./FloorPlanTabs";

/** Builds the FloorPlanScene the 3D/2D renderers expect from a listing's raw floorPlan DTO,
 * falling back to auto-seeded hotspots/furniture for listings digitized before 3D support
 * existed (empty hotspots/allowedCatalogIds/defaultLayout). */
function buildScene(listing: Listing): FloorPlanScene | null {
  const fp = listing.floorPlan;
  if (!fp || fp.rooms.length === 0) return null;

  const rooms = fp.rooms;
  const openings = fp.openings ?? [];
  const needsSeed = !fp.hotspots?.length || !fp.defaultLayout?.length || !fp.allowedCatalogIds?.length;
  const seed = needsSeed ? autoSeedFromRooms(rooms) : null;

  return {
    id: listing.id,
    title: listing.title ?? "This listing",
    rooms,
    openings,
    hotspots: fp.hotspots?.length ? fp.hotspots : seed!.hotspots,
    allowedCatalogIds: fp.allowedCatalogIds?.length ? fp.allowedCatalogIds : seed!.allowedCatalogIds,
    defaultLayout: fp.defaultLayout?.length ? fp.defaultLayout : seed!.defaultLayout,
  };
}

/** Mounts the Floor Plan tab content once the furniture catalog is loaded. Renders nothing if
 * the listing has no floor plan — keeping the feature fully optional. */
export function FloorPlanSection({ listing }: { listing: Listing }) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const loadListing = useLayoutStore((s) => s.loadListing);

  useEffect(() => {
    if (!listing.floorPlan) return;
    let cancelled = false;
    loadFurnitureCatalog()
      .then(() => {
        if (cancelled) return;
        const scene = buildScene(listing);
        if (!scene) return;
        loadListing(scene);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  if (!listing.floorPlan) return null;

  const scene = buildScene(listing);
  if (!scene) return null;

  if (error) return <p className="text-sm text-brand-muted font-sans">Couldn't load the floor plan viewer right now.</p>;
  if (!ready) return <p className="text-sm text-brand-muted font-sans">Loading floor plan…</p>;

  return <FloorPlanTabs listing={scene} />;
}
