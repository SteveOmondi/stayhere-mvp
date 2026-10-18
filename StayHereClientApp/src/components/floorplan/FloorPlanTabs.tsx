import { useState } from "react";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import { useLayoutStore } from "../../store/layoutStore";
import { FloorPlan2D } from "./FloorPlan2D";
import { FloorPlan3DImage } from "./FloorPlan3DImage";
import { Scene3DLive } from "../scene3d/Scene3DLive";

type Tab = "3d-live" | "3d-image" | "2d-image";

const TABS: { id: Tab; label: string }[] = [
  { id: "3d-live", label: "3D LIVE" },
  { id: "3d-image", label: "3D IMAGE" },
  { id: "2d-image", label: "2D IMAGE" },
];

export function FloorPlanTabs({ listing }: { listing: FloorPlanScene }) {
  const [tab, setTab] = useState<Tab>("3d-live");
  const items = useLayoutStore((s) => s.items);

  return (
    <div className="sh-floorplan-widget">
      <div className="sh-tabs">
        {TABS.map((t) => (
          <button key={t.id} type="button" className={`sh-tab${tab === t.id ? " sh-tab--active" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="sh-floorplan-widget__body">
        {tab === "3d-live" && <Scene3DLive listing={listing} />}
        {tab === "3d-image" && <FloorPlan3DImage listing={listing} items={items} />}
        {tab === "2d-image" && <FloorPlan2D listing={listing} />}
      </div>
    </div>
  );
}
