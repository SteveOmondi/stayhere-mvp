import { Html } from "@react-three/drei";
import { useLayoutStore } from "../../store/layoutStore";
import { getCatalogItem } from "../../lib/furnitureCatalogClient";

export function ItemToolbar() {
  const selectedId = useLayoutStore((s) => s.selectedId);
  const items = useLayoutStore((s) => s.items);
  const rotateItem = useLayoutStore((s) => s.rotateItem);
  const deleteItem = useLayoutStore((s) => s.deleteItem);
  const selectItem = useLayoutStore((s) => s.selectItem);

  const selected = items.find((i) => i.instanceId === selectedId);
  if (!selected) return null;
  const catalogItem = getCatalogItem(selected.catalogId);
  const above: [number, number, number] = [selected.position[0], catalogItem.height + 0.5, selected.position[2]];

  return (
    // No distanceFactor - see VendorShowcase.tsx for why: it scales inversely with camera
    // distance, which blows up once a camera gets close (walk mode's organizer sub-mode can be
    // right next to the selected item). Fixed CSS-pixel size instead.
    <Html position={above} center>
      <div className="sh-item-toolbar">
        <button type="button" onClick={() => rotateItem(selected.instanceId, -15)} title="Rotate left">
          ⟲
        </button>
        <button type="button" onClick={() => rotateItem(selected.instanceId, 15)} title="Rotate right">
          ⟳
        </button>
        <button type="button" className="danger" onClick={() => deleteItem(selected.instanceId)} title="Delete">
          🗑
        </button>
        <button type="button" onClick={() => selectItem(null)} title="Deselect">
          ✕
        </button>
      </div>
    </Html>
  );
}
