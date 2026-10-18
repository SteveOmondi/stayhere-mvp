import { Html } from "@react-three/drei";
import type { Hotspot as HotspotType, RoomPolygon } from "../../lib/floorPlanGeometry";
import { useLayoutStore } from "../../store/layoutStore";
import { polygonCentroid } from "../../lib/floorPlanGeometry";

export function Hotspot({ hotspot, room }: { hotspot: HotspotType; room: RoomPolygon }) {
  const setActiveHotspot = useLayoutStore((s) => s.setActiveHotspot);
  const activeHotspotId = useLayoutStore((s) => s.activeHotspotId);
  const isActive = activeHotspotId === hotspot.id;
  const [cx, cz] = polygonCentroid(room.points);

  return (
    <Html position={[cx, 0.9, cz]} center distanceFactor={8} occlude={false}>
      <div className="sh-hotspot-group">
        <button type="button" className={`sh-hotspot${isActive ? " sh-hotspot--active" : ""}`} onClick={() => setActiveHotspot(hotspot.id)} title={hotspot.label}>
          {hotspot.order}
        </button>
        {isActive && <span className="sh-hotspot-label">{hotspot.label}</span>}
      </div>
    </Html>
  );
}
