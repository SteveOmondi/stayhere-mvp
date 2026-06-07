import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, ownersApi } from "../lib/api";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import { usePortal } from "../context/PortalContext";
import type { PortalOwnerEntry } from "../context/PortalContext";
import { IcoAgents, IcoPhone, IcoMail, IcoSearch } from "../components/icons";

type FlatRow = {
  id: string; name: string; phone: string; email: string;
  kind: "Agent" | "Caretaker"; ownerId: string; ownerName: string;
};

export function AgentsCaretakersPage() {
  const { toast, reloadKey, config, ownerDirectory } = usePortal();
  const [rows, setRows] = useState<FlatRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const scope = effectiveOwnerId(config);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        let owners: PortalOwnerEntry[] = scope
          ? ownerDirectory.filter(x => x.id === scope)
          : [...ownerDirectory];
        if (scope && owners.length === 0)
          owners = [{ id: scope, userId: scope, fullName: "Selected owner", email: "", phone: "" }];
        const flat: FlatRow[] = [];
        await Promise.all(owners.map(async o => {
          try {
            const [ag, ct] = await Promise.all([ownersApi.agents(o.id), ownersApi.caretakers(o.id)]);
            if (cancelled) return;
            (Array.isArray(ag) ? ag : []).forEach(a => {
              const x = a as Record<string, unknown>;
              flat.push({ id: String(x.id), name: String(x.fullName ?? ""), phone: String(x.phone ?? ""),
                email: String(x.email ?? ""), kind: "Agent", ownerId: o.id, ownerName: o.fullName });
            });
            (Array.isArray(ct) ? ct : []).forEach(a => {
              const x = a as Record<string, unknown>;
              flat.push({ id: String(x.id), name: String(x.fullName ?? ""), phone: String(x.phone ?? ""),
                email: String(x.email ?? ""), kind: "Caretaker", ownerId: o.id, ownerName: o.fullName });
            });
          } catch { /* skip owner on partial failure */ }
        }));
        if (!cancelled) setRows(flat.sort((a, b) => a.name.localeCompare(b.name)));
      } catch (e) {
        if (!cancelled) toast(e instanceof ApiError ? e.message : "Failed to build directory", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [reloadKey, toast, scope, ownerDirectory]);

  const agents = rows.filter(r => r.kind === "Agent");
  const caretakers = rows.filter(r => r.kind === "Caretaker");

  const filtered = rows.filter(r =>
    !search || [r.name, r.phone, r.email, r.ownerName].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#10b98118" }}>
              <IcoAgents size={17} style={{ color: "#10b981" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Agents & Caretakers</h2>
          </div>
          <p className="text-sm text-brand-500">
            {scope ? "Staff for the active owner scope." : "All staff across all owners."}{" "}
            Create from an <Link className="text-brand-gold font-semibold hover:underline" to="/owners">owner page</Link>,
            then assign via <Link className="text-brand-gold font-semibold hover:underline" to="/listings">Listings</Link>.
          </p>
        </div>
      </div>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-28">
        <img src="https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?auto=format&fit=crop&w=1600&q=75"
          alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0" style={{ background: "rgba(12,18,34,0.7)" }} />
        <div className="absolute inset-0 flex items-center px-7 gap-10">
          {[
            { label: "Total Agents",     value: agents.length     },
            { label: "Total Caretakers", value: caretakers.length },
            { label: "Total Staff",      value: rows.length       },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-display font-bold text-brand-goldlight">{s.value}</div>
              <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <IcoSearch size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400" />
        <input className="portal-input pl-10" placeholder="Search staff by name, phone or owner…"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-semibold text-brand-900">Staff Directory</h3>
          <div className="flex gap-2">
            <span className="badge badge-gold">{agents.length} Agents</span>
            <span className="badge badge-neutral">{caretakers.length} Caretakers</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Staff Member</th>
                <th>Role</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Property Owner</th>
                <th>ID</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full" /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <IcoAgents size={32} className="mx-auto mb-2 text-brand-200" />
                    <div className="text-brand-400">
                      {search ? "No matching staff" : "No agents or caretakers found"}
                    </div>
                    {!search && (
                      <div className="text-xs text-brand-400 mt-1">
                        Create staff from an owner's detail page
                      </div>
                    )}
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={`${r.kind}-${r.id}`}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white`}
                        style={{ background: r.kind === "Agent" ? "linear-gradient(135deg, #fbbf24, #d97706)" : "linear-gradient(135deg, #6ee7b7, #059669)" }}>
                        {r.name.charAt(0) || "?"}
                      </div>
                      <span className="font-semibold text-brand-900">{r.name}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${r.kind === "Agent" ? "badge-gold" : "badge-success"}`}>
                      {r.kind}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-brand-700">
                      <IcoPhone size={12} className="text-brand-400" />{r.phone || "—"}
                    </div>
                  </td>
                  <td>
                    {r.email ? (
                      <div className="flex items-center gap-1.5 text-brand-700">
                        <IcoMail size={12} className="text-brand-400" />{r.email}
                      </div>
                    ) : <span className="text-brand-300">—</span>}
                  </td>
                  <td>
                    <Link className="text-brand-gold font-semibold hover:underline text-xs"
                      to={`/owners/${r.ownerId}`}>{r.ownerName}
                    </Link>
                  </td>
                  <td className="font-mono text-[10px] text-brand-400">{r.id.slice(0, 14)}…</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
