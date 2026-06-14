import { useEffect, useState } from "react";
import { customersApi, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import { IcoOnboard, IcoUser, IcoDocument, IcoCheck, IcoX, IcoLoader, IcoSearch, IcoEye, IcoShield, IcoRefresh } from "../components/icons";

type Tenant = {
  id: string; firstName: string; lastName: string; email: string; phone?: string;
  accountStatus?: string; kycStatus?: string;
};
type Doc = { id: string; documentType?: string; documentUrl?: string; uploadedAt?: string; status?: string };

function mapTenant(x: unknown): Tenant | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return {
    id: String(r.id), firstName: String(r.firstName ?? ""), lastName: String(r.lastName ?? ""),
    email: String(r.email ?? ""), phone: r.phone ? String(r.phone) : undefined,
    accountStatus: r.accountStatus ? String(r.accountStatus) : undefined,
    kycStatus: r.kycStatus ? String(r.kycStatus) : undefined,
  };
}

function kycBadge(status?: string) {
  if (!status) return <span className="badge badge-neutral">Unknown</span>;
  if (status.toLowerCase() === "verified") return <span className="badge badge-success">Verified</span>;
  if (status.toLowerCase() === "pending") return <span className="badge badge-warning">Pending Review</span>;
  if (status.toLowerCase() === "rejected") return <span className="badge badge-error">Rejected</span>;
  return <span className="badge badge-neutral">{status}</span>;
}

export function OnboardingPage() {
  const { owner, toast } = useOwner();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [kycFilter, setKycFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [addDocForm, setAddDocForm] = useState({ documentType: "", documentUrl: "" });
  const [addingDoc, setAddingDoc] = useState(false);
  const [showAddDoc, setShowAddDoc] = useState(false);

  function load() {
    setLoading(true);
    customersApi.list()
      .then((data: any) => {
        const arr = Array.isArray(data) ? data : (asPaginated<unknown>(data)?.items ?? []);
        setTenants(arr.map(mapTenant).filter(Boolean) as Tenant[]);
      })
      .catch((e: any) => toast(e instanceof ApiError ? e.message : "Failed to load tenants", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { if (owner?.id) load(); }, [owner?.id]);

  function openTenant(t: Tenant) {
    setSelected(t);
    setDocs([]);
    setDocsLoading(true);
    customersApi.documents(t.id)
      .then(d => { const arr = Array.isArray(d) ? d : []; setDocs(arr as Doc[]); })
      .catch(() => setDocs([]))
      .finally(() => setDocsLoading(false));
  }

  async function handleAddDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setAddingDoc(true);
    try {
      await customersApi.addDocument(selected.id, { documentType: addDocForm.documentType, documentUrl: addDocForm.documentUrl });
      toast("Document added.", "success");
      setShowAddDoc(false);
      setAddDocForm({ documentType: "", documentUrl: "" });
      const d = await customersApi.documents(selected.id);
      setDocs(Array.isArray(d) ? d as Doc[] : []);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed to add document", "error");
    } finally { setAddingDoc(false); }
  }

  const filtered = tenants.filter(t => {
    const name = `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());
    const matchKyc = kycFilter === "all" || (t.kycStatus ?? "unknown").toLowerCase() === kycFilter;
    return matchSearch && matchKyc;
  });

  const stats = {
    total: tenants.length,
    verified: tenants.filter(t => t.kycStatus?.toLowerCase() === "verified").length,
    pending: tenants.filter(t => t.kycStatus?.toLowerCase() === "pending").length,
    unverified: tenants.filter(t => !t.kycStatus || t.kycStatus.toLowerCase() === "unknown").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-brand-950">Tenant Onboarding</h1>
          <p className="text-sm text-brand-500 mt-0.5">Manage KYC verification and tenant documents</p>
        </div>
        <button onClick={load} className="btn-secondary gap-2"><IcoRefresh size={15} /> Refresh</button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Tenants", value: stats.total, cls: "text-brand-950" },
          { label: "KYC Verified", value: stats.verified, cls: "text-emerald-600" },
          { label: "Pending Review", value: stats.pending, cls: "text-amber-600" },
          { label: "Not Submitted", value: stats.unverified, cls: "text-slate-500" },
        ].map(s => (
          <div key={s.label} className="stat-card animate-fade-in">
            <div className="text-xs text-brand-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className={`text-2xl font-bold ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[200px] bg-slate-50 border border-black/10 rounded-xl px-3 py-2">
          <IcoSearch size={14} className="text-brand-400 shrink-0" />
          <input className="bg-transparent outline-none text-sm flex-1 placeholder:text-brand-400" placeholder="Search tenants…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="select w-auto" value={kycFilter} onChange={e => setKycFilter(e.target.value)}>
          <option value="all">All KYC Status</option>
          <option value="verified">Verified</option>
          <option value="pending">Pending</option>
          <option value="rejected">Rejected</option>
          <option value="unknown">Not Submitted</option>
        </select>
      </div>

      {/* Tenants table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center"><IcoLoader size={24} className="text-teal-500 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <IcoOnboard size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-brand-500">No tenants found</p>
          </div>
        ) : (
          <table className="tbl">
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Contact</th>
                <th>KYC Status</th>
                <th>Account</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                        {t.firstName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-900">{t.firstName} {t.lastName}</div>
                        <div className="text-xs text-brand-400 font-mono">{t.id.slice(0, 8)}…</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="text-sm">{t.email}</div>
                    {t.phone && <div className="text-xs text-brand-400">{t.phone}</div>}
                  </td>
                  <td>{kycBadge(t.kycStatus)}</td>
                  <td><span className={`badge ${t.accountStatus?.toLowerCase() === "active" ? "badge-success" : "badge-neutral"}`}>{t.accountStatus ?? "Unknown"}</span></td>
                  <td>
                    <button onClick={() => openTenant(t)} className="btn-ghost gap-1.5 text-teal-700 hover:bg-teal-50">
                      <IcoEye size={14} /> View Docs
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Document drawer */}
      {selected && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal-box max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.07]">
              <div className="flex items-center gap-3">
                <IcoUser size={18} className="text-teal-600" />
                <div>
                  <h3 className="font-display text-lg text-brand-900">{selected.firstName} {selected.lastName}</h3>
                  <div className="text-xs text-brand-400">{selected.email}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-icon"><IcoX size={18} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <IcoDocument size={16} className="text-brand-500" />
                  <span className="text-sm font-semibold text-brand-800">Documents</span>
                </div>
                <div className="flex items-center gap-2">
                  {kycBadge(selected.kycStatus)}
                  <button onClick={() => setShowAddDoc(v => !v)} className="btn-ghost text-teal-700 hover:bg-teal-50 text-xs gap-1">
                    + Add Doc
                  </button>
                </div>
              </div>

              {showAddDoc && (
                <form onSubmit={handleAddDoc} className="p-4 rounded-xl border border-teal-200 bg-teal-50/30 space-y-3">
                  <div className="field">
                    <label className="field-label">Document Type</label>
                    <input required className="input" placeholder="e.g. National ID, Lease Agreement" value={addDocForm.documentType} onChange={e => setAddDocForm(f => ({ ...f, documentType: e.target.value }))} />
                  </div>
                  <div className="field">
                    <label className="field-label">Document URL</label>
                    <input required className="input" placeholder="https://…" value={addDocForm.documentUrl} onChange={e => setAddDocForm(f => ({ ...f, documentUrl: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowAddDoc(false)} className="btn-secondary flex-1 py-1.5 text-xs">Cancel</button>
                    <button type="submit" disabled={addingDoc} className="btn-teal flex-1 py-1.5 text-xs disabled:opacity-50">
                      {addingDoc ? <IcoLoader size={13} /> : <IcoCheck size={13} />}
                      {addingDoc ? "Saving…" : "Save"}
                    </button>
                  </div>
                </form>
              )}

              {docsLoading ? (
                <div className="py-6 flex justify-center"><IcoLoader size={20} className="text-teal-500 animate-spin" /></div>
              ) : docs.length === 0 ? (
                <div className="py-8 text-center">
                  <IcoDocument size={32} className="text-brand-300 mx-auto mb-2" />
                  <p className="text-sm text-brand-400">No documents uploaded yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docs.map(d => (
                    <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl border border-black/[0.07] hover:bg-slate-50 transition-colors">
                      <IcoDocument size={16} className="text-brand-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-brand-800 truncate">{d.documentType ?? "Document"}</div>
                        {d.uploadedAt && <div className="text-xs text-brand-400">{new Date(d.uploadedAt).toLocaleDateString()}</div>}
                      </div>
                      <div className="flex items-center gap-2">
                        {d.status && <span className={`badge ${d.status.toLowerCase() === "approved" ? "badge-success" : d.status.toLowerCase() === "rejected" ? "badge-error" : "badge-warning"}`}>{d.status}</span>}
                        {d.documentUrl && (
                          <a href={d.documentUrl} target="_blank" rel="noreferrer" className="btn-ghost p-1.5 text-teal-700 hover:bg-teal-50">
                            <IcoEye size={13} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2 border-t border-black/[0.07]">
                <div className="flex items-center gap-2 text-xs text-brand-400">
                  <IcoShield size={12} />
                  <span>KYC verification is managed by the admin team</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
