import { useMemo } from "react";
import type { FurnitureCatalogItem } from "../../types/furniture";
import { getFurnitureParts } from "../../lib/furnitureParts";
import { EXTERNAL_FURNITURE_ASSETS } from "../../lib/externalFurnitureAssets";
import { ExternalFurnitureMesh } from "./ExternalFurnitureMesh";

/** Procedural low-poly furniture built from primitives (no external GLB assets), except for the
 * catalog ids in EXTERNAL_FURNITURE_ASSETS, which render a real textured model instead. Procedural
 * parts come from getFurnitureParts so view/organize mode (here) and walk mode's
 * InstancedFurniture.tsx render from the exact same data - no risk of the two ever drifting apart. */
export function FurnitureMesh({ item }: { item: FurnitureCatalogItem }) {
  const externalAsset = EXTERNAL_FURNITURE_ASSETS[item.id];
  const parts = useMemo(() => getFurnitureParts(item), [item]);

  if (externalAsset) return <ExternalFurnitureMesh asset={externalAsset} />;

  return (
    <>
      {parts.map((part, i) => (
        <mesh key={i} position={part.position}>
          {part.shape === "box" ? (
            <boxGeometry args={part.args as [number, number, number]} />
          ) : (
            <cylinderGeometry args={part.args as [number, number, number, number]} />
          )}
          <meshStandardMaterial color={part.color} transparent={part.transparent} opacity={part.opacity ?? 1} />
        </mesh>
      ))}
    </>
  );
}
