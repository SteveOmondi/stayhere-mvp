import { useState } from "react";
import { aiApi, uploadApi, uploadToR2, ApiError } from "../lib/api";
import {
  estimateMetersPerPixel, parseStatedSizeToSqm, findNearestEdge, polygonArea,
  type RoomPolygon, type WallOpening, type Hotspot, type FloorPlanScene, type ScaleSource,
} from "../lib/floorPlanGeometry";
import { loadFurnitureCatalog } from "../lib/furnitureCatalogClient";
import { autoSeedFromRooms, type SeededDefaultItem } from "../lib/autoSeed";
import { useLayoutStore } from "../store/layoutStore";
import { FloorPlanTabs } from "./floorplan/FloorPlanTabs";
import { IcoX, IcoLoader, IcoAI, IcoTrash, IcoCheck } from "./icons";
import { useOwner } from "../context/OwnerContext";

export type FloorPlanPayload = {
  rooms: RoomPolygon[];
  openings: WallOpening[];
  metersPerPixel: number;
  sourceFileKey: string;
  sourceFileType: string;
  digitizedAt: string;
  digitizedByRole: string;
  aiProvider?: string;
  hotspots: Hotspot[];
  allowedCatalogIds: string[];
  defaultLayout: SeededDefaultItem[];
};

export type FloorPlanEditorModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: (floorPlan: FloorPlanPayload) => void;
  /** The listing's own known size (converted to sqm) — the most reliable scale source. */
  statedSizeSqm?: number;
  /** Used only for the 2D SVG's aria-label / the 3D preview scene's title. */
  listingTitle?: string;
};

type Status = "pickFile" | "preview" | "detecting" | "review" | "loadingCatalog" | "organize" | "error" | "uploading";

const MIN_ROOM_AREA_SQM = 1;
const DEFAULT_DOOR_WIDTH_M = 0.9;
const DEFAULT_WINDOW_WIDTH_M = 1.2;
const DISPLAY_MAX_WIDTH = 640;

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

const SCALE_SOURCE_LABEL: Record<ScaleSource, string> = {
  "stated-size": "Scale derived from this listing's stated size — should be accurate.",
  "ai-estimate": "Scale estimated by AI from standard door/window/room reference sizes — double-check room proportions.",
  fallback: "No size information was available, so a generic apartment-scale fallback was used — room sizes may be off.",
};

/**
 * Upload a floor plan → let AI trace rooms/doors/windows/scale → review → save.
 * Mirrors a proven prototype flow (d:/Projects/PropertyModelsSimulation) — "AI drafts, owner
 * confirms": nothing here reaches the Listing until the owner clicks Save.
 */
export function FloorPlanEditorModal({ open, onClose, onSaved, statedSizeSqm, listingTitle }: FloorPlanEditorModalProps) {
  const { toast } = useOwner();
  const [status, setStatus] = useState<Status>("pickFile");
  const [file, setFile] = useState<File | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [imgSize, setImgSize] = useState<{ width: number; height: number } | null>(null);
  const [rooms, setRooms] = useState<RoomPolygon[]>([]);
  const [openings, setOpenings] = useState<WallOpening[]>([]);
  const [metersPerPixel, setMetersPerPixel] = useState<number | null>(null);
  const [scaleSource, setScaleSource] = useState<ScaleSource | null>(null);
  const [scene, setScene] = useState<FloorPlanScene | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setStatus("pickFile");
    setFile(null);
    setObjectUrl(null);
    setImgSize(null);
    setRooms([]);
    setOpenings([]);
    setMetersPerPixel(null);
    setScaleSource(null);
    setScene(null);
    setError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChosen(f: File) {
    setFile(f);
    setObjectUrl(URL.createObjectURL(f));
    setStatus("preview");
  }

  async function runDetection() {
    if (!file || !imgSize) return;
    setStatus("detecting");
    setError(null);
    try {
      const result = await aiApi.analyzeFloorPlan(file);

      const roomsFraction = result.rooms.filter(r => r.points.length >= 3);
      if (roomsFraction.length === 0) {
        setStatus("error");
        setError("The AI could not detect any usable rooms in this image. Try a clearer photo/scan, then retry.");
        return;
      }

      const parsedStatedSqm = parseStatedSizeToSqm(result.overallStatedSize);
      const { metersPerPixel: mpp, source } = estimateMetersPerPixel({
        imageWidthPx: imgSize.width,
        imageHeightPx: imgSize.height,
        roomsFraction,
        statedSizeSqm: statedSizeSqm ?? parsedStatedSqm,
        estimatedTotalWidthMeters: result.estimatedTotalWidthMeters,
      });

      const newRooms: RoomPolygon[] = [];
      for (const r of roomsFraction) {
        const points: [number, number][] = r.points.map(([xf, yf]) => [xf * imgSize.width * mpp, yf * imgSize.height * mpp]);
        if (polygonArea(points) < MIN_ROOM_AREA_SQM) continue;
        newRooms.push({ id: nextId("room"), label: r.label, points });
      }

      if (newRooms.length === 0) {
        setStatus("error");
        setError("The AI could not detect any usable rooms in this image. Try a clearer photo/scan, then retry.");
        return;
      }

      const newOpenings: WallOpening[] = [];
      for (const o of result.openings) {
        const point: [number, number] = [o.point[0] * imgSize.width * mpp, o.point[1] * imgSize.height * mpp];
        const candidate = findNearestEdge(newRooms, point);
        if (!candidate) continue;
        newOpenings.push({
          id: nextId("opening"),
          from: candidate.from,
          to: candidate.to,
          position: candidate.position,
          widthMeters: o.type === "door" ? DEFAULT_DOOR_WIDTH_M : DEFAULT_WINDOW_WIDTH_M,
          type: o.type,
        });
      }

      setRooms(newRooms);
      setOpenings(newOpenings);
      setMetersPerPixel(mpp);
      setScaleSource(source);
      setStatus("review");
    } catch (err) {
      setStatus("error");
      setError(err instanceof ApiError ? err.message : "AI detection failed.");
    }
  }

  async function proceedToOrganize() {
    setStatus("loadingCatalog");
    try {
      await loadFurnitureCatalog();
      const seed = autoSeedFromRooms(rooms);
      const nextScene: FloorPlanScene = {
        title: listingTitle ?? "This listing",
        rooms,
        openings,
        hotspots: seed.hotspots,
        allowedCatalogIds: seed.allowedCatalogIds,
        defaultLayout: seed.defaultLayout,
      };
      setScene(nextScene);
      useLayoutStore.getState().loadListing(nextScene);
      useLayoutStore.getState().setMode("organize");
      setStatus("organize");
    } catch (err) {
      setStatus("review");
      toast(err instanceof ApiError ? err.message : "Could not load the furniture catalog", "error");
    }
  }

  async function handlePublish() {
    if (!file || metersPerPixel === null || !scene) return;
    setStatus("uploading");
    try {
      const contentType = file.type || "image/png";
      const { uploadUrl, fileKey, publicUrl, contentType: signedCt } =
        await uploadApi.getPresignedUrl("properties/floor-plans", file.name, contentType);
      await uploadToR2(uploadUrl, file, signedCt);

      const items = useLayoutStore.getState().items;
      onSaved({
        rooms,
        openings,
        metersPerPixel,
        sourceFileKey: fileKey || publicUrl,
        sourceFileType: contentType,
        digitizedAt: new Date().toISOString(),
        digitizedByRole: "owner",
        aiProvider: "gemini",
        hotspots: scene.hotspots,
        allowedCatalogIds: scene.allowedCatalogIds,
        defaultLayout: items.map(it => ({ catalogId: it.catalogId, roomId: it.roomId, position: it.position, rotationY: it.rotationY })),
      });
      toast("Floor plan added — remember to save the listing.", "success");
      reset();
      onClose();
    } catch (err) {
      setStatus("organize");
      toast(err instanceof ApiError ? err.message : "Could not upload the floor plan image", "error");
    }
  }

  if (!open) return null;

  const displayWidth = imgSize ? Math.min(DISPLAY_MAX_WIDTH, imgSize.width) : DISPLAY_MAX_WIDTH;
  const displayScale = imgSize ? displayWidth / imgSize.width : 1;
  const displayHeight = imgSize ? imgSize.height * displayScale : 0;

  const toDisplay = (meterPoint: [number, number]): [number, number] => {
    if (!metersPerPixel) return [0, 0];
    return [(meterPoint[0] / metersPerPixel) * displayScale, (meterPoint[1] / metersPerPixel) * displayScale];
  };

  const totalSqm = rooms.reduce((sum, r) => sum + polygonArea(r.points), 0);

  return (
    <div className="modal-bg" style={{ zIndex: 70 }} onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className="modal-box max-w-2xl w-full">
        <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
          <h3 className="font-display text-xl text-brand-900">Floor Plan</h3>
          <button onClick={handleClose} className="btn-icon shrink-0"><IcoX size={16} /></button>
        </div>

        <div className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
          {status === "pickFile" && (
            <label className="flex flex-col items-center justify-center gap-2 p-10 rounded-xl border-2 border-dashed border-brand-teal/30 cursor-pointer hover:border-brand-teal/60 transition">
              <IcoAI size={28} className="text-brand-teal" />
              <span className="text-sm text-brand-700 font-medium">Choose a floor plan image</span>
              <span className="text-xs text-brand-400">JPG or PNG — AI will trace rooms, doors &amp; windows</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFileChosen(f); }}
              />
            </label>
          )}

          {(status === "preview" || status === "detecting") && objectUrl && (
            <>
              <p className="text-xs text-brand-500">
                Review the uploaded image below, then let AI trace every room and find every door and window it can
                see — including estimating the real-world scale, so there's no manual calibration step.
              </p>
              <div style={{ width: displayWidth, height: displayHeight || undefined }} className="relative">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img
                  src={objectUrl}
                  width={displayWidth}
                  onLoad={e => setImgSize({ width: e.currentTarget.naturalWidth, height: e.currentTarget.naturalHeight })}
                  className="rounded-lg border border-black/[0.08] block"
                />
              </div>
              <button
                type="button"
                className="btn-primary text-sm"
                disabled={status === "detecting" || !imgSize}
                onClick={runDetection}
              >
                {status === "detecting" ? (
                  <span className="flex items-center gap-2"><IcoLoader size={16} className="animate-spin" />Analyzing floor plan…</span>
                ) : (
                  <span className="flex items-center gap-2"><IcoAI size={16} />Detect rooms, doors &amp; windows</span>
                )}
              </button>
            </>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-sm text-red-500">{error}</p>
              <button type="button" className="btn-secondary text-sm" onClick={runDetection}>Retry AI detection</button>
            </div>
          )}

          {status === "review" && objectUrl && imgSize && (
            <>
              {scaleSource && <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">{SCALE_SOURCE_LABEL[scaleSource]}</p>}

              <div style={{ width: displayWidth, height: displayHeight }} className="relative">
                {/* eslint-disable-next-line jsx-a11y/alt-text */}
                <img src={objectUrl} width={displayWidth} className="rounded-lg border border-black/[0.08] block" />
                <svg width={displayWidth} height={displayHeight} className="absolute top-0 left-0 pointer-events-none">
                  {rooms.map(room => (
                    <polygon
                      key={room.id}
                      points={room.points.map(p => toDisplay(p).join(",")).join(" ")}
                      fill="rgba(13,148,136,0.15)"
                      stroke="#0d9488"
                      strokeWidth={2}
                    />
                  ))}
                  {openings.map(o => {
                    const mid: [number, number] = [
                      o.from[0] + (o.to[0] - o.from[0]) * o.position,
                      o.from[1] + (o.to[1] - o.from[1]) * o.position,
                    ];
                    const [x, y] = toDisplay(mid);
                    return <circle key={o.id} cx={x} cy={y} r={6} fill={o.type === "door" ? "#8A6D4E" : "#3B82F6"} stroke="white" strokeWidth={1.5} />;
                  })}
                </svg>
              </div>

              <div>
                <h4 className="field-label mb-2">Detected rooms ({totalSqm.toFixed(1)} sqm total)</h4>
                <ul className="space-y-1.5">
                  {rooms.map(room => (
                    <li key={room.id} className="flex items-center justify-between text-xs">
                      <span>{room.label} — {polygonArea(room.points).toFixed(1)} sqm</span>
                      <button type="button" className="btn-icon" onClick={() => setRooms(prev => prev.filter(r => r.id !== room.id))}>
                        <IcoTrash size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="field-label mb-2">
                  Detected doors &amp; windows ({openings.filter(o => o.type === "door").length} door,{" "}
                  {openings.filter(o => o.type === "window").length} window)
                </h4>
                {openings.length === 0 ? (
                  <p className="text-xs text-brand-400">No doors or windows were detected. You can still save — try re-running detection for a clearer image.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {openings.map(o => (
                      <li key={o.id} className="flex items-center justify-between text-xs">
                        <span>{o.type === "door" ? "🚪 Door" : "🪟 Window"}</span>
                        <button type="button" className="btn-icon" onClick={() => setOpenings(prev => prev.filter(x => x.id !== o.id))}>
                          <IcoTrash size={13} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary text-sm" onClick={runDetection}>
                  Re-run AI detection
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm flex items-center gap-2"
                  disabled={rooms.length === 0}
                  onClick={proceedToOrganize}
                >
                  <IcoCheck size={16} />Continue to organize furniture
                </button>
              </div>
            </>
          )}

          {status === "loadingCatalog" && (
            <p className="text-sm text-brand-500 flex items-center gap-2">
              <IcoLoader size={16} className="animate-spin" />Loading furniture catalog…
            </p>
          )}

          {status === "organize" && scene && (
            <>
              <p className="text-xs text-brand-500">
                We've placed some starter furniture based on each room's label. Add, drag, rotate, or delete pieces
                until it looks right — or preview the 2D/3D views — then publish.
              </p>
              <FloorPlanTabs listing={scene} />
              <div className="flex gap-2 pt-2">
                <button type="button" className="btn-secondary text-sm" onClick={() => setStatus("review")}>
                  Back to review
                </button>
                <button
                  type="button"
                  className="btn-primary text-sm flex items-center gap-2"
                  onClick={handlePublish}
                >
                  <IcoCheck size={16} />Publish floor plan
                </button>
              </div>
            </>
          )}

          {status === "uploading" && (
            <p className="text-sm text-brand-500 flex items-center gap-2">
              <IcoLoader size={16} className="animate-spin" />Saving floor plan…
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
