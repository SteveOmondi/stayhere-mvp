/**
 * Floor-plan geometry helpers — ported from a proven prototype
 * (d:/Projects/PropertyModelsSimulation, src/lib/floorplanGeometry.ts, scaleEstimate.ts,
 * wallOpeningPlacement.ts) that spent real iteration getting AI-assisted digitization to work.
 * Kept as one file here since this portal doesn't have that prototype's broader lib/ ecosystem.
 */

import { WALL_HEIGHT } from "./roomGeometry";

export interface RoomPolygon {
  id: string;
  label: string;
  /** [x, z] in meters */
  points: [number, number][];
}

export interface WallOpening {
  id: string;
  from: [number, number];
  to: [number, number];
  /** 0-1 fraction from `from` to `to` where the opening is centered */
  position: number;
  widthMeters: number;
  type: "door" | "window";
}

/** A named waypoint in the 3D scene, used for room-to-room navigation ("fly to Bedroom"). */
export interface Hotspot {
  id: string;
  roomId: string;
  label: string;
  order: number;
}

/** Minimal shape the 3D/2D floor-plan renderers need — narrower than a full Listing. */
export interface FloorPlanScene {
  title: string;
  rooms: RoomPolygon[];
  openings: WallOpening[];
  hotspots: Hotspot[];
  allowedCatalogIds: string[];
  defaultLayout: {
    catalogId: string;
    roomId: string;
    position: [number, number, number];
    rotationY: number;
  }[];
}

/** pixels per meter for the 2D SVG render */
export const PX_PER_METER = 40;

export function roomBounds(rooms: RoomPolygon[]) {
  let minX = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxZ = -Infinity;
  for (const room of rooms) {
    for (const [x, z] of room.points) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minZ = Math.min(minZ, z);
      maxZ = Math.max(maxZ, z);
    }
  }
  return { minX, minZ, maxX, maxZ, width: maxX - minX, depth: maxZ - minZ };
}

/** SVG path `points` attribute string for a room polygon, offset+scaled into pixel space */
export function polygonToSvgPoints(
  points: [number, number][],
  offsetX: number,
  offsetZ: number,
  pxPerMeter = PX_PER_METER,
): string {
  return points.map(([x, z]) => `${(x - offsetX) * pxPerMeter},${(z - offsetZ) * pxPerMeter}`).join(" ");
}

export function polygonCentroid(points: [number, number][]): [number, number] {
  const n = points.length;
  const sum = points.reduce((acc, [x, z]) => [acc[0] + x, acc[1] + z] as [number, number], [0, 0] as [number, number]);
  return [sum[0] / n, sum[1] / n];
}

/** Ray-casting point-in-polygon test, points in [x,z] meters */
export function pointInPolygon(point: [number, number], polygon: [number, number][]): boolean {
  const [px, pz] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    const intersects = zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** Clamp a point to stay within a polygon's bounding box, inset by half-footprint on each axis */
export function clampToRoomBounds(
  point: [number, number],
  polygon: [number, number][],
  footprint: [number, number],
): [number, number] {
  const xs = polygon.map((p) => p[0]);
  const zs = polygon.map((p) => p[1]);
  const minX = Math.min(...xs) + footprint[0] / 2;
  const maxX = Math.max(...xs) - footprint[0] / 2;
  const minZ = Math.min(...zs) + footprint[1] / 2;
  const maxZ = Math.max(...zs) - footprint[1] / 2;
  return [
    Math.min(Math.max(point[0], minX), Math.max(minX, maxX)),
    Math.min(Math.max(point[1], minZ), Math.max(minZ, maxZ)),
  ];
}

/**
 * Camera position + look-at target for "flying into" a room, derived purely from its polygon so
 * it always lands inside the room. Deliberately NOT placed exactly at the centroid — the room's
 * hotspot label anchors there too, and a near-zero camera-to-label distance blows up
 * distance-based Html scaling, rendering the label pill gigantic.
 */
export function roomCameraView(points: [number, number][]): {
  cameraPos: [number, number, number];
  target: [number, number, number];
} {
  const [cx, cz] = polygonCentroid(points);
  const [px, pz] = points[0];
  const dx = px - cx;
  const dz = pz - cz;
  const dist = Math.hypot(dx, dz) || 1;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const camInset = dist * 0.55;
  return {
    cameraPos: [cx + dirX * camInset, 1.6, cz + dirZ * camInset],
    target: [cx - dirX * 0.3, 1.1, cz - dirZ * 0.3],
  };
}

/**
 * Overview camera position + look-at target that frames an entire floor plan, derived from its
 * room bounds. Uses each axis's own half-extent (plus a fixed clearance buffer) rather than a
 * single shared "span" scalar, which would put the camera almost on top of the walls on the
 * short axis of a small or elongated single room.
 */
export function overviewCameraView(rooms: RoomPolygon[]): {
  cameraPos: [number, number, number];
  target: [number, number, number];
} {
  const bounds = roomBounds(rooms);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const CLEARANCE = 2.5;
  const offsetX = bounds.width / 2 + CLEARANCE;
  const offsetZ = bounds.depth / 2 + CLEARANCE;
  // Walls are opaque boxes with no openings — from OUTSIDE the room, the camera must clear
  // WALL_HEIGHT by a generous margin to look down and OVER them into the interior.
  const height = Math.max(bounds.width, bounds.depth, 3) * 0.7 + WALL_HEIGHT * 1.4;
  return {
    cameraPos: [cx - offsetX, height, cz - offsetZ],
    target: [cx, 0.4, cz],
  };
}

/** Shoelace-formula polygon area, in the same units as the input points (m -> sqm). */
export function polygonArea(points: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[(i + 1) % points.length];
    sum += x1 * z2 - x2 * z1;
  }
  return Math.abs(sum) / 2;
}

export interface EdgeCandidate {
  roomId: string;
  edgeIndex: number;
  from: [number, number];
  to: [number, number];
  /** 0-1 projection of the point onto the edge, from `from` to `to` */
  position: number;
  distanceMeters: number;
}

/**
 * Finds the closest point on any room edge (in meters) — used to snap an AI-detected
 * door/window point onto a traced wall. No distance-rejection threshold: a slightly-off
 * placement beats silently dropping a real opening because the AI's room polygon and its
 * opening point didn't perfectly agree (both come from the same approximate vision read).
 */
export function findNearestEdge(rooms: RoomPolygon[], point: [number, number]): EdgeCandidate | null {
  let best: EdgeCandidate | null = null;
  for (const room of rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const from = pts[i];
      const to = pts[(i + 1) % pts.length];
      const dx = to[0] - from[0];
      const dz = to[1] - from[1];
      const lenSq = dx * dx + dz * dz;
      if (lenSq === 0) continue;
      let t = ((point[0] - from[0]) * dx + (point[1] - from[1]) * dz) / lenSq;
      t = Math.max(0, Math.min(1, t));
      const projX = from[0] + t * dx;
      const projZ = from[1] + t * dz;
      const distanceMeters = Math.hypot(point[0] - projX, point[1] - projZ);
      if (!best || distanceMeters < best.distanceMeters) {
        best = { roomId: room.id, edgeIndex: i, from, to, position: t, distanceMeters };
      }
    }
  }
  return best;
}

/** Parses a printed size string like "1050 Sq Feet - 2 Bedroom 2 Bath" or "98 sqm" into square meters. */
export function parseStatedSizeToSqm(text?: string): number | null {
  if (!text) return null;
  const match = text.match(
    /([\d,]+(?:\.\d+)?)\s*(sq\.?\s?f(?:ee)?t|sqft|square\s*feet|sq\.?\s?m(?:eters?|etres?)?|sqm|square\s*met(?:er|re)s?)/i,
  );
  if (!match) return null;
  const value = parseFloat(match[1].replace(/,/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  const isFeet = match[2].toLowerCase().includes("f");
  return isFeet ? value * 0.092903 : value;
}

export type ScaleSource = "stated-size" | "ai-estimate" | "fallback";

/**
 * Estimates meters-per-pixel with no manual calibration step, preferring (in order):
 * 1. The listing's own known stated size (SizeSqft -> sqm) matched against the AI-traced
 *    rooms' pixel area — the most reliable ground truth, since it's real production data.
 * 2. Printed size text on the plan itself, matched the same way.
 * 3. The AI's own eyeballed real-world width, based on standard architectural reference sizes.
 * 4. A generic fallback assuming a typical apartment-scale floor plan.
 */
export function estimateMetersPerPixel(params: {
  imageWidthPx: number;
  imageHeightPx: number;
  roomsFraction: { points: [number, number][] }[];
  statedSizeSqm: number | null;
  estimatedTotalWidthMeters?: number;
}): { metersPerPixel: number; source: ScaleSource } {
  const { imageWidthPx, imageHeightPx, roomsFraction, statedSizeSqm, estimatedTotalWidthMeters } = params;

  if (statedSizeSqm && roomsFraction.length > 0) {
    const fractionalArea = roomsFraction.reduce((sum, r) => sum + polygonArea(r.points), 0);
    const pixelArea = fractionalArea * imageWidthPx * imageHeightPx;
    if (pixelArea > 0) {
      return { metersPerPixel: Math.sqrt(statedSizeSqm / pixelArea), source: "stated-size" };
    }
  }

  if (estimatedTotalWidthMeters && estimatedTotalWidthMeters > 0) {
    return { metersPerPixel: estimatedTotalWidthMeters / imageWidthPx, source: "ai-estimate" };
  }

  const longerSidePx = Math.max(imageWidthPx, imageHeightPx);
  return { metersPerPixel: 10 / longerSidePx, source: "fallback" };
}

/** sqft -> sqm, for feeding a listing's own SizeSqft into estimateMetersPerPixel's statedSizeSqm. */
export function sqftToSqm(sqft: number): number {
  return sqft * 0.092903;
}
