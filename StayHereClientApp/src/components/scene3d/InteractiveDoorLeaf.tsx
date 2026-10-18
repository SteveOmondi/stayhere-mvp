import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DOOR_HEIGHT, wallTransform, type ResolvedWallSegment, type WallPiece } from "../../lib/roomGeometry";
import { walkRuntime } from "../../lib/walkRuntime";

const DOOR_LEAF_THICKNESS = 0.045;
/** Fully open = perpendicular to the wall. Standard door-swing convention: the leaf's own
 * footprint is confined to a thin (DOOR_LEAF_THICKNESS) strip right at the hinge jamb, extending
 * into the room - it does not span the opening's width, so walking through anywhere but hard
 * against that one jamb clears it. Combined with "normally closed, opens on approach" below, the
 * leaf is always safely out of the way well before a walking character reaches the doorway. */
const OPEN_ANGLE = Math.PI / 2;
const OPEN_RADIUS = 1.3;
/** Wider than OPEN_RADIUS (hysteresis) so the door doesn't flicker open/closed right at the
 * threshold distance. */
const CLOSE_RADIUS = 1.9;
/** Reaches ~90% open/closed in about half a second - quick enough to always finish well before a
 * character walking at normal speed actually reaches the doorway plane from OPEN_RADIUS away. */
const SWING_RATE_PER_SECOND = 4.5;

/** A door that's closed by default (matching how a real home actually looks, and the floor plan's
 * own door-swing-arc convention) and swings open automatically as the character approaches,
 * closing again once they've walked away - an automatic/sensor-style trigger rather than a manual
 * button, so it never interrupts moving through the house. Purely cosmetic: the wall collider for
 * a door piece is already always excluded (see wallColliders.ts) regardless of this animation's
 * state, so there is no risk of ever being visually or physically blocked by a door mid-swing. */
export function InteractiveDoorLeaf({ seg, piece }: { seg: ResolvedWallSegment; piece: WallPiece }) {
  const { length, angle } = wallTransform(seg);
  const [x1, z1] = seg.from;
  const [x2, z2] = seg.to;
  const dirX = length > 0 ? (x2 - x1) / length : 0;
  const dirZ = length > 0 ? (z2 - z1) / length : 0;
  const hingeX = x1 + dirX * piece.start * length;
  const hingeZ = z1 + dirZ * piece.start * length;
  const leafWidth = (piece.end - piece.start) * length;
  const midX = hingeX + dirX * (leafWidth / 2);
  const midZ = hingeZ + dirZ * (leafWidth / 2);

  const groupRef = useRef<THREE.Group>(null);
  const swingRef = useRef(0); // 0 = closed, 1 = fully open
  const isOpenRef = useRef(false);

  useFrame((_, delta) => {
    const dx = walkRuntime.characterPosition.x - midX;
    const dz = walkRuntime.characterPosition.z - midZ;
    const dist = Math.hypot(dx, dz);
    if (isOpenRef.current && dist > CLOSE_RADIUS) isOpenRef.current = false;
    else if (!isOpenRef.current && dist < OPEN_RADIUS) isOpenRef.current = true;

    const target = isOpenRef.current ? 1 : 0;
    const alpha = Math.min(1, SWING_RATE_PER_SECOND * delta);
    swingRef.current += (target - swingRef.current) * alpha;

    if (groupRef.current) {
      groupRef.current.rotation.y = -(angle + OPEN_ANGLE * swingRef.current);
    }
  });

  if (leafWidth <= 0) return null;

  return (
    <group ref={groupRef} position={[hingeX, 0, hingeZ]} rotation={[0, -angle, 0]}>
      <mesh position={[leafWidth / 2, DOOR_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[leafWidth, DOOR_HEIGHT, DOOR_LEAF_THICKNESS]} />
        <meshStandardMaterial color="#8A6D4E" roughness={0.65} />
      </mesh>
      <mesh position={[0, DOOR_HEIGHT / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.04, DOOR_HEIGHT, 0.06]} />
        <meshStandardMaterial color="#5C4A36" roughness={0.6} />
      </mesh>
    </group>
  );
}
