import { useMemo } from "react";
import type { RoomPolygon, WallOpening } from "../../lib/floorPlanGeometry";
import { buildMergedWallGeometry } from "../../lib/wallMeshBuilder";
import { RoomFloor, WALL_COLOR, BASEBOARD_COLOR, DOOR_TRIM_COLOR, WINDOW_FRAME_COLOR } from "./RoomShell";
import { getWallPlasterTexture, getWallRoughnessMap } from "../../lib/textures";
import { InteractiveDoorLeaf } from "./InteractiveDoorLeaf";

const THRESHOLD_COLOR = "#8A6D4E";

/** Walk-mode-only room shell: identical visual result to RoomShell, but all static wall/baseboard/
 * frame boxes are pre-merged into one draw call each (via wallMeshBuilder), instead of one draw call
 * per wall piece per sub-box. Only walk mode needs this - view/organize modes render one room's
 * worth of walls in frame at a time via the orbit camera, so they've never hit this cost.
 *
 * Door leaves are closed by default and swing open automatically as the character approaches (see
 * InteractiveDoorLeaf) - matching how a real home actually looks (and the floor plan's own door-
 * swing-arc convention) instead of permanently-open gaps. The door trim + floor threshold strip
 * still mark every doorway clearly from any angle regardless of the leaf's current swing state. */
export function WalkRoomShell({ rooms, openings = [] }: { rooms: RoomPolygon[]; openings?: WallOpening[] }) {
  const merged = useMemo(() => buildMergedWallGeometry(rooms, openings), [rooms, openings]);

  return (
    <group>
      {rooms.map((room) => (
        <RoomFloor key={room.id} room={room} />
      ))}

      {merged.wallGeometry && (
        <mesh geometry={merged.wallGeometry} castShadow receiveShadow>
          <meshStandardMaterial map={getWallPlasterTexture(WALL_COLOR)} roughnessMap={getWallRoughnessMap()} roughness={0.9} />
        </mesh>
      )}
      {merged.baseboardGeometry && (
        <mesh geometry={merged.baseboardGeometry} receiveShadow>
          <meshStandardMaterial color={BASEBOARD_COLOR} roughness={0.7} />
        </mesh>
      )}
      {merged.frameGeometry && (
        <mesh geometry={merged.frameGeometry}>
          <meshStandardMaterial color={WINDOW_FRAME_COLOR} />
        </mesh>
      )}
      {merged.doorTrimGeometry && (
        <mesh geometry={merged.doorTrimGeometry} castShadow receiveShadow>
          <meshStandardMaterial color={DOOR_TRIM_COLOR} roughness={0.65} />
        </mesh>
      )}
      {merged.thresholdGeometry && (
        <mesh geometry={merged.thresholdGeometry} receiveShadow>
          <meshStandardMaterial color={THRESHOLD_COLOR} roughness={0.6} />
        </mesh>
      )}

      {merged.glassPanes.map((pane, i) => (
        <mesh key={i} position={pane.position} rotation={[0, pane.rotationY, 0]}>
          <boxGeometry args={[pane.length, pane.height, 0.06]} />
          <meshPhysicalMaterial color="#BFE0EA" transparent opacity={0.4} roughness={0.05} metalness={0.1} />
        </mesh>
      ))}

      {merged.doorPieces.map(({ seg, piece }, i) => (
        <InteractiveDoorLeaf key={i} seg={seg} piece={piece} />
      ))}
    </group>
  );
}
