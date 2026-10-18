import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import type { PlacedFurnitureItem } from "../../types/furniture";
import { RoomShell } from "./RoomShell";
import { FurnitureInstance } from "./FurnitureInstance";
import { DragPlane } from "./DragPlane";

interface Props {
  listing: FloorPlanScene;
  items: PlacedFurnitureItem[];
  interactive: boolean;
}

export function SceneContents({ listing, items, interactive }: Props) {
  return (
    <>
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[8, 12, 6]}
        intensity={0.8}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-camera-near={1}
        shadow-camera-far={40}
        shadow-bias={-0.0015}
      />
      <directionalLight position={[-6, 8, -6]} intensity={0.35} />
      <RoomShell rooms={listing.rooms} openings={listing.openings} />
      {items.map((item) => (
        <FurnitureInstance key={item.instanceId} item={item} interactive={interactive} />
      ))}
      {interactive && <DragPlane listing={listing} />}
    </>
  );
}
