import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { RoomPolygon, WallOpening } from "./floorPlanGeometry";
import {
  collectWallSegments,
  wallPieceTransform,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DOOR_HEIGHT,
  WINDOW_SILL_HEIGHT,
  WINDOW_HEAD_HEIGHT,
  type ResolvedWallSegment,
  type WallPiece,
} from "./roomGeometry";

const WINDOW_FRAME_INSET = 0.08;

export interface GlassPane {
  position: [number, number, number];
  rotationY: number;
  length: number;
  height: number;
}

export interface DoorPiece {
  seg: ResolvedWallSegment;
  piece: WallPiece;
}

export interface MergedWallGeometry {
  /** All wall-colored opaque boxes (solid walls, door headers, window sills/heads/frame bars) baked
   * into one BufferGeometry - one draw call for the entire floor plan's structural walls instead of
   * one per wall piece per sub-box. Walk mode is the only place this matters: it's the only mode
   * that ever needs to render every room's walls in view at once (view/organize modes already
   * fly/orbit to one room at a time). */
  wallGeometry: THREE.BufferGeometry | null;
  baseboardGeometry: THREE.BufferGeometry | null;
  /** Window frame bars - visually distinct from the wall color, so merged separately. */
  frameGeometry: THREE.BufferGeometry | null;
  /** Door header/lintel boxes - trim-colored (see RoomShell's DOOR_TRIM_COLOR), merged separately
   * from the plain wall boxes so openings read as a deliberately framed feature. */
  doorTrimGeometry: THREE.BufferGeometry | null;
  /** Floor-level threshold strip at every doorway - stays visible from any angle as an
   * unambiguous "walkable opening here" cue, unlike the door leaf's rotation alone. */
  thresholdGeometry: THREE.BufferGeometry | null;
  /** Window glass stays un-merged (transparent material - merging transparent geometry risks
   * depth-sort artifacts between panes, and there are comparatively few windows per listing). */
  glassPanes: GlassPane[];
  /** Door leaves stay un-merged: each one animates open/closed independently (see
   * InteractiveDoorLeaf.tsx), which needs its own per-door transform and render-time state. */
  doorPieces: DoorPiece[];
}

function appendBox(
  geometries: THREE.BufferGeometry[],
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  angle: number,
) {
  if (w <= 0 || h <= 0) return;
  const geom = new THREE.BoxGeometry(w, h, d);
  geom.rotateY(-angle);
  geom.translate(x, y, z);
  geometries.push(geom);
}

export function buildMergedWallGeometry(rooms: RoomPolygon[], openings: WallOpening[]): MergedWallGeometry {
  const segments = collectWallSegments(rooms, openings);
  const wallBoxGeometries: THREE.BufferGeometry[] = [];
  const baseboardGeometries: THREE.BufferGeometry[] = [];
  const frameGeometries: THREE.BufferGeometry[] = [];
  const doorTrimGeometries: THREE.BufferGeometry[] = [];
  const thresholdGeometries: THREE.BufferGeometry[] = [];
  const glassPanes: GlassPane[] = [];
  const doorPieces: DoorPiece[] = [];
  const BASEBOARD_HEIGHT = 0.09;
  const THRESHOLD_THICKNESS = WALL_THICKNESS * 1.6;

  for (const seg of segments) {
    for (const piece of seg.pieces) {
      const { midX, midZ, length, angle } = wallPieceTransform(seg, piece);
      if (length <= 0) continue;

      if (piece.type === "solid") {
        appendBox(wallBoxGeometries, length, WALL_HEIGHT, WALL_THICKNESS, midX, WALL_HEIGHT / 2, midZ, angle);
        appendBox(baseboardGeometries, length, BASEBOARD_HEIGHT, WALL_THICKNESS + 0.005, midX, BASEBOARD_HEIGHT / 2, midZ, angle);
        continue;
      }

      if (piece.type === "door") {
        const headerHeight = WALL_HEIGHT - DOOR_HEIGHT;
        if (headerHeight > 0) {
          appendBox(doorTrimGeometries, length, headerHeight, WALL_THICKNESS, midX, DOOR_HEIGHT + headerHeight / 2, midZ, angle);
        }
        appendBox(thresholdGeometries, length, 0.02, THRESHOLD_THICKNESS, midX, 0.01, midZ, angle);
        doorPieces.push({ seg, piece });
        continue;
      }

      // window
      const headHeight = WALL_HEIGHT - WINDOW_HEAD_HEIGHT;
      const paneInset = Math.min(WINDOW_FRAME_INSET, length * 0.15);
      const paneLength = Math.max(length - paneInset * 2, length * 0.5);
      if (WINDOW_SILL_HEIGHT > 0) {
        appendBox(wallBoxGeometries, length, WINDOW_SILL_HEIGHT, WALL_THICKNESS, midX, WINDOW_SILL_HEIGHT / 2, midZ, angle);
      }
      if (headHeight > 0) {
        appendBox(wallBoxGeometries, length, headHeight, WALL_THICKNESS, midX, WINDOW_HEAD_HEIGHT + headHeight / 2, midZ, angle);
      }
      const frameMidY = (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2;
      const frameSpan = WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT;
      appendBox(frameGeometries, length, frameSpan, WALL_THICKNESS * 0.72, midX, frameMidY, midZ, angle);
      glassPanes.push({
        position: [midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ],
        rotationY: -angle,
        length: paneLength,
        height: (WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT) * 0.82,
      });
    }
  }

  return {
    wallGeometry: wallBoxGeometries.length ? mergeGeometries(wallBoxGeometries, false) : null,
    baseboardGeometry: baseboardGeometries.length ? mergeGeometries(baseboardGeometries, false) : null,
    frameGeometry: frameGeometries.length ? mergeGeometries(frameGeometries, false) : null,
    doorTrimGeometry: doorTrimGeometries.length ? mergeGeometries(doorTrimGeometries, false) : null,
    thresholdGeometry: thresholdGeometries.length ? mergeGeometries(thresholdGeometries, false) : null,
    glassPanes,
    doorPieces,
  };
}
