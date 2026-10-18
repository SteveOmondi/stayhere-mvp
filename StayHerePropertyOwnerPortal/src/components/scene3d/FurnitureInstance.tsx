import { useEffect, useRef } from "react";
import type { Group } from "three";
import type { PlacedFurnitureItem } from "../../types/furniture";
import { getCatalogItem } from "../../lib/furnitureCatalogClient";
import { FurnitureMesh } from "./FurnitureMesh";
import { useLayoutStore } from "../../store/layoutStore";

interface Props {
  item: PlacedFurnitureItem;
  interactive: boolean;
}

export function FurnitureInstance({ item, interactive }: Props) {
  const groupRef = useRef<Group>(null);
  const catalogItem = getCatalogItem(item.catalogId);
  const selectedId = useLayoutStore((s) => s.selectedId);
  const mode = useLayoutStore((s) => s.mode);
  const selectItem = useLayoutStore((s) => s.selectItem);
  const startDrag = useLayoutStore((s) => s.startDrag);

  const isSelected = interactive && mode === "organize" && selectedId === item.instanceId;

  useEffect(() => {
    groupRef.current?.traverse((child) => {
      if ("isMesh" in child && child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }, [catalogItem]);

  return (
    <group
      ref={groupRef}
      position={item.position}
      rotation={[0, (item.rotationY * Math.PI) / 180, 0]}
      onPointerDown={
        interactive && mode === "organize"
          ? (e) => {
              e.stopPropagation();
              selectItem(item.instanceId);
              startDrag(item.instanceId);
            }
          : undefined
      }
    >
      <FurnitureMesh item={catalogItem} />
      {isSelected && (
        <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry
            args={[Math.max(catalogItem.footprint[0], catalogItem.footprint[1]) * 0.62, Math.max(catalogItem.footprint[0], catalogItem.footprint[1]) * 0.72, 32]}
          />
          <meshBasicMaterial color="#FF6B4A" transparent opacity={0.85} />
        </mesh>
      )}
    </group>
  );
}
