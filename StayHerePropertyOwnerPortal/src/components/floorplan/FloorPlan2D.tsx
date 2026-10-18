import type { FloorPlanScene } from "../../lib/floorPlanGeometry";
import { PX_PER_METER, polygonToSvgPoints, roomBounds, polygonCentroid } from "../../lib/floorPlanGeometry";
import { collectWallSegments } from "../../lib/roomGeometry";

const WALL_STROKE = 5;

export function FloorPlan2D({ listing }: { listing: FloorPlanScene }) {
  const bounds = roomBounds(listing.rooms);
  const pad = 30;
  const width = bounds.width * PX_PER_METER + pad * 2;
  const height = bounds.depth * PX_PER_METER + pad * 2;
  const walls = collectWallSegments(listing.rooms, listing.openings);

  const toSvg = (x: number, z: number): [number, number] => [(x - bounds.minX) * PX_PER_METER, (z - bounds.minZ) * PX_PER_METER];

  return (
    <div className="floorplan-2d">
      <svg viewBox={`${-pad} ${-pad} ${width} ${height}`} width={Math.min(width, 640)} height={Math.min(width, 640) * (height / width)} role="img" aria-label={`2D floor plan for ${listing.title}`}>
        <rect x={-pad} y={-pad} width={width} height={height} fill="#ffffff" />
        {listing.rooms.map((room) => {
          const pts = polygonToSvgPoints(room.points, bounds.minX, bounds.minZ);
          const [cx, cz] = polygonCentroid(room.points);
          const labelX = (cx - bounds.minX) * PX_PER_METER;
          const labelY = (cz - bounds.minZ) * PX_PER_METER;
          return (
            <g key={room.id}>
              <polygon points={pts} fill="#F8FAFC" stroke="none" />
              <text x={labelX} y={labelY} textAnchor="middle" fontSize={13} fontWeight={600} fill="#1E293B">
                {room.label.toUpperCase()}
              </text>
            </g>
          );
        })}
        {walls.map((seg) => {
          const [x1, z1] = seg.from;
          const [x2, z2] = seg.to;
          const dx = x2 - x1;
          const dz = z2 - z1;
          const length = Math.hypot(dx, dz);
          if (length <= 0) return null;
          const dirX = dx / length;
          const dirZ = dz / length;
          const perpX = -dirZ;
          const perpZ = dirX;

          return (
            <g key={seg.key}>
              {seg.pieces.map((piece, i) => {
                const [sx, sy] = toSvg(x1 + dirX * piece.start * length, z1 + dirZ * piece.start * length);
                const [ex, ey] = toSvg(x1 + dirX * piece.end * length, z1 + dirZ * piece.end * length);

                if (piece.type === "solid") {
                  return <line key={i} x1={sx} y1={sy} x2={ex} y2={ey} stroke="#0F172A" strokeWidth={WALL_STROKE} strokeLinecap="square" />;
                }

                if (piece.type === "window") {
                  const offsetPx = 3;
                  const perpOffX = perpX * offsetPx;
                  const perpOffY = perpZ * offsetPx;
                  return (
                    <g key={i}>
                      <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#3B82F6" strokeWidth={2} />
                      <line x1={sx + perpOffX} y1={sy + perpOffY} x2={ex + perpOffX} y2={ey + perpOffY} stroke="#3B82F6" strokeWidth={1.5} />
                      <line x1={sx - perpOffX} y1={sy - perpOffY} x2={ex - perpOffX} y2={ey - perpOffY} stroke="#3B82F6" strokeWidth={1.5} />
                    </g>
                  );
                }

                const doorLength = Math.hypot(ex - sx, ey - sy);
                const leafX = sx + perpX * doorLength;
                const leafY = sy + perpZ * doorLength;
                return (
                  <g key={i}>
                    <line x1={sx} y1={sy} x2={leafX} y2={leafY} stroke="#8A6D4E" strokeWidth={2} />
                    <path d={`M ${leafX} ${leafY} A ${doorLength} ${doorLength} 0 0 1 ${ex} ${ey}`} fill="none" stroke="#8A6D4E" strokeWidth={1} strokeDasharray="3 2" />
                  </g>
                );
              })}
            </g>
          );
        })}
        <g opacity={0.08} transform={`translate(${(width - pad * 2) / 2}, ${(height - pad * 2) / 2})`}>
          <circle r={60} fill="none" stroke="#FF6B4A" strokeWidth={14} />
          <circle r={30} fill="none" stroke="#FF6B4A" strokeWidth={10} />
        </g>
      </svg>
    </div>
  );
}
