import { Environment } from "@react-three/drei";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import type { PlacedFurnitureItem } from "../../types/furniture";
import type { WallCollider } from "../../lib/wallColliders";
import { RoomShell } from "./RoomShell";
import { WalkRoomShell } from "./WalkRoomShell";
import { FurnitureInstance } from "./FurnitureInstance";
import { InstancedFurniture } from "./InstancedFurniture";
import { VendorShowcase } from "./VendorShowcase";
import { WalkLighting } from "./WalkLighting";
import { RoomVisitTracker } from "./RoomVisitTracker";
import { DragPlane } from "./DragPlane";
import { WalkCharacter } from "./WalkCharacter";

interface Props {
  listing: FloorPlanScene;
  items: PlacedFurnitureItem[];
  interactive: boolean;
  walking?: boolean;
  characterId?: string;
  wallColliders?: WallCollider[];
  /** Walk mode's organizer sub-mode: furniture renders interactively (draggable) instead of
   * through the instanced, non-interactive walk-mode renderer. */
  walkRearranging?: boolean;
}

export function SceneContents({ listing, items, interactive, walking, characterId, wallColliders, walkRearranging }: Props) {
  if (walking && wallColliders) {
    return (
      <>
        {/* Image-based lighting: gives every material (walls, floors, furniture) realistic ambient
         * reflections/response to its surroundings instead of flat, uniformly-lit primitives -
         * the single highest-leverage change for making the scene read as a real lit interior
         * rather than a CG render. Lighting-only (background=false keeps the existing sky color). */}
        <Environment preset="apartment" background={false} />
        <WalkLighting rooms={listing.rooms} />
        <WalkRoomShell rooms={listing.rooms} openings={listing.openings} />
        {walkRearranging ? (
          <>
            {items.map((item) => (
              <FurnitureInstance key={item.instanceId} item={item} interactive />
            ))}
            <DragPlane listing={listing} />
          </>
        ) : (
          <InstancedFurniture items={items} />
        )}
        <VendorShowcase items={items} />
        <RoomVisitTracker rooms={listing.rooms} />
        <WalkCharacter rooms={listing.rooms} openings={listing.openings} colliders={wallColliders} characterId={characterId ?? "xbot"} />
      </>
    );
  }

  return (
    <>
      <Environment preset="apartment" background={false} />
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
