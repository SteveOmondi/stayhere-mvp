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

/** An opening's door/window span projected onto one line group's own t-parametrization (absolute
 * meters along group.ref/group.dir) - computed once per group match, then clipped against each of
 * that group's final (possibly split) sub-segments. */
interface ProjectedOpening {
  t0: number;
  t1: number;
  type: "door" | "window";
}

/** Builds the final wall pieces for one resolved sub-segment [segT0, segT1] (in its group's own
 * t-parametrization) by clipping every opening already matched to that group against this
 * specific window - an opening only needs to geometrically overlap the window, not exactly equal
 * its endpoints, so it still carves out correctly even when a wall gets split into more pieces
 * than the opening's own source room "knew about" (see collectWallSegments' doc comment). */
function buildWallPiecesFromProjected(segT0: number, segT1: number, projected: ProjectedOpening[]): WallPiece[] {
  const segLen = segT1 - segT0;
  if (segLen <= 0) return [{ start: 0, end: 1, type: "solid" }];

  const clipped = projected
    .map((op) => ({
      start: (Math.max(op.t0, segT0) - segT0) / segLen,
      end: (Math.min(op.t1, segT1) - segT0) / segLen,
      type: op.type,
    }))
    .filter((op) => op.end - op.start > 0.02) // negligible/no real overlap with this sub-segment
    .sort((a, b) => a.start - b.start);

  if (clipped.length === 0) return [{ start: 0, end: 1, type: "solid" }];

  const pieces: WallPiece[] = [];
  let cursor = 0;
  for (const op of clipped) {
    const opStart = Math.max(cursor, Math.min(1, op.start));
    const opEnd = Math.max(cursor, Math.min(1, op.end));
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
  projectedOpenings: ProjectedOpening[];
}

/** Same canonical direction + perpendicular-offset identity lineKey() uses, but returning raw
 * numbers instead of a rounded string - used to match an opening to a line group by geometric
 * proximity instead of requiring its endpoints to exactly equal some room edge's. */
function lineDirAndOffset(from: [number, number], to: [number, number]): { ux: number; uy: number; offset: number } | null {
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
  return { ux, uy, offset };
}

/** How far an opening's own line can sit from a wall's actual line and still be considered "the
 * same wall" - generous enough to absorb rounding/digitization drift (and room-shape corrections
 * applied after an opening was first recorded - this format is explicitly meant to survive those,
 * per FloorPlanOpening's own doc comment) while staying safely under WALL_THICKNESS (0.12m), so it
 * never misattributes an opening to a genuinely different, separate parallel wall. */
const LINE_OFFSET_TOLERANCE = 0.08;
const DIR_DOT_TOLERANCE = 0.999;

/** Matches every opening to whichever line group it geometrically belongs to (by direction +
 * perpendicular offset, not exact endpoint equality - see LINE_OFFSET_TOLERANCE), and records its
 * actual door/window span in that group's own t-parametrization. An opening that matches no group
 * within tolerance is silently dropped (keeps the previous behavior for genuinely stray/malformed
 * data) rather than ever being allowed to spuriously attach to the wrong wall. */
function projectOpeningsOntoGroups(groups: Map<string, LineGroup>, openings: WallOpening[]): void {
  for (const opening of openings) {
    const ld = lineDirAndOffset(opening.from, opening.to);
    if (!ld) continue;

    let bestGroup: LineGroup | null = null;
    let bestOffsetDiff = Infinity;
    for (const group of groups.values()) {
      const dot = ld.ux * group.dir[0] + ld.uy * group.dir[1];
      if (Math.abs(dot) < DIR_DOT_TOLERANCE) continue;
      const groupOffset = -group.ref[0] * group.dir[1] + group.ref[1] * group.dir[0];
      const offsetDiff = Math.abs(ld.offset - groupOffset);
      if (offsetDiff <= LINE_OFFSET_TOLERANCE && offsetDiff < bestOffsetDiff) {
        bestOffsetDiff = offsetDiff;
        bestGroup = group;
      }
    }
    if (!bestGroup) continue;

    // Absolute world-space door span (independent of any sub-segment), derived from this opening's
    // OWN from/to/position/widthMeters - exactly what the old code did, just not yet tied to a
    // specific resolved sub-segment's coordinates.
    const lenOp = Math.hypot(opening.to[0] - opening.from[0], opening.to[1] - opening.from[1]);
    if (lenOp < 1e-6) continue;
    const dirX = (opening.to[0] - opening.from[0]) / lenOp;
    const dirZ = (opening.to[1] - opening.from[1]) / lenOp;
    const centerX = opening.from[0] + dirX * lenOp * opening.position;
    const centerZ = opening.from[1] + dirZ * lenOp * opening.position;
    const half = opening.widthMeters / 2;
    const ax = centerX - dirX * half;
    const az = centerZ - dirZ * half;
    const bx = centerX + dirX * half;
    const bz = centerZ + dirZ * half;

    const t0 = (ax - bestGroup.ref[0]) * bestGroup.dir[0] + (az - bestGroup.ref[1]) * bestGroup.dir[1];
    const t1 = (bx - bestGroup.ref[0]) * bestGroup.dir[0] + (bz - bestGroup.ref[1]) * bestGroup.dir[1];
    bestGroup.projectedOpenings.push({ t0: Math.min(t0, t1), t1: Math.max(t0, t1), type: opening.type });
  }
}

/** A genuinely different parallel wall must sit at least this far away - rules out merging two
 * walls that just happen to run the same direction but bound different rooms a real room-width
 * apart. */
const PARALLEL_WALL_MERGE_MIN_OFFSET = 0.03;
/** Generous upper bound on "this is really the same physical wall, independently digitized from
 * each room's own side" - covers realistic wall thickness plus drift, without reaching far enough
 * to accidentally fuse two separate walls. */
const PARALLEL_WALL_MERGE_MAX_OFFSET = 0.25;

/**
 * Many floor plans are digitized per-room (confirmed for this app's own AI pipeline - see
 * QwenFloorPlanService.cs's per-room-cropped opening detection): each room's polygon traces its
 * own interior face of a shared wall, which means two adjacent rooms commonly produce two
 * parallel, slightly offset lines (roughly a wall's thickness apart) for what is physically ONE
 * wall - rather than one line both rooms agree on. Confirmed from a real listing: a door was
 * carved into one room's wall face for a shared boundary, but with no matching opening recorded on
 * the neighboring room's own (offset) wall face, the neighboring room's wall rendered fully solid
 * a few centimeters past the first "open" door - passable on paper, impassable in practice ("feels
 * like a brick wall"). This merges such offset-but-clearly-the-same-wall line pairs into one
 * before any opening gets matched to either, so a door recorded on just one side correctly clears
 * the wall as a whole.
 */
interface MergeableGroup<TInterval extends { start: number; end: number }> {
  ref: [number, number];
  dir: [number, number];
  intervals: TInterval[];
  projectedOpenings: ProjectedOpening[];
}

function mergeNearbyParallelGroups<TInterval extends { start: number; end: number }>(
  groups: Map<string, MergeableGroup<TInterval>>,
): void {
  const entries = [...groups.entries()];
  const removed = new Set<string>();

  // Preserves any extra fields on TInterval (e.g. findUnreachableRooms' roomId tag) via spread -
  // only start/end get recomputed in the destination group's own t-parametrization.
  function reprojectInterval(src: MergeableGroup<TInterval>, iv: TInterval, dst: MergeableGroup<TInterval>): TInterval {
    const p1: [number, number] = [src.ref[0] + iv.start * src.dir[0], src.ref[1] + iv.start * src.dir[1]];
    const p2: [number, number] = [src.ref[0] + iv.end * src.dir[0], src.ref[1] + iv.end * src.dir[1]];
    const t1 = (p1[0] - dst.ref[0]) * dst.dir[0] + (p1[1] - dst.ref[1]) * dst.dir[1];
    const t2 = (p2[0] - dst.ref[0]) * dst.dir[0] + (p2[1] - dst.ref[1]) * dst.dir[1];
    return { ...iv, start: Math.min(t1, t2), end: Math.max(t1, t2) };
  }

  for (let i = 0; i < entries.length; i++) {
    const [keyA, a] = entries[i];
    if (removed.has(keyA)) continue;
    for (let j = i + 1; j < entries.length; j++) {
      const [keyB, b] = entries[j];
      if (removed.has(keyB)) continue;

      const dot = a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1];
      if (Math.abs(dot) < DIR_DOT_TOLERANCE) continue;
      const nx = -a.dir[1];
      const ny = a.dir[0];
      const offsetA = a.ref[0] * nx + a.ref[1] * ny;
      const offsetB = b.ref[0] * nx + b.ref[1] * ny;
      const diff = Math.abs(offsetA - offsetB);
      if (diff < PARALLEL_WALL_MERGE_MIN_OFFSET || diff > PARALLEL_WALL_MERGE_MAX_OFFSET) continue;

      const bIntervalsOnA = b.intervals.map((iv) => reprojectInterval(b, iv, a));
      const overlaps = bIntervalsOnA.some((ivB) => a.intervals.some((ivA) => ivA.start <= ivB.end && ivB.start <= ivA.end));
      if (!overlaps) continue;

      for (const ivB of bIntervalsOnA) a.intervals.push(ivB);
      for (const op of b.projectedOpenings) {
        const p1: [number, number] = [b.ref[0] + op.t0 * b.dir[0], b.ref[1] + op.t0 * b.dir[1]];
        const p2: [number, number] = [b.ref[0] + op.t1 * b.dir[0], b.ref[1] + op.t1 * b.dir[1]];
        const t1 = (p1[0] - a.ref[0]) * a.dir[0] + (p1[1] - a.ref[1]) * a.dir[1];
        const t2 = (p2[0] - a.ref[0]) * a.dir[0] + (p2[1] - a.ref[1]) * a.dir[1];
        a.projectedOpenings.push({ t0: Math.min(t1, t2), t1: Math.max(t1, t2), type: op.type });
      }
      removed.add(keyB);
    }
  }
  for (const key of removed) groups.delete(key);
}

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
 * endpoints. This matters because a big room is often bounded by ONE long edge where several
 * smaller rooms behind it each have their OWN shorter edge; without this overlay those edges
 * never de-duplicate, so a door cut into the small room's edge would still be blocked by the big
 * room's uncut, overlapping wall on the other side.
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
        group = { ref: from, dir: [lk.ux, lk.uy], intervals: [], projectedOpenings: [] };
        groups.set(lk.key, group);
      }
      const t1 = (from[0] - group.ref[0]) * group.dir[0] + (from[1] - group.ref[1]) * group.dir[1];
      const t2 = (to[0] - group.ref[0]) * group.dir[0] + (to[1] - group.ref[1]) * group.dir[1];
      group.intervals.push({ start: Math.min(t1, t2), end: Math.max(t1, t2) });
    }
  }

  projectOpeningsOntoGroups(groups, openings);
  mergeNearbyParallelGroups(groups);

  const segments: ResolvedWallSegment[] = [];
  for (const group of groups.values()) {
    const breakpoints: number[] = [];
    for (const iv of group.intervals) breakpoints.push(iv.start, iv.end);
    breakpoints.sort((a, b) => a - b);
    const uniqueBpsRaw: number[] = [];
    for (const bp of breakpoints) {
      if (uniqueBpsRaw.length === 0 || bp - uniqueBpsRaw[uniqueBpsRaw.length - 1] > SPLIT_EPSILON) uniqueBpsRaw.push(bp);
    }
    // A room-corner breakpoint landing meaningfully INSIDE a door's own span splits that one
    // physical doorway into two separate wall pieces - confirmed in practice: a small polygon
    // notch (digitization noise, not a real wall feature) fell squarely inside a door's width,
    // carving it into a 10cm sliver in one piece and an unconnected fragment in the next, each too
    // narrow (or wrongly bordered) for anyone to actually walk through despite the door rendering
    // as "open." A room corner has no reason to matter to a door that already spans across it, so
    // such breakpoints are dropped (DOOR_SPLIT_MARGIN keeps this from affecting a breakpoint that
    // only grazes a door's very edge, which is a real, meaningful corner).
    const DOOR_SPLIT_MARGIN = 0.05;
    const doorSpans = group.projectedOpenings.filter((o) => o.type === "door");
    const uniqueBps = uniqueBpsRaw.filter(
      (bp) => !doorSpans.some((d) => bp > d.t0 + DOOR_SPLIT_MARGIN && bp < d.t1 - DOOR_SPLIT_MARGIN),
    );
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
      segments.push({ key, from, to, pieces: buildWallPiecesFromProjected(t0, t1, group.projectedOpenings) });
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

/**
 * Diagnostic, not used by rendering/collision: checks whether every room in a listing is actually
 * reachable from the entry room via door openings, using the same tolerant geometric matching as
 * collectWallSegments (so this reports the SAME connectivity the walkthrough itself will use, not
 * a stricter or looser approximation). Exists because a disconnected floor plan is otherwise silent
 * - nothing in the 3D scene itself can tell you "this room has no door," only a player wandering
 * into a dead end. Reused by WalkCharacter to warn (once, to the console) on any listing where the
 * entry room can't reach every other room - surfaces real floor-plan data gaps immediately instead
 * of leaving them to be discovered mid-walkthrough.
 */
export function findUnreachableRooms(
  rooms: RoomPolygon[],
  openings: WallOpening[],
  entryRoomId: string | null,
): RoomPolygon[] {
  if (rooms.length <= 1) return [];

  interface TaggedInterval {
    roomId: string;
    start: number;
    end: number;
  }
  interface TaggedGroup {
    ref: [number, number];
    dir: [number, number];
    intervals: TaggedInterval[];
    projectedOpenings: ProjectedOpening[];
  }

  const groups = new Map<string, TaggedGroup>();
  for (const room of rooms) {
    const pts = room.points;
    for (let i = 0; i < pts.length; i++) {
      const from = pts[i];
      const to = pts[(i + 1) % pts.length];
      const lk = lineKey(from, to);
      if (!lk) continue;
      let group = groups.get(lk.key);
      if (!group) {
        group = { ref: from, dir: [lk.ux, lk.uy], intervals: [], projectedOpenings: [] };
        groups.set(lk.key, group);
      }
      const t1 = (from[0] - group.ref[0]) * group.dir[0] + (from[1] - group.ref[1]) * group.dir[1];
      const t2 = (to[0] - group.ref[0]) * group.dir[0] + (to[1] - group.ref[1]) * group.dir[1];
      group.intervals.push({ roomId: room.id, start: Math.min(t1, t2), end: Math.max(t1, t2) });
    }
  }
  projectOpeningsOntoGroups(groups, openings);
  mergeNearbyParallelGroups(groups);

  const adjacency = new Map<string, Set<string>>();
  for (const room of rooms) adjacency.set(room.id, new Set());

  for (const group of groups.values()) {
    const doorSpans = group.projectedOpenings.filter((o) => o.type === "door");
    if (doorSpans.length === 0) continue;
    for (const door of doorSpans) {
      const bordering = group.intervals.filter(
        (iv) => iv.start - SPLIT_EPSILON <= door.t1 && door.t0 <= iv.end + SPLIT_EPSILON,
      );
      const roomIds = [...new Set(bordering.map((iv) => iv.roomId))];
      for (const a of roomIds) {
        for (const b of roomIds) {
          if (a !== b) adjacency.get(a)?.add(b);
        }
      }
    }
  }

  const startId = entryRoomId ?? rooms[0].id;
  const visited = new Set<string>([startId]);
  const queue = [startId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const neighbor of adjacency.get(current) ?? []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push(neighbor);
      }
    }
  }

  return rooms.filter((r) => !visited.has(r.id));
}
