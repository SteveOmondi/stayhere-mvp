import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { PlacedFurnitureItem, FurnitureCatalogItem } from "../../types/furniture";
import { getCatalogItem } from "../../lib/furnitureCatalogClient";
import { walkRuntime } from "../../lib/walkRuntime";

const PROXIMITY_RADIUS = 1.8; // meters - character must be this close (XZ distance) for a label to show
const PROXIMITY_RADIUS_SQ = PROXIMITY_RADIUS * PROXIMITY_RADIUS;

/** Walk-mode-only vendor showcase: display/affiliate labels only (brand, price, outbound link) -
 * no cart, inventory or payment, per the approved plan's scope decision. Reuses Hotspot.tsx's
 * <Html> billboard pattern. Only items whose catalog entry has vendor data (see
 * FurnitureCatalogService.cs) ever render a label; everything else in the scene is unaffected. */
export function VendorShowcase({ items }: { items: PlacedFurnitureItem[] }) {
  return (
    <>
      {items.map((item) => {
        const catalogItem = getCatalogItem(item.catalogId);
        if (!catalogItem.vendorName) return null;
        return <VendorLabel key={item.instanceId} item={item} catalogItem={catalogItem} />;
      })}
    </>
  );
}

function VendorLabel({ item, catalogItem }: { item: PlacedFurnitureItem; catalogItem: FurnitureCatalogItem }) {
  const [visible, setVisible] = useState(false);
  const wasVisibleRef = useRef(false);

  useFrame(() => {
    const dx = walkRuntime.characterPosition.x - item.position[0];
    const dz = walkRuntime.characterPosition.z - item.position[2];
    const near = dx * dx + dz * dz <= PROXIMITY_RADIUS_SQ;
    if (near !== wasVisibleRef.current) {
      wasVisibleRef.current = near;
      setVisible(near);
    }
  });

  if (!visible) return null;

  const labelY = item.position[1] + catalogItem.height * item.scale + 0.35;

  return (
    // No distanceFactor: that scales the label by (distanceFactor / cameraDistance), which blows
    // up to fill the whole screen once the walk-mode camera gets close (exactly what proximity
    // triggers this label in the first place) - a real bug, not a feel issue. Fixed CSS-pixel size
    // instead, like a game HUD marker, so it stays a small compact badge at any distance.
    <Html position={[item.position[0], labelY, item.position[2]]} center occlude={false}>
      <a
        className="sh-vendor-label"
        href={catalogItem.productUrl ?? undefined}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          if (!catalogItem.productUrl) e.preventDefault();
        }}
      >
        <strong>{catalogItem.name}</strong>
        <span>{catalogItem.vendorName}</span>
        {catalogItem.price != null && (
          <span className="sh-vendor-label__price">
            {catalogItem.currency ?? ""} {catalogItem.price.toLocaleString()}
          </span>
        )}
      </a>
    </Html>
  );
}
