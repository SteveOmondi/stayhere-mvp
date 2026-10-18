import { polygonCentroid, clampToRoomBounds, type RoomPolygon, type Hotspot } from "./floorPlanGeometry";
import { getCatalogItem, getFurnitureCatalog } from "./furnitureCatalogClient";

export interface SeededDefaultItem {
  catalogId: string;
  roomId: string;
  position: [number, number, number];
  rotationY: number;
}

/** Room label -> starter furniture, matched by keyword (case-insensitive). */
const CATEGORY_RULES: { test: RegExp; catalogIds: string[] }[] = [
  { test: /bath|shower|toilet|\bwc\b/i, catalogIds: ["toilet", "bathroom_sink", "shower"] },
  { test: /kitchen/i, catalogIds: ["kitchen_counter", "fridge", "stove"] },
  { test: /dining/i, catalogIds: ["dining_table", "dining_chair", "dining_chair"] },
  { test: /living|lounge|reception/i, catalogIds: ["sofa", "coffee_table", "tv_unit"] },
  { test: /bed/i, catalogIds: ["bed_double", "wardrobe"] },
  { test: /wardrobe|closet/i, catalogIds: ["wardrobe"] },
];

/** Small deterministic offsets (meters) so multiple seeded items in one room don't stack on top of each other. */
const OFFSETS: [number, number][] = [
  [0, 0],
  [-0.7, -0.4],
  [0.7, -0.4],
  [0, 0.7],
  [-0.7, 0.4],
  [0.7, 0.4],
];

export interface AutoSeedResult {
  hotspots: Hotspot[];
  allowedCatalogIds: string[];
  defaultLayout: SeededDefaultItem[];
}

/** Derives hotspots (one per room, at its centroid) and a starter furniture layout from traced room polygons.
 * Requires `loadFurnitureCatalog()` to have already resolved. */
export function autoSeedFromRooms(rooms: RoomPolygon[]): AutoSeedResult {
  const hotspots: Hotspot[] = rooms.map((room, i) => ({
    id: `hs-${room.id}`,
    roomId: room.id,
    label: room.label,
    order: i + 1,
  }));

  const defaultLayout: SeededDefaultItem[] = [];

  rooms.forEach((room) => {
    const rule = CATEGORY_RULES.find((r) => r.test.test(room.label));
    if (!rule) return;
    const [cx, cz] = polygonCentroid(room.points);
    rule.catalogIds.forEach((catalogId, idx) => {
      const catalogItem = getCatalogItem(catalogId);
      const offset = OFFSETS[idx % OFFSETS.length];
      const clamped = clampToRoomBounds([cx + offset[0], cz + offset[1]], room.points, catalogItem.footprint);
      defaultLayout.push({ catalogId, roomId: room.id, position: [clamped[0], 0, clamped[1]], rotationY: 0 });
    });
  });

  // Owners can add anything sensible during organize mode, not just the auto-detected categories.
  const allowedCatalogIds = getFurnitureCatalog().map((c) => c.id);

  return { hotspots, allowedCatalogIds, defaultLayout };
}
