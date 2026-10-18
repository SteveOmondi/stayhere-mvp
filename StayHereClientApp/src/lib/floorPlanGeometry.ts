/**
 * Floor-plan geometry helpers — ported from the validated prototype
 * (d:/Projects/PropertyModelsSimulation, src/lib/floorplanGeometry.ts) and kept in sync with
 * the identical file in StayHerePropertyOwnerPortal, since both render the same backend-issued
 * ListingFloorPlanDto shape.
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
  /** the listing's own id — used to key this visitor's local furniture-layout persistence */
  id: string;
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

/** Shoelace-formula polygon area, in the same units as the input points (m -> sqm) */
export function polygonArea(points: [number, number][]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, z1] = points[i];
    const [x2, z2] = points[(i + 1) % points.length];
    sum += x1 * z2 - x2 * z1;
  }
  return Math.abs(sum) / 2;
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

// Same tolerance class as roomGeometry.ts's LINE_OFFSET_TOLERANCE - an opening's stored endpoints
// drifting a few cm from the room polygon's current edge (rounding, or a room-shape correction
// applied after the opening was recorded) must not silently disqualify it as a perimeter/entrance
// door candidate, the same fragility that was making whole walls render solid with no door gap.
const EDGE_MATCH_TOLERANCE = 0.08;

function edgesMatch(a1: [number, number], a2: [number, number], b1: [number, number], b2: [number, number]): boolean {
  const close = (p: [number, number], q: [number, number]) =>
    Math.abs(p[0] - q[0]) < EDGE_MATCH_TOLERANCE && Math.abs(p[1] - q[1]) < EDGE_MATCH_TOLERANCE;
  return (close(a1, b1) && close(a2, b2)) || (close(a1, b2) && close(a2, b1));
}

/** Room labels/ids commonly adjacent to a building's main entrance - used only as a fallback when
 * no door can be geometrically identified as the entrance (see findEntryPoint), since the
 * AI-digitized floor plan data has no explicit "this is the front door" tag of its own; this is
 * purely a geometric + naming inference. */
const ENTRY_ADJACENT_ROOM_HINTS = ["entry", "foyer", "hall", "corridor", "living", "lounge", "sitting", "main"];

/** Finds the walkthrough's starting point: the building's main entrance, identified as the widest
 * door opening that sits on a room's PERIMETER edge (shared by only one room) rather than an
 * interior edge shared between two rooms - interior doors connect rooms to each other, while an
 * exterior/entrance door's wall segment belongs to exactly one room. Returns a spawn position
 * pushed slightly inward from the doorway (toward that room's centroid) plus a facing angle aimed
 * into the room, so the walkthrough always starts the same, deliberate way: stepping through the
 * front door, not materializing in the middle of a random room.
 *
 * If no door can be geometrically identified as a perimeter/entrance door (the floor plan's
 * digitization may not have captured one), falls back to the centroid of whichever room's label
 * best matches a common entry-adjacent room name (living room, hall, foyer, ...) instead of an
 * arbitrary first room - still a deliberate, explainable starting point rather than a random one. */
export function findEntryPoint(
  rooms: RoomPolygon[],
  openings: WallOpening[],
): { position: [number, number]; facingYaw: number; roomId: string } | null {
  const doors = openings.filter((o) => o.type === "door");
  let best: { opening: WallOpening; room: RoomPolygon } | null = null;

  for (const door of doors) {
    const owningRooms = rooms.filter((room) => {
      const pts = room.points;
      for (let i = 0; i < pts.length; i++) {
        const a = pts[i];
        const b = pts[(i + 1) % pts.length];
        if (edgesMatch(a, b, door.from, door.to)) return true;
      }
      return false;
    });
    if (owningRooms.length !== 1) continue; // interior door (or unmatched) - not an entrance candidate
    if (!best || door.widthMeters > best.opening.widthMeters) {
      best = { opening: door, room: owningRooms[0] };
    }
  }

  if (!best) {
    if (rooms.length === 0) return null;
    const hintMatch = rooms.find((room) => {
      const name = `${room.id} ${room.label}`.toLowerCase();
      return ENTRY_ADJACENT_ROOM_HINTS.some((hint) => name.includes(hint));
    });
    const fallbackRoom = hintMatch ?? rooms[0];
    const [cx, cz] = polygonCentroid(fallbackRoom.points);
    return { position: [cx, cz], facingYaw: 0, roomId: fallbackRoom.id };
  }

  const { opening, room } = best;
  const midX = (opening.from[0] + opening.to[0]) / 2;
  const midZ = (opening.from[1] + opening.to[1]) / 2;
  const [cx, cz] = polygonCentroid(room.points);
  const dx = cx - midX;
  const dz = cz - midZ;
  const dist = Math.hypot(dx, dz) || 1;
  const INSET_METERS = 0.7;
  const position: [number, number] = [midX + (dx / dist) * INSET_METERS, midZ + (dz / dist) * INSET_METERS];
  const facingYaw = Math.atan2(dx, dz); // same atan2(x,z) convention as camera azimuth/character yaw
  return { position, facingYaw, roomId: room.id };
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
  const height = Math.max(bounds.width, bounds.depth, 3) * 0.7 + WALL_HEIGHT * 1.4;
  return {
    cameraPos: [cx - offsetX, height, cz - offsetZ],
    target: [cx, 0.4, cz],
  };
}
