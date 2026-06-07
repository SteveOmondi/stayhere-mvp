import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, ownersApi } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";
import { IcoOwners, IcoPlus, IcoX, IcoCheck, IcoLoader, IcoChevronRight, IcoMail, IcoPhone, IcoWallet } from "../components/icons";

type OwnerRow = { id: string; fullName: string; phone: string; email: string; walletBalance?: number };

function mapOwner(o: unknown): OwnerRow | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = r.id as string | undefined;
  if (!id) return null;
  return {
    id,
    fullName: String(r.fullName ?? ""),
    phone:    String(r.phone ?? ""),
    email:    String(r.email ?? ""),
    walletBalance: typeof r.walletBalance === "number" ? r.walletBalance : undefined,
  };
}

const PAGE_SIZE = 15;

export function OwnersPage() {
  const { reloadKey, toast, bumpReload, setConfig } = usePortal();
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ fullName: "", phone: "", email: "", userId: "" });

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await ownersApi.list(page, PAGE_SIZE);
        const p = asPaginated<unknown>(data);
        if (c) return;
        if (p) { setRows(p.items.map(mapOwner).filter(Boolean) as OwnerRow[]); setTotal(p.totalCount); }
        else if (Array.isArray(data)) { setRows(data.map(mapOwner).filter(Boolean) as OwnerRow[]); setTotal(data.length); }
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load owners", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [page, reloadKey, toast]);

  async function createOwner(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };
      if (form.userId.trim()) body.userId = form.userId.trim();
      const created = await ownersApi.create(body) as Record<string, unknown>;
      setModal(false);
      setForm({ fullName: "", phone: "", email: "", userId: "" });
      toast("Property owner created successfully.", "success");
      const scopeId = String(created?.userId ?? created?.id ?? "");
      if (scopeId) setConfig({ defaultOwnerUserId: scopeId });
      bumpReload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Create failed", "error");
    } finally {
      setSaving(false);
    }
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#c9a22718" }}>
              <IcoOwners size={17} style={{ color: "#c9a227" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Property Owners</h2>
          </div>
          <p className="text-sm text-brand-500">
            Universal owner directory · <strong>{total}</strong> registered
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary">
          <IcoPlus size={15} /> New Property Owner
        </button>
      </div>

      {/* Hero image */}
      <div className="relative rounded-2xl overflow-hidden h-28">
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=75"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(12,18,34,0.85) 0%, rgba(12,18,34,0.4) 100%)" }} />
        <div className="absolute inset-0 flex items-center px-7 gap-10">
          {[
            { label: "Total Owners",     value: total || "–" },
            { label: "Active this month", value: "—"         },
            { label: "Avg wallet balance","value": "—"       },
          ].map(s => (
            <div key={s.label}>
              <div className="text-2xl font-display font-bold text-brand-goldlight">{s.value}</div>
              <div className="text-xs text-white/60 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Table card */}
      <div className="portal-card overflow-hidden">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-semibold text-brand-900">Owner Directory</h3>
          <span className="badge badge-neutral">{rows.length} showing</span>
        </div>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Owner</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Wallet Balance</th>
                <th>ID</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-brand-400">
                    <IcoOwners size={32} className="mx-auto mb-2 text-brand-200" />
                    No property owners yet. Create one to begin.
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full text-[11px] font-bold flex items-center justify-center shrink-0 text-brand-950"
                        style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)" }}>
                        {(r.fullName || r.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-900">{r.fullName || "—"}</div>
                        <div className="text-[10px] text-brand-400 font-mono truncate max-w-[120px]">{r.id.slice(0, 14)}…</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-brand-700">
                      <IcoPhone size={12} className="text-brand-400" />{r.phone || "—"}
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-brand-700">
                      <IcoMail size={12} className="text-brand-400" />{r.email || "—"}
                    </div>
                  </td>
                  <td>
                    {r.walletBalance != null ? (
                      <div className="flex items-center gap-1.5 font-semibold text-brand-900">
                        <IcoWallet size={13} className="text-brand-gold" />
                        KES {r.walletBalance.toLocaleString()}
                      </div>
                    ) : <span className="text-brand-300">—</span>}
                  </td>
                  <td className="font-mono text-[11px] text-brand-400">{r.id.slice(0, 8)}…</td>
                  <td>
                    <Link
                      to={`/owners/${r.id}`}
                      className="btn-ghost text-xs text-brand-gold gap-1"
                    >
                      Manage <IcoChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > PAGE_SIZE && (
          <div className="px-5 py-4 border-t border-black/[0.06] flex items-center justify-between">
            <div className="text-xs text-brand-500">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-secondary text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-xs text-brand-700 font-medium">
                {page} / {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-secondary text-xs px-3 py-1.5 rounded-lg disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(false); }}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div>
                <h3 className="font-display text-xl text-brand-900">New Property Owner</h3>
                <p className="text-xs text-brand-500 mt-0.5">Will be auto-set as the active owner scope</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-icon"><IcoX size={16} /></button>
            </div>

            <form onSubmit={createOwner} className="p-6 space-y-4">
              <div className="portal-field">
                <label className="portal-label">Full Name <span className="text-red-500">*</span></label>
                <input required className="portal-input" placeholder="e.g. James Mwangi"
                  value={form.fullName}
                  onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="portal-field">
                  <label className="portal-label">Phone <span className="text-red-500">*</span></label>
                  <input required className="portal-input" placeholder="+254 700 000000"
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div className="portal-field">
                  <label className="portal-label">Email <span className="text-red-500">*</span></label>
                  <input required type="email" className="portal-input" placeholder="owner@email.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div className="portal-field">
                <label className="portal-label">Auth User ID <span className="text-brand-400 font-normal normal-case">(optional)</span></label>
                <input className="portal-input font-mono text-xs" placeholder="Link to StayHere user GUID"
                  value={form.userId}
                  onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15} /> : <IcoCheck size={15} />}
                  {saving ? "Creating…" : "Create Owner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
