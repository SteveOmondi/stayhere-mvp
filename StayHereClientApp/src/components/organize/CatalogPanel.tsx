import { useState } from "react";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import type { FurnitureCategory } from "../../types/furniture";
import { getFurnitureCatalog } from "../../lib/furnitureCatalogClient";
import { polygonCentroid } from "../../lib/floorPlanGeometry";
import { useLayoutStore } from "../../store/layoutStore";

const CATEGORY_LABEL: Record<FurnitureCategory, string> = {
  bedroom: "Bedroom",
  living: "Living Room",
  dining: "Dining",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
};

export function CatalogPanel({ listing }: { listing: FloorPlanScene }) {
  const [roomId, setRoomId] = useState(listing.rooms[0].id);
  const addItem = useLayoutStore((s) => s.addItem);

  const available = getFurnitureCatalog().filter((c) => listing.allowedCatalogIds.includes(c.id));
  const byCategory = available.reduce<Record<string, typeof available>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});

  const handleAdd = (catalogId: string) => {
    const room = listing.rooms.find((r) => r.id === roomId) ?? listing.rooms[0];
    const [cx, cz] = polygonCentroid(room.points);
    addItem(catalogId, room.id, [cx, 0, cz]);
  };

  return (
    <div className="sh-catalog-panel">
      <h4>Add furniture</h4>
      <label className="sh-catalog-room-select">
        Room
        <select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
          {listing.rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      {Object.entries(byCategory).map(([category, catItems]) => (
        <div key={category} className="sh-catalog-group">
          <div className="sh-catalog-group__title">{CATEGORY_LABEL[category as FurnitureCategory]}</div>
          <div className="sh-catalog-group__items">
            {catItems.map((item) => (
              <button key={item.id} type="button" className="sh-catalog-item" onClick={() => handleAdd(item.id)} title={`Add ${item.name} to ${listing.rooms.find((r) => r.id === roomId)?.label}`}>
                <span className="sh-catalog-item__icon">{item.icon}</span>
                <span>{item.name}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
