/** Derives simple 2D (XZ-plane) collision boxes from the same resolved wall geometry RoomShell
 * renders, so a walking character collides with exactly what it sees. Doors are left OUT of the
 * collider list (the opening is walkable); windows are left IN (visually open above the sill, but
 * you can't walk out through a window wall any more than in a real building). */

import type { RoomPolygon, WallOpening } from "./floorPlanGeometry";
import { collectWallSegments, wallPieceTransform } from "./roomGeometry";

export interface WallCollider {
  /** world-space center, XZ meters */
  centerX: number;
  centerZ: number;
  /** piece's own length (world-space) */
  halfLength: number;
  halfThickness: number;
  /** radians, same convention as wallPieceTransform's angle */
  angle: number;
}

export function buildWallColliders(rooms: RoomPolygon[], openings: WallOpening[], thickness: number): WallCollider[] {
  const segments = collectWallSegments(rooms, openings);
  const colliders: WallCollider[] = [];

  for (const seg of segments) {
    for (const piece of seg.pieces) {
      if (piece.type === "door") continue;
      const { midX, midZ, length, angle } = wallPieceTransform(seg, piece);
      if (length <= 0) continue;
      colliders.push({
        centerX: midX,
        centerZ: midZ,
        halfLength: length / 2,
        halfThickness: thickness / 2,
        angle,
      });
    }
  }

  return colliders;
}

/**
 * Pushes a circular character (XZ-plane, `radius` meters) out of any wall collider it overlaps.
 * Closest-point-in-local-space projection per collider, a few iterations so corners (where two
 * wall pieces meet) resolve stably instead of the character getting shoved back and forth between
 * them. Returns a NEW [x, z] - never mutates the input.
 */
export function resolveWallCollisions(x: number, z: number, radius: number, colliders: WallCollider[]): [number, number] {
  let px = x;
  let pz = z;

  const ITERATIONS = 3;
  for (let iter = 0; iter < ITERATIONS; iter++) {
    for (const c of colliders) {
      const dx = px - c.centerX;
      const dz = pz - c.centerZ;
      const cos = Math.cos(c.angle);
      const sin = Math.sin(c.angle);
      // world -> wall-local (wall runs along local X)
      const localX = dx * cos + dz * sin;
      const localZ = -dx * sin + dz * cos;

      const closestX = Math.max(-c.halfLength, Math.min(c.halfLength, localX));
      const closestZ = Math.max(-c.halfThickness, Math.min(c.halfThickness, localZ));
      const diffX = localX - closestX;
      const diffZ = localZ - closestZ;
      const distSq = diffX * diffX + diffZ * diffZ;

      if (distSq >= radius * radius) continue;

      const dist = Math.sqrt(distSq);
      let pushLocalX: number;
      let pushLocalZ: number;
      if (dist > 1e-5) {
        pushLocalX = (diffX / dist) * (radius - dist);
        pushLocalZ = (diffZ / dist) * (radius - dist);
      } else {
        // Center sits exactly on the box edge/inside it - push out along the thinner axis
        // (thickness), since walls are always far longer than they are thick.
        pushLocalZ = (localZ >= 0 ? 1 : -1) * radius;
        pushLocalX = 0;
      }

      // wall-local -> world
      px += pushLocalX * cos - pushLocalZ * sin;
      pz += pushLocalX * sin + pushLocalZ * cos;
    }
  }

  return [px, pz];
}

/**
 * Nearest wall hit along a ray in the XZ plane, up to maxDist - used to pull the third-person
 * camera in when a wall would otherwise occlude it (a "spring arm"), reusing the same rotate-into
 * wall-local-space trick as resolveWallCollisions, just as a 2D slab (ray-vs-AABB) test instead of
 * a closest-point test. Returns null if nothing is hit within maxDist.
 */
export function raycastWallColliders(
  originX: number,
  originZ: number,
  dirX: number,
  dirZ: number,
  maxDist: number,
  colliders: WallCollider[],
): number | null {
  let nearest: number | null = null;

  for (const c of colliders) {
    const cos = Math.cos(c.angle);
    const sin = Math.sin(c.angle);
    const ox = (originX - c.centerX) * cos + (originZ - c.centerZ) * sin;
    const oz = -(originX - c.centerX) * sin + (originZ - c.centerZ) * cos;
    const dx = dirX * cos + dirZ * sin;
    const dz = -dirX * sin + dirZ * cos;

    let tMin = 0;
    let tMax = maxDist;

    for (const [o, d, half] of [
      [ox, dx, c.halfLength],
      [oz, dz, c.halfThickness],
    ] as const) {
      if (Math.abs(d) < 1e-8) {
        if (o < -half || o > half) { tMin = Infinity; break; }
        continue;
      }
      let t1 = (-half - o) / d;
      let t2 = (half - o) / d;
      if (t1 > t2) [t1, t2] = [t2, t1];
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) break;
    }

    if (tMin <= tMax && tMin >= 0 && tMin <= maxDist) {
      if (nearest === null || tMin < nearest) nearest = tMin;
    }
  }

  return nearest;
}
