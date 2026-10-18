import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import { overviewCameraView } from "../../lib/floorPlanGeometry";
import { buildWallColliders } from "../../lib/wallColliders";
import { WALL_THICKNESS } from "../../lib/roomGeometry";
import { SceneContents } from "./SceneContents";
import { Hotspot } from "./Hotspot";
import { RoomNav } from "./RoomNav";
import { CameraRig } from "./CameraRig";
import { WalkCameraRig } from "./WalkCameraRig";
import { CharacterSelect } from "./CharacterSelect";
import { VirtualJoystick } from "./VirtualJoystick";
import { ItemToolbar } from "../organize/ItemToolbar";
import { CatalogPanel } from "../organize/CatalogPanel";
import { Watermark } from "../floorplan/Watermark";
import { useLayoutStore } from "../../store/layoutStore";

export function Scene3DLive({ listing }: { listing: FloorPlanScene }) {
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const stageWrapRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mode = useLayoutStore((s) => s.mode);
  const items = useLayoutStore((s) => s.items);
  const setMode = useLayoutStore((s) => s.setMode);
  const resetLayout = useLayoutStore((s) => s.resetLayout);
  const characterId = useLayoutStore((s) => s.characterId);
  const firstPerson = useLayoutStore((s) => s.firstPerson);
  const setFirstPerson = useLayoutStore((s) => s.setFirstPerson);
  const walkRearranging = useLayoutStore((s) => s.walkRearranging);
  const setWalkRearranging = useLayoutStore((s) => s.setWalkRearranging);
  const visitedRoomIds = useLayoutStore((s) => s.visitedRoomIds);

  const { defaultPos, defaultTarget } = useMemo(() => {
    const { cameraPos, target } = overviewCameraView(listing.rooms);
    return { defaultPos: cameraPos, defaultTarget: target };
  }, [listing]);

  const wallColliders = useMemo(
    () => buildWallColliders(listing.rooms, listing.openings, WALL_THICKNESS),
    [listing],
  );

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === stageWrapRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  async function toggleFullscreen() {
    const el = stageWrapRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await el.requestFullscreen();
      }
    } catch {
      // Fullscreen can be denied (e.g. embedded iframe without allow="fullscreen") - the walkthrough
      // still works at normal size, just without the immersive full-viewport mode.
    }
  }

  return (
    <div className="sh-scene-live">
      <div className="sh-scene-live__toolbar">
        <button
          type="button"
          className="sh-scene-btn"
          onClick={() => setMode(mode === "organize" ? "view" : "organize")}
          disabled={mode === "walk"}
        >
          {mode === "organize" ? "✓ Done arranging" : "✏ Try your own furniture layout"}
        </button>
        {mode === "organize" && (
          <button type="button" className="sh-scene-btn sh-scene-btn--ghost" onClick={resetLayout}>
            Reset to owner's layout
          </button>
        )}
        <button
          type="button"
          className="sh-scene-btn sh-scene-btn--ghost"
          onClick={() => setMode(mode === "walk" ? "view" : "walk")}
          disabled={mode === "organize"}
        >
          {mode === "walk" ? "✓ Exit walkthrough" : "🚶 Walk through"}
        </button>
      </div>

      <div className="sh-scene-live__stage">
        {mode === "organize" && <CatalogPanel listing={listing} />}
        <div ref={stageWrapRef} className={`sh-scene-live__canvas-wrap${isFullscreen ? " sh-scene-live__canvas-wrap--fullscreen" : ""}`}>
          <Canvas
            gl={{ preserveDrawingBuffer: true }}
            shadows="soft"
            onCreated={(state) => {
              canvasElRef.current = state.gl.domElement;
            }}
            camera={{ position: defaultPos, fov: 45 }}
          >
            <color attach="background" args={["#EEF2F6"]} />
            {mode === "walk" ? (
              <WalkCameraRig colliders={wallColliders} firstPerson={firstPerson} />
            ) : (
              <CameraRig listing={listing} defaultPos={defaultPos} defaultTarget={defaultTarget} />
            )}
            <SceneContents
              listing={listing}
              items={items}
              interactive={mode === "organize"}
              walking={mode === "walk"}
              characterId={characterId}
              wallColliders={wallColliders}
              walkRearranging={walkRearranging}
            />
            {mode === "view" &&
              listing.hotspots.map((hs) => {
                const room = listing.rooms.find((r) => r.id === hs.roomId);
                return room ? <Hotspot key={hs.id} hotspot={hs} room={room} /> : null;
              })}
            {(mode === "organize" || (mode === "walk" && walkRearranging)) && <ItemToolbar />}
          </Canvas>
          <Watermark />
          {mode === "view" && <RoomNav listing={listing} />}
          {mode === "walk" && (
            <>
              <div className="sh-room-progress">
                {listing.rooms.map((room) => (
                  <span
                    key={room.id}
                    className={`sh-room-progress__pill${visitedRoomIds.includes(room.id) ? " sh-room-progress__pill--visited" : ""}`}
                  >
                    {visitedRoomIds.includes(room.id) ? "✓ " : ""}
                    {room.label}
                  </span>
                ))}
              </div>
              <div className="sh-walk-controls">
                <CharacterSelect />
                <button type="button" className="sh-scene-btn sh-scene-btn--ghost" onClick={() => setFirstPerson(!firstPerson)}>
                  {firstPerson ? "Switch to third-person" : "Switch to first-person"}
                </button>
                <button
                  type="button"
                  className={`sh-scene-btn sh-scene-btn--ghost${walkRearranging ? " sh-scene-btn--active" : ""}`}
                  onClick={() => setWalkRearranging(!walkRearranging)}
                >
                  {walkRearranging ? "✓ Done rearranging" : "🛋 Rearrange furniture"}
                </button>
                <button type="button" className="sh-scene-btn sh-scene-btn--ghost" onClick={toggleFullscreen}>
                  {isFullscreen ? "⤡ Exit fullscreen" : "⛶ Fullscreen"}
                </button>
              </div>
              <div className="sh-walk-hint">
                {walkRearranging
                  ? "Click a piece of furniture and drag to move it · click again to rotate/delete"
                  : "WASD / arrows or the stick to move · drag mouse to look around"}
              </div>
              {!walkRearranging && <VirtualJoystick />}
            </>
          )}
        </div>
      </div>
      {mode === "organize" && (
        <p className="sh-scene-live__hint">
          Click an item on the left to add it, drag placed items on the floor to reposition them, and use the floating controls to rotate or delete the selected piece. Your changes are saved
          only in this browser.
        </p>
      )}
    </div>
  );
}
