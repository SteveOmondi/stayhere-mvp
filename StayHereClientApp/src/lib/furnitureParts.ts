import type { FurnitureCatalogItem } from "../types/furniture";

/** Data-only description of one primitive making up a furniture item's mesh - the same
 * description FurnitureMesh.tsx renders directly (one <mesh> per part) and InstancedFurniture.tsx
 * reads to build one InstancedMesh per (catalogId, partIndex) pair. Keeping this as data (not JSX)
 * is what makes instancing possible: every placed instance of a given catalogId has the exact same
 * parts (footprint/height/color come from the catalog item, not the placed instance - only
 * position/rotationY/scale vary per instance), so one InstancedMesh per part can serve every
 * placement of that catalog item. */
export interface FurniturePart {
  shape: "box" | "cylinder";
  /** boxGeometry [w,h,d] or cylinderGeometry [radiusTop,radiusBottom,height,radialSegments] */
  args: number[];
  position: [number, number, number];
  color: string;
  transparent?: boolean;
  opacity?: number;
}

export function getFurnitureParts(item: FurnitureCatalogItem): FurniturePart[] {
  const [w, d] = item.footprint;
  const h = item.height;
  const color = item.color;

  switch (item.id) {
    case "bed_double":
      return [
        { shape: "box", args: [w, h * 0.6, d], position: [0, h * 0.3, 0], color },
        { shape: "box", args: [w, h * 0.5, d * 0.14], position: [0, h * 0.75, -d * 0.42], color: "#8A6D4E" },
        { shape: "box", args: [w * 0.94, h * 0.15, d * 0.35], position: [0, h * 0.62, -d * 0.1], color: "#FFFFFF" },
      ];
    case "wardrobe":
      return [{ shape: "box", args: [w, h, d], position: [0, h / 2, 0], color }];
    case "sofa":
      return [
        { shape: "box", args: [w, h * 0.5, d], position: [0, h * 0.35, 0], color },
        { shape: "box", args: [w, h * 0.5, d * 0.3], position: [0, h * 0.75, -d * 0.35], color },
        { shape: "box", args: [w * 0.08, h * 0.3, d], position: [-w * 0.46, h * 0.55, 0], color },
        { shape: "box", args: [w * 0.08, h * 0.3, d], position: [w * 0.46, h * 0.55, 0], color },
      ];
    case "armchair":
      return [
        { shape: "box", args: [w, h * 0.5, d], position: [0, h * 0.35, 0], color },
        { shape: "box", args: [w, h * 0.5, d * 0.4], position: [0, h * 0.75, -d * 0.3], color },
      ];
    case "coffee_table":
    case "dining_table":
    case "dining_table_small":
      return [
        { shape: "box", args: [w, h * 0.08, d], position: [0, h * 0.92, 0], color },
        ...[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz]): FurniturePart => ({
          shape: "cylinder",
          args: [0.03, 0.03, h * 0.88, 8],
          position: [(sx * w) / 2.3, h * 0.44, (sz * d) / 2.3],
          color: "#3F3226",
        })),
      ];
    case "dining_chair":
      return [
        { shape: "box", args: [w, h * 0.08, d], position: [0, h * 0.45, 0], color },
        { shape: "box", args: [w, h * 0.55, d * 0.1], position: [0, h * 0.75, -d * 0.42], color },
      ];
    case "tv_unit":
      return [
        { shape: "box", args: [w, h * 0.8, d], position: [0, h * 0.4, 0], color },
        { shape: "box", args: [w * 0.7, 0.5, 0.04], position: [0, h + 0.35, d * 0.3], color: "#111827" },
      ];
    case "kitchen_counter":
      return [
        { shape: "box", args: [w, h, d], position: [0, h / 2, 0], color },
        { shape: "box", args: [w * 0.35, 0.05, d * 0.5], position: [0, h + 0.02, 0], color: "#64748B" },
      ];
    case "fridge":
      return [{ shape: "box", args: [w, h, d], position: [0, h / 2, 0], color }];
    case "stove":
      return [
        { shape: "box", args: [w, h, d], position: [0, h / 2, 0], color },
        ...[
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ].map(([sx, sz]): FurniturePart => ({
          shape: "cylinder",
          args: [0.08, 0.08, 0.02, 12],
          position: [(sx * w) / 4, h + 0.01, (sz * d) / 4],
          color: "#0F172A",
        })),
      ];
    case "toilet":
      return [
        { shape: "box", args: [w * 0.8, h, d * 0.6], position: [0, h * 0.5, d * 0.15], color },
        { shape: "box", args: [w * 0.7, h * 0.6, d * 0.3], position: [0, h * 1.4, -d * 0.15], color },
      ];
    case "bathroom_sink":
      return [
        { shape: "box", args: [w, h * 0.15, d], position: [0, h * 0.9, 0], color },
        { shape: "cylinder", args: [0.04, 0.05, h * 0.8, 8], position: [0, h * 0.4, 0], color: "#CBD5E1" },
      ];
    case "shower":
      return [
        { shape: "box", args: [w, 0.06, d], position: [0, 0.03, 0], color: "#94A3B8" },
        { shape: "box", args: [w, h, d], position: [0, h / 2, 0], color, transparent: true, opacity: 0.25 },
      ];
    default:
      return [{ shape: "box", args: [w, h, d], position: [0, h / 2, 0], color }];
  }
}
