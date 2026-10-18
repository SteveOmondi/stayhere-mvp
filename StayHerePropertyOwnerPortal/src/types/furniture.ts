export type FurnitureCategory = "bedroom" | "living" | "dining" | "kitchen" | "bathroom";

export interface FurnitureCatalogItem {
  id: string;
  name: string;
  category: FurnitureCategory;
  /** meters, footprint on the floor for bounds/snap checks */
  footprint: [number, number];
  /** rough height in meters, used for procedural mesh + camera framing */
  height: number;
  /** hex color used for the procedural mesh */
  color: string;
  icon: string;
}

export interface PlacedFurnitureItem {
  instanceId: string;
  catalogId: string;
  roomId: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}
