import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, ownersApi } from "../lib/api";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import { usePortal } from "../context/PortalContext";
import type { PortalOwnerEntry } from "../context/PortalContext";

type FlatRow = {
  id: string;
  name: string;
  phone: string;
  email: string;
  kind: "Agent" | "Caretaker";
  ownerId: string;
  ownerName: string;
};

export function AgentsCaretakersPage() {
  const { toast, reloadKey, config, ownerDirectory } = usePortal();
  const [rows, setRows] = useState<FlatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const scope = effectiveOwnerId(config);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (cancelled) return;
        let owners: PortalOwnerEntry[] = scope
          ? ownerDirectory.filter((x) => x.id === scope)
          : [...ownerDirectory];
        if (scope && owners.length === 0) {
          owners = [{ id: scope, fullName: "Selected owner", email: "", phone: "" }];
        }
        const flat: FlatRow[] = [];
        await Promise.all(
          owners.map(async (o) => {
            const oid = o.id;
            const oname = o.fullName;
            try {
              const [ag, ct] = await Promise.all([
                ownersApi.agents(oid),
                ownersApi.caretakers(oid),
              ]);
              if (cancelled) return;
              (Array.isArray(ag) ? ag : []).forEach((a) => {
                const x = a as Record<string, unknown>;
                flat.push({
                  id: String(x.id),
                  name: String(x.fullName ?? ""),
                  phone: String(x.phone ?? ""),
                  email: String(x.email ?? ""),
                  kind: "Agent",
                  ownerId: oid,
                  ownerName: oname,
                });
              });
              (Array.isArray(ct) ? ct : []).forEach((a) => {
                const x = a as Record<string, unknown>;
                flat.push({
                  id: String(x.id),
                  name: String(x.fullName ?? ""),
                  phone: String(x.phone ?? ""),
                  email: String(x.email ?? ""),
                  kind: "Caretaker",
                  ownerId: oid,
                  ownerName: oname,
                });
              });
            } catch {
              /* skip owner on partial failure */
            }
          })
        );
        if (!cancelled) setRows(flat.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        if (!cancelled)
          toast(e instanceof ApiError ? e.message : "Failed to build directory", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, toast, scope, ownerDirectory]);

  return (
    <div>
      <h2 className="font-display text-2xl text-brand-950 mb-2">Agents &amp; caretakers</h2>
      <p className="text-sm text-brand-700 mb-6 max-w-3xl">
        {scope
          ? "Agents and caretakers for the active property owner only."
          : "All agents and caretakers across owners (from the portal directory, up to 500 owners). Select an owner in the header to narrow."}{" "}
        Create new staff from an{" "}
        <Link className="text-brand-gold font-semibold hover:underline" to="/owners">
          owner&apos;s detail page
        </Link>
        , then use <Link className="text-brand-gold font-semibold hover:underline" to="/listings">Listings</Link>{" "}
        to link them to units.
      </p>

      <div
        className="h-36 rounded-2xl mb-8 bg-cover bg-center relative overflow-hidden"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1400&q=80)",
        }}
      >
        <div className="absolute inset-0 bg-brand-950/60" />
        <p className="relative z-10 text-white text-sm p-6 max-w-xl">
          Professional field teams and building caretakers — IDs shown for assignment into listings.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-brand-950 text-brand-cream/90 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Role</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Phone</th>
              <th className="px-3 py-2 text-left">Employing owner</th>
              <th className="px-3 py-2 text-left font-mono">Id</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-brand-600">
                  Loading directory…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-brand-600">
                  No agents or caretakers found (or no owners yet).
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={`${r.kind}-${r.id}`}>
                  <td className="px-3 py-2">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        r.kind === "Agent"
                          ? "bg-amber-100 text-amber-900"
                          : "bg-slate-200 text-slate-800"
                      }`}
                    >
                      {r.kind}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.phone}</td>
                  <td className="px-3 py-2">
                    <Link className="text-brand-gold hover:underline" to={`/owners/${r.ownerId}`}>
                      {r.ownerName}
                    </Link>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{r.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
