import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, propertiesApi } from "../lib/api";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";

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
        if (!scopedOwner) {
          if (!c) {
            setRows([]);
            setTotal(0);
          }
          return;
        }
        const data = await propertiesApi.byOwner(scopedOwner, page, 20);
        const p = asPaginated<Row>(data);
        if (c) return;
        if (p) {
          setRows(p.items);
          setTotal(p.totalCount);
        }
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load properties", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [page, scopedOwner, reloadKey, toast]);

  return (
    <div>
      <div className="flex flex-wrap justify-between gap-4 mb-6">
        <div>
          <h2 className="font-display text-2xl text-brand-950">Properties</h2>
          <p className="text-sm text-brand-700 mt-1">
            {scopedOwner
              ? urlOwner
                ? `URL filter · owner ${scopedOwner.slice(0, 8)}…`
                : `Buildings for the owner selected in the header.`
              : "Choose a property owner in the bar above (or add ?ownerId= to the URL)."}
          </p>
        </div>
        <div className="flex gap-2">
          {urlOwner && (
            <Link to="/properties" className="text-sm py-2 px-3 rounded-lg border">
              Clear URL filter
            </Link>
          )}
          <Link
            to="/listings/new-from-property"
            className="text-sm py-2 px-4 rounded-xl border border-brand-950 text-brand-950 font-semibold"
          >
            + Listing from property
          </Link>
          <Link
            to="/properties/new"
            className="text-sm py-2 px-4 rounded-xl bg-brand-950 text-brand-goldlight font-semibold"
          >
            + New property
          </Link>
        </div>
      </div>

      <div
        className="h-32 rounded-2xl mb-6 bg-cover bg-center relative overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80)",
        }}
      >
        <div className="absolute inset-0 bg-brand-950/55" />
        <p className="relative z-10 text-white text-sm p-6 max-w-xl">
          High-rise and garden-style stock — each row links to edit. Mutations use{" "}
          <strong>X-User-Id</strong> from the active owner above (same as Settings).
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-800/10">
        <table className="w-full text-sm">
          <thead className="bg-brand-950 text-brand-cream/90 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Code</th>
              <th className="px-3 py-2 text-left">Building</th>
              <th className="px-3 py-2 text-left">City</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-brand-600">
                  Loading…
                </td>
              </tr>
            ) : !scopedOwner ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-brand-600">
                  Select a property owner in the header to load their properties.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={String(r.id)} className="hover:bg-brand-cream/80">
                  <td className="px-3 py-2 font-mono text-xs">{String(r.propertyCode ?? "")}</td>
                  <td className="px-3 py-2 font-medium">{String(r.buildingName ?? "")}</td>
                  <td className="px-3 py-2">{String(r.city ?? "")}</td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      to={`/properties/${String(r.id)}/edit`}
                      className="text-brand-gold font-semibold text-xs hover:underline"
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-brand-600 mt-2">Total: {total}</p>
    </div>
  );
}
