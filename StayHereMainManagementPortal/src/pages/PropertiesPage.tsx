import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, propertiesApi } from "../lib/api";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";
import { IcoBuilding, IcoPlus, IcoListing, IcoEdit, IcoMapPin, IcoChevronRight } from "../components/icons";

type Row = Record<string, unknown>;

export function PropertiesPage() {
  const [searchParams] = useSearchParams();
  const urlOwner = searchParams.get("ownerId")?.trim() ?? "";
  const { toast, reloadKey, config } = usePortal();
  const scopedOwner = urlOwner || effectiveOwnerId(config);
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        if (!scopedOwner) { if (!c) { setRows([]); setTotal(0); } return; }
        const data = await propertiesApi.byOwner(scopedOwner, page, 20);
        const p = asPaginated<Row>(data);
        if (c) return;
        if (p) { setRows(p.items); setTotal(p.totalCount); }
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load properties", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [page, scopedOwner, reloadKey, toast]);

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#3b82f618" }}>
              <IcoBuilding size={17} style={{ color: "#3b82f6" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Properties</h2>
          </div>
          <p className="text-sm text-brand-500">
            {scopedOwner
              ? urlOwner ? `URL filter — owner ${scopedOwner.slice(0, 8)}…` : "Buildings for the active owner scope."
              : "Select a property owner in the sidebar to load their buildings."}
            {total > 0 && ` · ${total} properties`}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {urlOwner && (
            <Link to="/properties" className="btn-ghost text-sm border border-black/10">
              Clear filter
            </Link>
          )}
          <Link to="/listings/new-from-property" className="btn-secondary text-sm">
            <IcoListing size={14} /> New Listing
          </Link>
          <Link to="/properties/new" className="btn-primary text-sm">
            <IcoPlus size={14} /> New Property
          </Link>
        </div>
      </div>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-28">
        <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1600&q=75"
          alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(12,18,34,0.85), rgba(12,18,34,0.4))" }} />
        <div className="absolute inset-0 flex items-center px-7 gap-10">
          {[
            { label: "Buildings",        value: total || "—" },
            { label: "Active owner",     value: scopedOwner ? scopedOwner.slice(0, 8) + "…" : "None" },
            { label: "Mutations use",    value: "X-User-Id" },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xl font-display font-bold text-brand-goldlight">{s.value}</div>
              <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-semibold text-brand-900">Building Registry</h3>
          <span className="badge badge-neutral">{rows.length} loaded</span>
        </div>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Building</th>
                <th>Code</th>
                <th>Location</th>
                <th>Units / Floors</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full" /></td>
                  ))}</tr>
                ))
              ) : !scopedOwner ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <IcoBuilding size={32} className="mx-auto mb-2 text-brand-200" />
                    <div className="text-brand-400">Select a property owner in the sidebar</div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <IcoBuilding size={32} className="mx-auto mb-2 text-brand-200" />
                    <div className="text-brand-400">No properties for this owner yet</div>
                    <div className="mt-3">
                      <Link to="/properties/new" className="btn-primary text-sm">
                        <IcoPlus size={14} /> Add First Property
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={String(r.id)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                        <div className="w-full h-full flex items-center justify-center">
                          <IcoBuilding size={18} className="text-brand-400" />
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-brand-900">{String(r.buildingName ?? "Unnamed")}</div>
                        {r.description ? (
                          <div className="text-[10px] text-brand-400 line-clamp-1">{String(r.description)}</div>
                        ) : null}
                      </div>
                    </div>
                  </td>
                  <td>
                    <code className="text-[11px] bg-slate-100 px-2 py-0.5 rounded font-mono text-brand-700">
                      {String(r.propertyCode ?? "—")}
                    </code>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-brand-700 text-xs">
                      <IcoMapPin size={12} className="text-brand-400" />
                      {[r.suburb, r.city].filter(Boolean).map(v => String(v)).join(", ") || "—"}
                    </div>
                  </td>
                  <td className="text-sm">
                    {r.totalUnits || r.floors ? (
                      <span className="text-brand-700">
                        {r.totalUnits ? `${String(r.totalUnits)} units` : ""}
                        {(r.totalUnits && r.floors) ? " · " : ""}
                        {r.floors ? `${String(r.floors)} floors` : ""}
                      </span>
                    ) : <span className="text-brand-300">—</span>}
                  </td>
                  <td className="font-mono text-[10px] text-brand-400">{String(r.id ?? "").slice(0, 12)}…</td>
                  <td>
                    <div className="flex gap-1">
                      <Link to={`/properties/${String(r.id)}/edit`} className="btn-icon hover:bg-blue-50 hover:text-blue-600">
                        <IcoEdit size={13} />
                      </Link>
                      <Link to={`/listings?propertyId=${String(r.id)}`} className="btn-ghost text-xs gap-1 text-brand-gold">
                        Listings <IcoChevronRight size={11} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {total > 0 && (
          <div className="px-5 py-3 border-t border-black/[0.06] text-xs text-brand-500">
            Showing {rows.length} of {total} properties
          </div>
        )}
      </div>
    </div>
  );
}
