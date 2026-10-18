import { create } from "zustand";
import type { PlacedFurnitureItem } from "../types/furniture";
import type { FloorPlanScene } from "../lib/floorPlanGeometry";
import { getCatalogItem } from "../lib/furnitureCatalogClient";
import { clampToRoomBounds } from "../lib/floorPlanGeometry";

export type ViewMode = "view" | "organize";

interface LayoutState {
  listing: FloorPlanScene | null;
  items: PlacedFurnitureItem[];
  selectedId: string | null;
  draggingId: string | null;
  mode: ViewMode;
  activeHotspotId: string | null;

  loadListing: (listing: FloorPlanScene) => void;
  setMode: (mode: ViewMode) => void;
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

function itemsFromDefaultLayout(listing: FloorPlanScene): PlacedFurnitureItem[] {
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

  loadListing: (listing) => {
    set({ listing, items: itemsFromDefaultLayout(listing), selectedId: null, mode: "view", activeHotspotId: null });
  },

  setMode: (mode) => set({ mode, selectedId: mode === "view" ? null : get().selectedId, draggingId: null }),

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
    set({ items: [...items, newItem], selectedId: newItem.instanceId });
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
  },

  rotateItem: (instanceId, deltaDeg) => {
    const { items } = get();
    set({ items: items.map((it) => (it.instanceId === instanceId ? { ...it, rotationY: (it.rotationY + deltaDeg) % 360 } : it)) });
  },

  deleteItem: (instanceId) => {
    const { items, selectedId } = get();
    set({ items: items.filter((it) => it.instanceId !== instanceId), selectedId: selectedId === instanceId ? null : selectedId });
  },

  resetLayout: () => {
    const { listing } = get();
    if (!listing) return;
    set({ items: itemsFromDefaultLayout(listing), selectedId: null });
  },

  setActiveHotspot: (id) => set({ activeHotspotId: id }),
}));
