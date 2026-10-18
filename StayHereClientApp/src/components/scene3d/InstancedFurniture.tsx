import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { PlacedFurnitureItem } from "../../types/furniture";
import { getCatalogItem } from "../../lib/furnitureCatalogClient";
import { getFurnitureParts, type FurniturePart } from "../../lib/furnitureParts";
import { EXTERNAL_FURNITURE_ASSETS } from "../../lib/externalFurnitureAssets";
import { ExternalFurnitureMesh } from "./ExternalFurnitureMesh";

interface PartGroup {
  key: string;
  part: FurniturePart;
  entries: PlacedFurnitureItem[];
}

/** Walk-mode-only furniture renderer: one InstancedMesh per (catalogId, part-index) pair instead
 * of one draw call per sub-mesh per placed item. This works generally (not just for single-box
 * items) because a catalog item's parts (footprint/height/color) are fixed per catalogId - only
 * position/rotationY/scale vary per placement, which is exactly what setMatrixAt handles. No
 * interactivity (selection/dragging) is needed in walk mode, so this intentionally replaces
 * FurnitureInstance rather than extending it - instance-picking would add real complexity for a
 * capability walk mode never uses. */
export function InstancedFurniture({ items }: { items: PlacedFurnitureItem[] }) {
  // Items with a real external asset (ExternalFurnitureMesh) can't go through the per-part
  // InstancedMesh scheme below - a loaded glTF scene graph isn't a flat list of box/cylinder
  // descriptors. They're few per room in practice, so rendering them individually (one clone each,
  // same technique WalkCharacter uses for its glTF) costs nothing that matters.
  const [externalItems, proceduralItems] = useMemo(() => {
    const ext: PlacedFurnitureItem[] = [];
    const proc: PlacedFurnitureItem[] = [];
    for (const item of items) (EXTERNAL_FURNITURE_ASSETS[item.catalogId] ? ext : proc).push(item);
    return [ext, proc];
  }, [items]);

  const groups = useMemo(() => {
    const map = new Map<string, PartGroup>();
    for (const item of proceduralItems) {
      const catalogItem = getCatalogItem(item.catalogId);
      const parts = getFurnitureParts(catalogItem);
      parts.forEach((part, partIndex) => {
        const key = `${item.catalogId}__${partIndex}`;
        let group = map.get(key);
        if (!group) {
          group = { key, part, entries: [] };
          map.set(key, group);
        }
        group.entries.push(item);
      });
    }
    return Array.from(map.values());
  }, [proceduralItems]);

  return (
    <>
      {groups.map((group) => (
        <InstancedPart key={group.key} group={group} />
      ))}
      {externalItems.map((item) => (
        <ExternalFurnitureInstance key={item.instanceId} item={item} />
      ))}
    </>
  );
}

function ExternalFurnitureInstance({ item }: { item: PlacedFurnitureItem }) {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    groupRef.current?.traverse((child) => {
      if ("isMesh" in child && child.isMesh) {
        (child as THREE.Mesh).castShadow = true;
        (child as THREE.Mesh).receiveShadow = true;
      }
    });
  });

  return (
    <group ref={groupRef} position={item.position} rotation={[0, (item.rotationY * Math.PI) / 180, 0]} scale={item.scale}>
      <ExternalFurnitureMesh asset={EXTERNAL_FURNITURE_ASSETS[item.catalogId]} />
    </group>
  );
}

const UP_AXIS = new THREE.Vector3(0, 1, 0);

function InstancedPart({ group }: { group: PartGroup }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const quat = new THREE.Quaternion();
    const localOffset = new THREE.Vector3();
    const worldPos = new THREE.Vector3();

    group.entries.forEach((item, i) => {
      const rotY = (item.rotationY * Math.PI) / 180;
      const scale = item.scale;
      quat.setFromAxisAngle(UP_AXIS, rotY);
      localOffset.set(group.part.position[0], group.part.position[1], group.part.position[2]);
      localOffset.multiplyScalar(scale).applyQuaternion(quat);
      worldPos.set(item.position[0], item.position[1], item.position[2]).add(localOffset);
      matrix.compose(worldPos, quat, new THREE.Vector3(scale, scale, scale));
      mesh.setMatrixAt(i, matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }, [group]);

  const { part } = group;
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, group.entries.length]}>
      {part.shape === "box" ? (
        <boxGeometry args={part.args as [number, number, number]} />
      ) : (
        <cylinderGeometry args={part.args as [number, number, number, number]} />
      )}
      <meshStandardMaterial color={part.color} transparent={part.transparent} opacity={part.opacity ?? 1} />
    </instancedMesh>
  );
}
