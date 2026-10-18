import * as THREE from "three";
import { useMemo } from "react";
import type { RoomPolygon, WallOpening } from "../../lib/floorPlanGeometry";
import {
  roomFloorShape,
  collectWallSegments,
  wallPieceTransform,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DOOR_HEIGHT,
  WINDOW_SILL_HEIGHT,
  WINDOW_HEAD_HEIGHT,
  type WallPiece,
} from "../../lib/roomGeometry";
import { getFloorTileTexture, getFloorRoughnessMap, getWallPlasterTexture, getWallRoughnessMap } from "../../lib/textures";

const FLOOR_COLOR: Record<string, string> = {
  living: "#E8DCC8",
  bath: "#D9E6EA",
  bath_guest: "#D9E6EA",
  master_bath: "#D9E6EA",
  kitchen: "#DCE3E8",
  sleep: "#EADFCB",
  bedroom: "#EADFCB",
  master_bed: "#EADFCB",
  bed2: "#EADFCB",
  wardrobe: "#E3D9C6",
  master_wardrobe: "#E3D9C6",
  main: "#E8DCC8",
};

const TILE_SIZE_M = 0.6;
const WINDOW_FRAME_INSET = 0.08;
export const WALL_COLOR = "#F4F1EA";
const BASEBOARD_HEIGHT = 0.09;
export const BASEBOARD_COLOR = "#D8D2C4";
/** Warm wood trim framing every door/window opening - distinct from the plaster wall color so
 * openings read clearly as "a feature," not just a gap, and a matching color floor threshold strip
 * at every doorway (see WallPieceMesh) that stays visible regardless of camera angle or how open
 * the door leaf looks, unlike relying on the leaf's rotation alone. */
export const DOOR_TRIM_COLOR = "#6B4F36";
const THRESHOLD_COLOR = "#8A6D4E";
export const WINDOW_FRAME_COLOR = "#4B5563";

interface WallSegmentLike {
  key: string;
  from: [number, number];
  to: [number, number];
  pieces: WallPiece[];
}

function WallPieceMesh({ seg, piece, pieceKey }: { seg: WallSegmentLike; piece: WallPiece; pieceKey: string }) {
  const { midX, midZ, length, angle } = wallPieceTransform(seg, piece);
  if (length <= 0) return null;

  if (piece.type === "solid") {
    return (
      <group key={pieceKey}>
        <mesh position={[midX, WALL_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial map={getWallPlasterTexture(WALL_COLOR)} roughnessMap={getWallRoughnessMap()} roughness={0.9} />
        </mesh>
        <mesh position={[midX, BASEBOARD_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} receiveShadow>
          <boxGeometry args={[length, BASEBOARD_HEIGHT, WALL_THICKNESS + 0.005]} />
          <meshStandardMaterial color={BASEBOARD_COLOR} roughness={0.7} />
        </mesh>
      </group>
    );
  }

  if (piece.type === "door") {
    const headerHeight = WALL_HEIGHT - DOOR_HEIGHT;
    return (
      <group key={pieceKey}>
        {headerHeight > 0 && (
          <mesh position={[midX, DOOR_HEIGHT + headerHeight / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
            <boxGeometry args={[length, headerHeight, WALL_THICKNESS]} />
            <meshStandardMaterial color={DOOR_TRIM_COLOR} roughness={0.65} />
          </mesh>
        )}
        <mesh position={[midX, 0.01, midZ]} rotation={[0, -angle, 0]} receiveShadow>
          <boxGeometry args={[length, 0.02, WALL_THICKNESS * 1.6]} />
          <meshStandardMaterial color={THRESHOLD_COLOR} roughness={0.6} />
        </mesh>
        {/* View/organize mode has no walking character to trigger an open animation (see
         * InteractiveDoorLeaf.tsx, used in walk mode), so the leaf here is simply closed, matching
         * the floor plan's own door-swing-arc convention and how a real home actually looks at rest. */}
        <mesh position={[midX, DOOR_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, DOOR_HEIGHT, 0.045]} />
          <meshStandardMaterial color="#8A6D4E" roughness={0.65} />
        </mesh>
      </group>
    );
  }

  const headHeight = WALL_HEIGHT - WINDOW_HEAD_HEIGHT;
  const paneInset = Math.min(WINDOW_FRAME_INSET, length * 0.15);
  const paneLength = Math.max(length - paneInset * 2, length * 0.5);
  return (
    <group key={pieceKey}>
      {WINDOW_SILL_HEIGHT > 0 && (
        <mesh position={[midX, WINDOW_SILL_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, WINDOW_SILL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial map={getWallPlasterTexture(WALL_COLOR)} roughnessMap={getWallRoughnessMap()} roughness={0.9} />
        </mesh>
      )}
      <mesh position={[midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length, WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT, WALL_THICKNESS * 0.7]} />
        <meshStandardMaterial color={WINDOW_FRAME_COLOR} />
      </mesh>
      <mesh position={[midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[paneLength, (WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT) * 0.82, WALL_THICKNESS * 0.5]} />
        <meshPhysicalMaterial color="#BFE0EA" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh position={[midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[0.04, WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT, WALL_THICKNESS * 0.72]} />
        <meshStandardMaterial color={WINDOW_FRAME_COLOR} />
      </mesh>
      {headHeight > 0 && (
        <mesh position={[midX, WINDOW_HEAD_HEIGHT + headHeight / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, headHeight, WALL_THICKNESS]} />
          <meshStandardMaterial map={getWallPlasterTexture(WALL_COLOR)} roughnessMap={getWallRoughnessMap()} roughness={0.9} />
        </mesh>
      )}
    </group>
  );
}

export function RoomFloor({ room }: { room: RoomPolygon }) {
  const shape = useMemo(() => roomFloorShape(room), [room]);
  const tint = FLOOR_COLOR[room.id] ?? "#E8DCC8";
  const texture = useMemo(() => {
    const xs = room.points.map((p) => p[0]);
    const zs = room.points.map((p) => p[1]);
    const width = Math.max(...xs) - Math.min(...xs);
    const depth = Math.max(...zs) - Math.min(...zs);
    const tex = getFloorTileTexture(tint).clone();
    tex.repeat.set(Math.max(1, width / TILE_SIZE_M), Math.max(1, depth / TILE_SIZE_M));
    tex.needsUpdate = true;
    return tex;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, tint]);

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <shapeGeometry args={[shape]} />
      <meshStandardMaterial map={texture} roughnessMap={getFloorRoughnessMap()} roughness={0.85} side={THREE.DoubleSide} />
    </mesh>
  );
}

export function RoomShell({ rooms, openings = [] }: { rooms: RoomPolygon[]; openings?: WallOpening[] }) {
  const walls = useMemo(() => collectWallSegments(rooms, openings), [rooms, openings]);

  return (
    <group>
      {rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}
      {walls.map((seg) => seg.pieces.map((piece, i) => <WallPieceMesh key={`${seg.key}-${i}`} pieceKey={`${seg.key}-${i}`} seg={seg} piece={piece} />))}
    </group>
  );
}
