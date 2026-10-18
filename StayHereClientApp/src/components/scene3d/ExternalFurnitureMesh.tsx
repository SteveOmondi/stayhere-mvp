import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import type { ExternalFurnitureAsset } from "../../lib/externalFurnitureAssets";
import { EXTERNAL_FURNITURE_ASSETS } from "../../lib/externalFurnitureAssets";

for (const asset of Object.values(EXTERNAL_FURNITURE_ASSETS)) {
  useGLTF.preload(asset.url);
}

/** Renders a real, textured glTF furniture model (see externalFurnitureAssets.ts) in place of the
 * procedural box primitives, for the handful of catalog items with a good CC0 match. Cloned per
 * instance (like WalkCharacter's AnimatedCharacterMesh) since useGLTF shares the loaded scene graph
 * across every placement of the same item - without cloning, dragging one sofa would move every
 * sofa in the scene. */
export function ExternalFurnitureMesh({ asset }: { asset: ExternalFurnitureAsset }) {
  const { scene } = useGLTF(asset.url);
  const cloned = useMemo(() => scene.clone(true), [scene]);

  return (
    <group rotation={[0, asset.rotationYOffset ?? 0, 0]} scale={asset.scale}>
      <primitive object={cloned} />
    </group>
  );
}
