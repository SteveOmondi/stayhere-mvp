import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import { useLayoutStore } from "../../store/layoutStore";

export function RoomNav({ listing }: { listing: FloorPlanScene }) {
  const activeHotspotId = useLayoutStore((s) => s.activeHotspotId);
  const setActiveHotspot = useLayoutStore((s) => s.setActiveHotspot);

  const hotspots = [...listing.hotspots].sort((a, b) => a.order - b.order);
  const activeIndex = hotspots.findIndex((h) => h.id === activeHotspotId);
  const current = activeIndex >= 0 ? hotspots[activeIndex] : null;

  const step = (dir: 1 | -1) => {
    if (hotspots.length === 0) return;
    const nextIndex = activeIndex < 0 ? (dir === 1 ? 0 : hotspots.length - 1) : (activeIndex + dir + hotspots.length) % hotspots.length;
    setActiveHotspot(hotspots[nextIndex].id);
  };

  return (
    <div className="sh-room-nav">
      <button type="button" onClick={() => step(-1)} aria-label="Previous room">
        ◀
      </button>
      <span className="sh-room-nav__label">{current ? current.label : "Overview"}</span>
      <button type="button" onClick={() => step(1)} aria-label="Next room">
        ▶
      </button>
    </div>
  );
}
