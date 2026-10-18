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
  /** Present only for items in the walkthrough's vendor showcase (display/affiliate only — no
   * cart/payment). Undefined on any field means this item has no vendor label in walk mode. */
  vendorName?: string;
  vendorLogoUrl?: string;
  price?: number;
  currency?: string;
  productUrl?: string;
  sku?: string;
}

export interface PlacedFurnitureItem {
  instanceId: string;
  catalogId: string;
  roomId: string;
  position: [number, number, number];
  rotationY: number;
  scale: number;
}
