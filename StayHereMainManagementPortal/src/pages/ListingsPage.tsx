import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, listingsApi } from "../lib/api";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";

export function ListingsPage() {
  const { toast, config, reloadKey } = usePortal();
  const [filters, setFilters] = useState({
    city: "",
    suburb: "",
    minPrice: "",
    maxPrice: "",
    propertyType: "",
    listingType: "Rent",
  });
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [ownerRows, setOwnerRows] = useState<Record<string, unknown>[]>([]);
  const [ownerLoading, setOwnerLoading] = useState(false);
  const [assign, setAssign] = useState<{
    listingId: string;
    mode: "agent" | "caretaker";
  } | null>(null);
  const [agentBody, setAgentBody] = useState({
    agentId: "",
    agentName: "",
    agentPhone: "",
    agentEmail: "",
  });
  const [caretakerId, setCaretakerId] = useState("");

  const ownerId = effectiveOwnerId(config);

  useEffect(() => {
    if (!ownerId) {
      setOwnerRows([]);
      return;
    }
    let c = false;
    (async () => {
      setOwnerLoading(true);
      try {
        const data = await listingsApi.byOwner(ownerId, 1, 50);
        const p = asPaginated<Record<string, unknown>>(data);
        if (!c) setOwnerRows(p?.items ?? []);
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load owner listings", "error");
      } finally {
        if (!c) setOwnerLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [ownerId, reloadKey, toast]);

  async function search(e: FormEvent) {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = {
        city: filters.city || null,
        suburb: filters.suburb || null,
        minPrice: filters.minPrice ? Number(filters.minPrice) : null,
        maxPrice: filters.maxPrice ? Number(filters.maxPrice) : null,
        propertyType: filters.propertyType || null,
        listingType: filters.listingType || null,
        page: 1,
        pageSize: 30,
      };
      const data = await listingsApi.search(body);
      const p = asPaginated<Record<string, unknown>>(data);
      setRows(p?.items ?? []);
      toast(`Found ${p?.items.length ?? 0} listings`, "success");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Search failed", "error");
    }
  }

  async function submitAssign(e: FormEvent) {
    e.preventDefault();
    const oid = effectiveOwnerId(config);
    if (!oid || !assign) {
      toast("Select a property owner in the header (or Settings), then pick a listing.", "error");
      return;
    }
    try {
      if (assign.mode === "agent") {
        await listingsApi.assignAgent(
          assign.listingId,
          {
            agentId: agentBody.agentId,
            agentName: agentBody.agentName,
            agentPhone: agentBody.agentPhone,
            agentEmail: agentBody.agentEmail || undefined,
          },
          oid
        );
      } else {
        await listingsApi.assignCaretaker(
          assign.listingId,
          { caretakerId },
          oid
        );
      }
      toast("Assignment saved.", "success");
      setAssign(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Assignment failed", "error");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-start gap-4 mb-2">
        <h2 className="font-display text-2xl text-brand-950">Listings hub</h2>
        <Link
          to="/listings/new-from-property"
          className="text-sm py-2 px-4 rounded-xl bg-brand-950 text-brand-goldlight font-semibold shrink-0"
        >
          + New listing from property
        </Link>
      </div>
      <p className="text-sm text-brand-700 mb-6 max-w-3xl">
        The table below shows listings for the <strong>active property owner</strong> (header). Use search for a
        wider market slice. Agent/caretaker assignment uses the same owner for <code className="text-xs">X-User-Id</code>.
      </p>

      <div className="mb-8">
        <h3 className="text-sm font-bold text-brand-800 uppercase tracking-wide mb-2">Active owner&apos;s listings</h3>
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-brand-950 text-brand-cream/90 text-xs uppercase">
              <tr>
                <th className="px-2 py-2 text-left">Code</th>
                <th className="px-2 py-2 text-left">Title</th>
                <th className="px-2 py-2 text-left">City</th>
                <th className="px-2 py-2 text-left">Price</th>
                <th className="px-2 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {!ownerId ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-brand-600">
                    Select a property owner in the header to load their listings.
                  </td>
                </tr>
              ) : ownerLoading ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-brand-600">
                    Loading…
                  </td>
                </tr>
              ) : ownerRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-2 py-6 text-center text-brand-600">
                    No listings for this owner yet.
                  </td>
                </tr>
              ) : (
                ownerRows.map((r) => (
                  <tr key={`o-${String(r.id)}`}>
                    <td className="px-2 py-2 font-mono text-xs">{String(r.listingCode)}</td>
                    <td className="px-2 py-2">{String(r.title)}</td>
                    <td className="px-2 py-2">{String(r.city ?? "")}</td>
                    <td className="px-2 py-2">
                      {String(r.price)} {String(r.priceCurrency ?? "")}
                    </td>
                    <td className="px-2 py-2 text-right space-x-1">
                      <button
                        type="button"
                        className="text-xs text-brand-gold font-semibold"
                        onClick={() => setAssign({ listingId: String(r.id), mode: "agent" })}
                      >
                        Agent
                      </button>
                      <button
                        type="button"
                        className="text-xs text-brand-800 font-semibold"
                        onClick={() => setAssign({ listingId: String(r.id), mode: "caretaker" })}
                      >
                        Caretaker
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="text-sm font-bold text-brand-800 uppercase tracking-wide mb-2">Market search</h3>
      <form
        onSubmit={search}
        className="grid md:grid-cols-3 lg:grid-cols-6 gap-2 mb-8 p-4 rounded-xl border bg-white/60"
      >
        {(["city", "suburb", "minPrice", "maxPrice", "propertyType", "listingType"] as const).map(
          (k) => (
            <input
              key={k}
              placeholder={k}
              className="border rounded-lg px-2 py-2 text-sm"
              value={String(filters[k] ?? "")}
              onChange={(e) => setFilters((f) => ({ ...f, [k]: e.target.value }))}
            />
          )
        )}
        <button
          type="submit"
          className="md:col-span-3 lg:col-span-6 py-2 rounded-xl bg-brand-950 text-brand-goldlight text-sm font-semibold"
        >
          Search
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-brand-950 text-brand-cream/90 text-xs uppercase">
            <tr>
              <th className="px-2 py-2 text-left">Code</th>
              <th className="px-2 py-2 text-left">Title</th>
              <th className="px-2 py-2 text-left">City</th>
              <th className="px-2 py-2 text-left">Price</th>
              <th className="px-2 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-6 text-center text-brand-600">
                  Run a search to see results here.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
              <tr key={String(r.id)}>
                <td className="px-2 py-2 font-mono text-xs">{String(r.listingCode)}</td>
                <td className="px-2 py-2">{String(r.title)}</td>
                <td className="px-2 py-2">{String(r.city ?? "")}</td>
                <td className="px-2 py-2">
                  {String(r.price)} {String(r.priceCurrency ?? "")}
                </td>
                <td className="px-2 py-2 text-right space-x-1">
                  <button
                    type="button"
                    className="text-xs text-brand-gold font-semibold"
                    onClick={() =>
                      setAssign({ listingId: String(r.id), mode: "agent" })
                    }
                  >
                    Agent
                  </button>
                  <button
                    type="button"
                    className="text-xs text-brand-800 font-semibold"
                    onClick={() =>
                      setAssign({ listingId: String(r.id), mode: "caretaker" })
                    }
                  >
                    Caretaker
                  </button>
                </td>
              </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {assign && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={submitAssign}
            className="bg-white rounded-2xl max-w-md w-full p-6 border shadow-xl"
          >
            <h3 className="font-semibold mb-4">
              {assign.mode === "agent" ? "Assign agent" : "Assign caretaker"} · listing{" "}
              <code className="text-xs">{assign.listingId.slice(0, 8)}…</code>
            </h3>
            {assign.mode === "agent" ? (
              <div className="space-y-2">
                <input
                  required
                  placeholder="Agent id (GUID)"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={agentBody.agentId}
                  onChange={(e) => setAgentBody((b) => ({ ...b, agentId: e.target.value }))}
                />
                <input
                  required
                  placeholder="Display name"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={agentBody.agentName}
                  onChange={(e) => setAgentBody((b) => ({ ...b, agentName: e.target.value }))}
                />
                <input
                  required
                  placeholder="Phone"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={agentBody.agentPhone}
                  onChange={(e) => setAgentBody((b) => ({ ...b, agentPhone: e.target.value }))}
                />
                <input
                  placeholder="Email"
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={agentBody.agentEmail}
                  onChange={(e) => setAgentBody((b) => ({ ...b, agentEmail: e.target.value }))}
                />
              </div>
            ) : (
              <input
                required
                placeholder="Caretaker id (GUID)"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={caretakerId}
                onChange={(e) => setCaretakerId(e.target.value)}
              />
            )}
            <div className="flex gap-2 mt-4">
              <button type="button" className="flex-1 border rounded-xl py-2" onClick={() => setAssign(null)}>
                Cancel
              </button>
              <button type="submit" className="flex-1 bg-brand-950 text-brand-goldlight rounded-xl py-2 font-semibold">
                Save
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
