import { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import type { PlacedFurnitureItem } from "../../types/furniture";
import { SceneContents } from "../scene3d/SceneContents";
import { overviewCameraView } from "../../lib/floorPlanGeometry";
import { Watermark } from "./Watermark";

function LookAt({ target }: { target: [number, number, number] }) {
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    camera.lookAt(...target);
  }, [camera, target]);
  return null;
}

export function FloorPlan3DImage({ listing, items }: { listing: FloorPlanScene; items: PlacedFurnitureItem[] }) {
  const { cameraPos, target } = overviewCameraView(listing.rooms);

  return (
    <div className="floorplan-3d-image">
      <Canvas shadows camera={{ position: cameraPos, fov: 40 }}>
        <color attach="background" args={["#EEF2F6"]} />
        <LookAt target={target} />
        <SceneContents listing={listing} items={items} interactive={false} />
      </Canvas>
      <Watermark />
    </div>
  );
}
