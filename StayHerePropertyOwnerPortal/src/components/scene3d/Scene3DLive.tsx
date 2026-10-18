import { useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import { overviewCameraView } from "../../lib/floorPlanGeometry";
import { SceneContents } from "./SceneContents";
import { Hotspot } from "./Hotspot";
import { RoomNav } from "./RoomNav";
import { CameraRig } from "./CameraRig";
import { ItemToolbar } from "../organize/ItemToolbar";
import { CatalogPanel } from "../organize/CatalogPanel";
import { Watermark } from "../floorplan/Watermark";
import { useLayoutStore } from "../../store/layoutStore";

export function Scene3DLive({ listing }: { listing: FloorPlanScene }) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const mode = useLayoutStore((s) => s.mode);
  const items = useLayoutStore((s) => s.items);
  const setMode = useLayoutStore((s) => s.setMode);
  const resetLayout = useLayoutStore((s) => s.resetLayout);

  const { defaultPos, defaultTarget } = useMemo(() => {
    const { cameraPos, target } = overviewCameraView(listing.rooms);
    return { defaultPos: cameraPos, defaultTarget: target };
  }, [listing]);

  return (
    <div className="sh-scene-live">
      <div className="sh-scene-live__toolbar">
        <button type="button" className={`btn-secondary text-sm ${mode === "organize" ? "" : ""}`} onClick={() => setMode(mode === "organize" ? "view" : "organize")}>
          {mode === "organize" ? "✓ Done organizing" : "✏ Organize furniture"}
        </button>
        {mode === "organize" && (
          <button type="button" className="btn-ghost text-sm" onClick={resetLayout}>
            Reset layout
          </button>
        )}
      </div>

      <div className="sh-scene-live__stage">
        {mode === "organize" && <CatalogPanel listing={listing} />}
        <div className="sh-scene-live__canvas-wrap">
          <Canvas
            gl={{ preserveDrawingBuffer: true }}
            shadows
            onCreated={(state) => {
              canvasElRef.current = state.gl.domElement;
            }}
            camera={{ position: defaultPos, fov: 45 }}
          >
            <color attach="background" args={["#EEF2F6"]} />
            <CameraRig listing={listing} defaultPos={defaultPos} defaultTarget={defaultTarget} />
            <SceneContents listing={listing} items={items} interactive={mode === "organize"} />
            {mode === "view" &&
              listing.hotspots.map((hs) => {
                const room = listing.rooms.find((r) => r.id === hs.roomId);
                return room ? <Hotspot key={hs.id} hotspot={hs} room={room} /> : null;
              })}
            {mode === "organize" && <ItemToolbar />}
          </Canvas>
          <Watermark />
          {mode === "view" && <RoomNav listing={listing} />}
        </div>
      </div>
      {mode === "organize" && (
        <p className="sh-scene-live__hint">Click an item on the left to add it, drag placed items on the floor to reposition them, and use the floating controls to rotate or delete the selected piece.</p>
      )}
    </div>
  );
}
