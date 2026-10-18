/** Wall/floor mesh geometry helpers — ported from the validated prototype
 * (d:/Projects/PropertyModelsSimulation/src/lib/roomGeometry.ts). */

import * as THREE from "three";
import type { RoomPolygon, WallOpening } from "./floorPlanGeometry";

export const WALL_HEIGHT = 2.6;
export const WALL_THICKNESS = 0.12;
export const DOOR_HEIGHT = 2.05;
export const WINDOW_SILL_HEIGHT = 0.9;
export const WINDOW_HEAD_HEIGHT = 2.1;

/**
 * Builds a flat XY shape for use with ShapeGeometry, rotated -90deg on X to lie
 * on the XZ floor plane. The Y coordinate is negated so that, after rotation,
 * world Z matches the room polygon's Z (and the face normal ends up pointing +Y).
 */
export function roomFloorShape(room: RoomPolygon): THREE.Shape {
  const shape = new THREE.Shape();
  room.points.forEach(([x, z], i) => {
    if (i === 0) shape.moveTo(x, -z);
    else shape.lineTo(x, -z);
  });
  shape.closePath();
  return shape;
}

interface WallSegment {
  key: string;
  from: [number, number];
  to: [number, number];
}

export interface WallPiece {
  /** 0-1 fraction along this segment's own from->to direction */
  start: number;
  end: number;
  type: "solid" | "door" | "window";
}

export interface ResolvedWallSegment extends WallSegment {
  pieces: WallPiece[];
}

function edgeKey(a: [number, number], b: [number, number]): string {
  const ra = `${a[0].toFixed(2)},${a[1].toFixed(2)}`;
  const rb = `${b[0].toFixed(2)},${b[1].toFixed(2)}`;
  return ra < rb ? `${ra}|${rb}` : `${rb}|${ra}`;
}

function pointsMatch(a: [number, number], b: [number, number]): boolean {
  return Math.abs(a[0] - b[0]) < 0.01 && Math.abs(a[1] - b[1]) < 0.01;
}

function buildWallPieces(seg: WallSegment, openings: WallOpening[]): WallPiece[] {
  const length = Math.hypot(seg.to[0] - seg.from[0], seg.to[1] - seg.from[1]);
  const matching = openings
    .filter((op) => edgeKey(op.from, op.to) === seg.key)
    .map((op) => {
      // openings may have been authored walking the edge in either direction relative
      // to this de-duplicated segment's own from->to order — flip position if reversed.
      const sameOrder = pointsMatch(op.from, seg.from);
      const position = sameOrder ? op.position : 1 - op.position;
      return { position, widthMeters: op.widthMeters, type: op.type };
    })
    .sort((a, b) => a.position - b.position);

  if (matching.length === 0 || length <= 0) return [{ start: 0, end: 1, type: "solid" }];

  const pieces: WallPiece[] = [];
  let cursor = 0;
  for (const op of matching) {
    const halfFrac = op.widthMeters / length / 2;
    const opStart = Math.max(cursor, Math.min(1, op.position - halfFrac));
    const opEnd = Math.max(cursor, Math.min(1, op.position + halfFrac));
    if (opStart > cursor) pieces.push({ start: cursor, end: opStart, type: "solid" });
    if (opEnd > opStart) pieces.push({ start: opStart, end: opEnd, type: op.type });
    cursor = Math.max(cursor, opEnd);
  }
  if (cursor < 1) pieces.push({ start: cursor, end: 1, type: "solid" });
  return pieces;
}

interface LineGroup {
  ref: [number, number];
  dir: [number, number];
  intervals: { start: number; end: number }[];
}

/**
 * Canonical key + unit direction for the infinite line through `from`->`to`, so that any two
 * edges lying on the same line (regardless of which direction they were walked in) group
 * together. Used to detect e.g. a big room's single long edge that several smaller rooms'
 * shorter edges are collectively adjacent to (a shared partition wall that isn't a single
 * matching edge on either side).
 */
function lineKey(from: [number, number], to: [number, number]): { key: string; ux: number; uy: number } | null {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  let ux = dx / len;
  let uy = dy / len;
  if (ux < -1e-6 || (Math.abs(ux) < 1e-6 && uy < 0)) {
    ux = -ux;
    uy = -uy;
  }
  const nx = -uy;
  const ny = ux;
  const offset = from[0] * nx + from[1] * ny;
  return { key: `${ux.toFixed(4)},${uy.toFixed(4)}|${offset.toFixed(2)}`, ux, uy };
}

const SPLIT_EPSILON = 0.03;

/**
 * Builds the true wall network by overlaying every room edge onto shared infinite lines and
 * splitting/merging at every endpoint that falls on that line — not just edges with identical
 * endpoints. This matters because a big room (e.g. a living room) is often bounded by ONE long
 * edge where several smaller rooms behind it each have their OWN shorter edge; without this
 * overlay those edges never de-duplicate, so a door cut into the small room's edge would still
 * be blocked by the big room's uncut, overlapping wall on the other side.
 */
export function collectWallSegments(rooms: RoomPolygon[], openings: WallOpening[] = []): ResolvedWallSegment[] {
  const groups = new Map<string, LineGroup>();

  for (const room of rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const from = pts[i];
      const to = pts[(i + 1) % pts.length];
      const lk = lineKey(from, to);
      if (!lk) continue;
      let group = groups.get(lk.key);
      if (!group) {
        group = { ref: from, dir: [lk.ux, lk.uy], intervals: [] };
        groups.set(lk.key, group);
      }
      const t1 = (from[0] - group.ref[0]) * group.dir[0] + (from[1] - group.ref[1]) * group.dir[1];
      const t2 = (to[0] - group.ref[0]) * group.dir[0] + (to[1] - group.ref[1]) * group.dir[1];
      group.intervals.push({ start: Math.min(t1, t2), end: Math.max(t1, t2) });
    }
  }

  const segments: ResolvedWallSegment[] = [];
  for (const group of groups.values()) {
    const breakpoints: number[] = [];
    for (const iv of group.intervals) breakpoints.push(iv.start, iv.end);
    breakpoints.sort((a, b) => a - b);
    const uniqueBps: number[] = [];
    for (const bp of breakpoints) {
      if (uniqueBps.length === 0 || bp - uniqueBps[uniqueBps.length - 1] > SPLIT_EPSILON) uniqueBps.push(bp);
    }
    for (let i = 0; i < uniqueBps.length - 1; i++) {
      const t0 = uniqueBps[i];
      const t1 = uniqueBps[i + 1];
      if (t1 - t0 <= SPLIT_EPSILON) continue;
      const tMid = (t0 + t1) / 2;
      const covered = group.intervals.some((iv) => iv.start - SPLIT_EPSILON <= tMid && tMid <= iv.end + SPLIT_EPSILON);
      if (!covered) continue;
      const from: [number, number] = [group.ref[0] + t0 * group.dir[0], group.ref[1] + t0 * group.dir[1]];
      const to: [number, number] = [group.ref[0] + t1 * group.dir[0], group.ref[1] + t1 * group.dir[1]];
      const key = edgeKey(from, to);
      segments.push({ key, from, to, pieces: buildWallPieces({ key, from, to }, openings) });
    }
  }
  return segments;
}

export function wallTransform(seg: WallSegment) {
  const [x1, z1] = seg.from;
  const [x2, z2] = seg.to;
  const length = Math.hypot(x2 - x1, z2 - z1);
  const angle = Math.atan2(z2 - z1, x2 - x1);
  const midX = (x1 + x2) / 2;
  const midZ = (z1 + z2) / 2;
  return { length, angle, midX, midZ };
}

/** World-space midpoint + length of one piece of a wall segment (for rendering sub-boxes). */
export function wallPieceTransform(seg: WallSegment, piece: { start: number; end: number }) {
  const { length, angle } = wallTransform(seg);
  const [x1, z1] = seg.from;
  const [x2, z2] = seg.to;
  const dirX = length > 0 ? (x2 - x1) / length : 0;
  const dirZ = length > 0 ? (z2 - z1) / length : 0;
  const midFrac = (piece.start + piece.end) / 2;
  const pieceLength = (piece.end - piece.start) * length;
  return {
    midX: x1 + dirX * midFrac * length,
    midZ: z1 + dirZ * midFrac * length,
    length: pieceLength,
    angle,
  };
}
