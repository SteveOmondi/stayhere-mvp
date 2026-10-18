import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { RoomPolygon } from "../../lib/floorPlanGeometry";
import { pointInPolygon } from "../../lib/floorPlanGeometry";
import { walkRuntime } from "../../lib/walkRuntime";
import { useLayoutStore } from "../../store/layoutStore";

/** Tracks which rooms the character has physically walked into this walkthrough, so the "rooms
 * covered" checklist in Scene3DLive's walk overlay reflects real tour progress instead of just
 * listing every room in the listing. Renders nothing - purely a side-effect-driven tracker, same
 * pattern as WalkLighting's active-room detection. */
export function RoomVisitTracker({ rooms }: { rooms: RoomPolygon[] }) {
  const markRoomVisited = useLayoutStore((s) => s.markRoomVisited);
  const lastRoomIdRef = useRef<string | null>(null);

  useFrame(() => {
    const pos = walkRuntime.characterPosition;
    const point: [number, number] = [pos.x, pos.z];
    const room = rooms.find((r) => pointInPolygon(point, r.points));
    if (room && room.id !== lastRoomIdRef.current) {
      lastRoomIdRef.current = room.id;
      markRoomVisited(room.id);
    }
  });

  return null;
}
