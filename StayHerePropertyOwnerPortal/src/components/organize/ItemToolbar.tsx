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
    <Html position={above} center distanceFactor={8}>
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
