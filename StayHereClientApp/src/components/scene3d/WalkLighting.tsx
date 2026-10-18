import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { RoomPolygon } from "../../lib/floorPlanGeometry";
import { pointInPolygon } from "../../lib/floorPlanGeometry";
import { walkRuntime } from "../../lib/walkRuntime";

const MARGIN = 1.2; // meters of buffer around the active room's bbox, so the frustum doesn't clip
const LERP_ALPHA_PER_SECOND = 4; // how fast the frustum re-centers when the character changes rooms
const LIGHT_DIR = new THREE.Vector3(8, 12, 6).normalize();
const LIGHT_DISTANCE = 16;

interface RoomBBox {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  cx: number;
  cz: number;
}

function roomBBox(room: RoomPolygon): RoomBBox {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of room.points) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minZ = Math.min(minZ, z);
    maxZ = Math.max(maxZ, z);
  }
  return { minX, maxX, minZ, maxZ, cx: (minX + maxX) / 2, cz: (minZ + maxZ) / 2 };
}

/** Walk-mode-only lighting: the fixed whole-floor-plan shadow frustum SceneContents normally uses
 * has to cover every room at once (view/organize modes can show any room at any time), which wastes
 * most of the 2048x2048 shadow map's resolution on rooms the character isn't even in. Walk mode
 * needs an "active room" concept anyway, so this reuses it: the shadow camera's frustum and the
 * light's own position smoothly follow whichever room the character currently stands in. */
export function WalkLighting({ rooms }: { rooms: RoomPolygon[] }) {
  const lightRef = useRef<THREE.DirectionalLight>(null);
  const currentRoomIndexRef = useRef(0);
  const smoothedRef = useRef<RoomBBox | null>(null);

  const bboxes = useMemo(() => rooms.map(roomBBox), [rooms]);

  useFrame((_, delta) => {
    const light = lightRef.current;
    if (!light || bboxes.length === 0) return;

    const pos = walkRuntime.characterPosition;
    const point: [number, number] = [pos.x, pos.z];
    let foundIndex = rooms.findIndex((room) => pointInPolygon(point, room.points));
    if (foundIndex === -1) foundIndex = currentRoomIndexRef.current;
    currentRoomIndexRef.current = foundIndex;
    const target = bboxes[foundIndex];

    if (!smoothedRef.current) smoothedRef.current = { ...target };
    const s = smoothedRef.current;
    const alpha = Math.min(1, LERP_ALPHA_PER_SECOND * delta);
    s.minX += (target.minX - s.minX) * alpha;
    s.maxX += (target.maxX - s.maxX) * alpha;
    s.minZ += (target.minZ - s.minZ) * alpha;
    s.maxZ += (target.maxZ - s.maxZ) * alpha;
    s.cx += (target.cx - s.cx) * alpha;
    s.cz += (target.cz - s.cz) * alpha;

    const halfW = (s.maxX - s.minX) / 2 + MARGIN;
    const halfD = (s.maxZ - s.minZ) / 2 + MARGIN;
    const half = Math.max(halfW, halfD, 1.5);

    light.position.set(s.cx + LIGHT_DIR.x * LIGHT_DISTANCE, LIGHT_DIR.y * LIGHT_DISTANCE, s.cz + LIGHT_DIR.z * LIGHT_DISTANCE);
    light.target.position.set(s.cx, 0, s.cz);
    light.target.updateMatrixWorld();

    const cam = light.shadow.camera;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 1;
    cam.far = LIGHT_DISTANCE * 2.5;
    cam.updateProjectionMatrix();
  });

  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight ref={lightRef} intensity={0.8} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0015} />
      <directionalLight position={[-6, 8, -6]} intensity={0.35} />
    </>
  );
}
