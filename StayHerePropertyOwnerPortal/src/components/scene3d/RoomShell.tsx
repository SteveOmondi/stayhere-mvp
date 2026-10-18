import * as THREE from "three";
import { useMemo } from "react";
import type { RoomPolygon, WallOpening } from "../../lib/floorPlanGeometry";
import {
  roomFloorShape,
  collectWallSegments,
  wallPieceTransform,
  wallTransform,
  WALL_HEIGHT,
  WALL_THICKNESS,
  DOOR_HEIGHT,
  WINDOW_SILL_HEIGHT,
  WINDOW_HEAD_HEIGHT,
  type WallPiece,
} from "../../lib/roomGeometry";
import { getFloorTileTexture } from "../../lib/textures";

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
/** Radians the door leaf swings open from flush-with-wall. */
const DOOR_SWING = Math.PI * 0.42;
const DOOR_LEAF_THICKNESS = 0.045;
const WINDOW_FRAME_INSET = 0.08;
const WALL_COLOR = "#F4F1EA";
const BASEBOARD_HEIGHT = 0.09;
const BASEBOARD_COLOR = "#D8D2C4";

interface WallSegmentLike {
  key: string;
  from: [number, number];
  to: [number, number];
  pieces: WallPiece[];
}

function DoorLeaf({ seg, piece }: { seg: WallSegmentLike; piece: WallPiece }) {
  const { length, angle } = wallTransform(seg);
  const [x1, z1] = seg.from;
  const [x2, z2] = seg.to;
  const dirX = length > 0 ? (x2 - x1) / length : 0;
  const dirZ = length > 0 ? (z2 - z1) / length : 0;
  const hingeX = x1 + dirX * piece.start * length;
  const hingeZ = z1 + dirZ * piece.start * length;
  const leafWidth = (piece.end - piece.start) * length;
  if (leafWidth <= 0) return null;

  return (
    <group position={[hingeX, 0, hingeZ]} rotation={[0, -(angle + DOOR_SWING), 0]}>
      <mesh position={[leafWidth / 2, DOOR_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[leafWidth, DOOR_HEIGHT, DOOR_LEAF_THICKNESS]} />
        <meshStandardMaterial color="#8A6D4E" />
      </mesh>
      <mesh position={[0, DOOR_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, DOOR_HEIGHT, 0.06]} />
        <meshStandardMaterial color="#5C4A36" />
      </mesh>
    </group>
  );
}

function WallPieceMesh({ seg, piece, pieceKey }: { seg: WallSegmentLike; piece: WallPiece; pieceKey: string }) {
  const { midX, midZ, length, angle } = wallPieceTransform(seg, piece);
  if (length <= 0) return null;

  if (piece.type === "solid") {
    return (
      <group key={pieceKey}>
        <mesh position={[midX, WALL_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, WALL_HEIGHT, WALL_THICKNESS]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
        <mesh position={[midX, BASEBOARD_HEIGHT / 2, midZ]} rotation={[0, -angle, 0]} receiveShadow>
          <boxGeometry args={[length, BASEBOARD_HEIGHT, WALL_THICKNESS + 0.005]} />
          <meshStandardMaterial color={BASEBOARD_COLOR} />
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
            <meshStandardMaterial color={WALL_COLOR} />
          </mesh>
        )}
        <DoorLeaf seg={seg} piece={piece} />
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
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      )}
      <mesh position={[midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[length, WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT, WALL_THICKNESS * 0.7]} />
        <meshStandardMaterial color="#8A8F98" />
      </mesh>
      <mesh position={[midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[paneLength, (WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT) * 0.82, WALL_THICKNESS * 0.5]} />
        <meshPhysicalMaterial color="#BFE0EA" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
      </mesh>
      <mesh position={[midX, (WINDOW_SILL_HEIGHT + WINDOW_HEAD_HEIGHT) / 2, midZ]} rotation={[0, -angle, 0]}>
        <boxGeometry args={[0.04, WINDOW_HEAD_HEIGHT - WINDOW_SILL_HEIGHT, WALL_THICKNESS * 0.72]} />
        <meshStandardMaterial color="#8A8F98" />
      </mesh>
      {headHeight > 0 && (
        <mesh position={[midX, WINDOW_HEAD_HEIGHT + headHeight / 2, midZ]} rotation={[0, -angle, 0]} castShadow receiveShadow>
          <boxGeometry args={[length, headHeight, WALL_THICKNESS]} />
          <meshStandardMaterial color={WALL_COLOR} />
        </mesh>
      )}
    </group>
  );
}

function RoomFloor({ room }: { room: RoomPolygon }) {
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
      <meshStandardMaterial map={texture} side={THREE.DoubleSide} />
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
