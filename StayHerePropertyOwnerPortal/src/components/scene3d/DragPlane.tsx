import { useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { Mesh } from "three";
import { useLayoutStore } from "../../store/layoutStore";
import { roomBounds, type FloorPlanScene } from "../../lib/floorPlanGeometry";

/** Invisible plane used to raycast pointer position onto the floor while dragging furniture */
export function DragPlane({ listing }: { listing: FloorPlanScene }) {
  const meshRef = useRef<Mesh>(null);
  const draggingId = useLayoutStore((s) => s.draggingId);
  const moveItem = useLayoutStore((s) => s.moveItem);
  const endDrag = useLayoutStore((s) => s.endDrag);

  const bounds = roomBounds(listing.rooms);
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  const w = bounds.width + 4;
  const d = bounds.depth + 4;

  const handleMove = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId) return;
    e.stopPropagation();
    moveItem(draggingId, [e.point.x, 0, e.point.z]);
  };

  const handleUp = (e: ThreeEvent<PointerEvent>) => {
    if (!draggingId) return;
    e.stopPropagation();
    endDrag();
  };

  return (
    <mesh ref={meshRef} position={[cx, -0.001, cz]} rotation={[-Math.PI / 2, 0, 0]} onPointerMove={handleMove} onPointerUp={handleUp} onPointerLeave={handleUp} visible={false}>
      <planeGeometry args={[w, d]} />
      <meshBasicMaterial />
    </mesh>
  );
}
