import { create } from "zustand";
import type { PlacedFurnitureItem } from "../types/furniture";
import type { FloorPlanScene } from "../lib/floorPlanGeometry";
import { getCatalogItem } from "../lib/furnitureCatalogClient";
import { clampToRoomBounds } from "../lib/floorPlanGeometry";
import { loadLayout, saveLayoutDebounced } from "../lib/persistence";

export type ViewMode = "view" | "organize" | "walk";

interface LayoutState {
  listing: FloorPlanScene | null;
  items: PlacedFurnitureItem[];
  selectedId: string | null;
  draggingId: string | null;
  mode: ViewMode;
  activeHotspotId: string | null;
  characterId: string;
  firstPerson: boolean;
  /** Walk mode's "organizer" sub-mode: lets the character roam AND drag furniture at the same
   * time, instead of the separate top-down organize mode. Independent of `mode` itself so toggling
   * it doesn't tear down/remount the walk camera or character. */
  walkRearranging: boolean;
  /** Room ids the character has physically walked into this walkthrough session - reset each time
   * walk mode is freshly (re-)entered, so "rooms covered" always reflects the current tour. */
  visitedRoomIds: string[];

  loadListing: (listing: FloorPlanScene) => void;
  setMode: (mode: ViewMode) => void;
  setCharacterId: (id: string) => void;
  setFirstPerson: (on: boolean) => void;
  setWalkRearranging: (on: boolean) => void;
  markRoomVisited: (roomId: string) => void;
  selectItem: (instanceId: string | null) => void;
  startDrag: (instanceId: string) => void;
  endDrag: () => void;
  addItem: (catalogId: string, roomId: string, position: [number, number, number]) => void;
  moveItem: (instanceId: string, position: [number, number, number]) => void;
  rotateItem: (instanceId: string, deltaDeg: number) => void;
  deleteItem: (instanceId: string) => void;
  resetLayout: () => void;
  setActiveHotspot: (id: string | null) => void;
}

let instanceCounter = 0;
function nextInstanceId() {
  instanceCounter += 1;
  return `item-${instanceCounter}-${Math.floor(performance.now())}`;
}

function defaultItemsFor(listing: FloorPlanScene): PlacedFurnitureItem[] {
  return listing.defaultLayout.map((d) => ({
    instanceId: nextInstanceId(),
    catalogId: d.catalogId,
    roomId: d.roomId,
    position: d.position,
    rotationY: d.rotationY,
    scale: 1,
  }));
}

export const useLayoutStore = create<LayoutState>((set, get) => ({
  listing: null,
  items: [],
  selectedId: null,
  draggingId: null,
  mode: "view",
  activeHotspotId: null,
  // "soldier" (verified: has real embedded diffuse+normal map textures, unlike "xbot" which is a
  // flat-colored untextured mannequin) is the most visually detailed of the real rigged characters
  // available - matters more for "looks realistic" than Xbot's cleaner human proportions but flat
  // shading. Thematically it's a tactical/sci-fi character, not a plain civilian - the honest
  // tradeoff of what's actually available without a paid/licensed asset pipeline.
  characterId: "soldier",
  firstPerson: false,
  walkRearranging: false,
  visitedRoomIds: [],

  loadListing: (listing) => {
    const saved = loadLayout(listing.id);
    const items = saved ?? defaultItemsFor(listing);
    set({ listing, items, selectedId: null, mode: "view", activeHotspotId: null });
  },

  setMode: (mode) => {
    const prevMode = get().mode;
    set({
      mode,
      selectedId: mode === "organize" ? get().selectedId : null,
      draggingId: null,
      walkRearranging: mode === "walk" ? get().walkRearranging : false,
      // Fresh entry into walk mode starts a new tour - re-entering later shouldn't carry over
      // "rooms covered" from a previous session, so the checklist always matches this walkthrough.
      visitedRoomIds: mode === "walk" && prevMode !== "walk" ? [] : get().visitedRoomIds,
    });
  },

  setCharacterId: (characterId) => set({ characterId }),

  setFirstPerson: (firstPerson) => set({ firstPerson }),

  setWalkRearranging: (walkRearranging) => set({ walkRearranging, selectedId: null, draggingId: null }),

  markRoomVisited: (roomId) =>
    set((state) => (state.visitedRoomIds.includes(roomId) ? state : { visitedRoomIds: [...state.visitedRoomIds, roomId] })),

  selectItem: (instanceId) => set({ selectedId: instanceId }),

  startDrag: (instanceId) => set({ draggingId: instanceId, selectedId: instanceId }),

  endDrag: () => set({ draggingId: null }),

  addItem: (catalogId, roomId, position) => {
    const { listing, items } = get();
    if (!listing) return;
    const catalogItem = getCatalogItem(catalogId);
    const room = listing.rooms.find((r) => r.id === roomId);
    const clamped = room ? clampToRoomBounds([position[0], position[2]], room.points, catalogItem.footprint) : [position[0], position[2]];
    const newItem: PlacedFurnitureItem = {
      instanceId: nextInstanceId(),
      catalogId,
      roomId,
      position: [clamped[0], 0, clamped[1]],
      rotationY: 0,
      scale: 1,
    };
    const next = [...items, newItem];
    set({ items: next, selectedId: newItem.instanceId });
    saveLayoutDebounced(listing.id, next);
  },

  moveItem: (instanceId, position) => {
    const { listing, items } = get();
    if (!listing) return;
    const next = items.map((it) => {
      if (it.instanceId !== instanceId) return it;
      const catalogItem = getCatalogItem(it.catalogId);
      const room = listing.rooms.find((r) => r.id === it.roomId);
      const clamped = room
        ? clampToRoomBounds([position[0], position[2]], room.points, catalogItem.footprint)
        : [position[0], position[2]];
      return { ...it, position: [clamped[0], 0, clamped[1]] as [number, number, number] };
    });
    set({ items: next });
    saveLayoutDebounced(listing.id, next);
  },

  rotateItem: (instanceId, deltaDeg) => {
    const { listing, items } = get();
    if (!listing) return;
    const next = items.map((it) => (it.instanceId === instanceId ? { ...it, rotationY: (it.rotationY + deltaDeg) % 360 } : it));
    set({ items: next });
    saveLayoutDebounced(listing.id, next);
  },

  deleteItem: (instanceId) => {
    const { listing, items, selectedId } = get();
    if (!listing) return;
    const next = items.filter((it) => it.instanceId !== instanceId);
    set({ items: next, selectedId: selectedId === instanceId ? null : selectedId });
    saveLayoutDebounced(listing.id, next);
  },

  resetLayout: () => {
    const { listing } = get();
    if (!listing) return;
    const items = defaultItemsFor(listing);
    set({ items, selectedId: null });
    saveLayoutDebounced(listing.id, items);
  },

  setActiveHotspot: (id) => set({ activeHotspotId: id }),
}));
