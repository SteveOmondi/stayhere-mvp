import { useEffect, useState } from "react";
import { customersApi, ApiError } from "../lib/api";
import { useOwner } from "../context/OwnerContext";
import { IcoUser, IcoMail, IcoPhone, IcoShield, IcoDocument, IcoSearch, IcoEye, IcoX, IcoRefresh } from "../components/icons";

type Tenant = { id: string; email: string; firstName: string; lastName: string; phone?: string; accountStatus?: string; kycStatus?: string };

function mapTenant(x: unknown): Tenant | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return { id: String(r.id), email: String(r.email ?? ""), firstName: String(r.firstName ?? ""), lastName: String(r.lastName ?? ""), phone: r.phone ? String(r.phone) : undefined, accountStatus: r.accountStatus ? String(r.accountStatus) : undefined, kycStatus: r.kycStatus ? String(r.kycStatus) : undefined };
}

type DocRow = { id: string; name: string; url?: string; type?: string; status?: string };
function mapDoc(x: unknown): DocRow {
  const r = (x ?? {}) as Record<string, unknown>;
  return { id: String(r.id ?? Math.random()), name: String(r.fileName ?? r.documentName ?? r.name ?? "Document"), url: r.url ? String(r.url) : undefined, type: r.documentType ? String(r.documentType) : undefined, status: r.status ? String(r.status) : undefined };
}

export function TenantsPage() {
  const { toast, reloadKey, userId } = useOwner();
  const [tenants, setTenants]  = useState<Tenant[]>([]);
  const [loading, setLoading]  = useState(true);
  const [search, setSearch]    = useState("");
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [docs, setDocs]        = useState<DocRow[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await customersApi.byOwner(userId);
      setTenants(Array.isArray(data) ? (data as unknown[]).map(mapTenant).filter(Boolean) as Tenant[] : []);
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed to load tenants", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reloadKey, userId]);

  async function viewTenant(t: Tenant) {
    setSelected(t); setDocs([]); setDocsLoading(true);
    try {
      const data = await customersApi.documents(t.id);
      setDocs(Array.isArray(data) ? data.map(mapDoc) : []);
    } catch { setDocs([]); }
    finally { setDocsLoading(false); }
  }

  function kycBadge(status?: string) {
    if (!status) return <span className="badge badge-neutral">Unknown</span>;
    const s = status.toLowerCase();
    if (s.includes("verif")) return <span className="badge badge-success"><IcoShield size={9}/>Verified</span>;
    if (s.includes("pend"))  return <span className="badge badge-warning"><IcoShield size={9}/>Pending</span>;
    if (s.includes("reject")) return <span className="badge badge-error"><IcoShield size={9}/>Rejected</span>;
    return <span className="badge badge-neutral">{status}</span>;
  }

  function statusBadge(status?: string) {
    if (!status) return null;
    const s = status.toLowerCase();
    if (s.includes("active")) return <span className="badge badge-success">{status}</span>;
    if (s.includes("inact") || s.includes("suspend")) return <span className="badge badge-error">{status}</span>;
    return <span className="badge badge-neutral">{status}</span>;
  }

  const filtered = tenants.filter(t =>
    !search || [t.email, t.firstName, t.lastName, t.phone ?? ""].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl text-brand-900">Tenants</h2>
          <p className="text-sm text-brand-500 mt-1">{tenants.length} registered renters</p>
        </div>
        <button onClick={() => void load()} className="btn-secondary text-sm"><IcoRefresh size={14}/>Refresh</button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tenants", val: tenants.length, color: "#8b5cf6" },
          { label: "KYC Verified",  val: tenants.filter(t => t.kycStatus?.toLowerCase().includes("verif")).length, color: "#10b981" },
          { label: "KYC Pending",   val: tenants.filter(t => t.kycStatus?.toLowerCase().includes("pend")).length, color: "#f59e0b" },
        ].map(s => (
          <div key={s.label} className="card p-4 flex items-center gap-3 animate-slide-up">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0" style={{ background: `${s.color}15` }}>
              <IcoUser size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div className="text-2xl font-display font-bold text-brand-900">{s.val}</div>
              <div className="text-xs text-brand-500">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <IcoSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400"/>
        <input className="input pl-10" placeholder="Search by name, email or phone…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-black/[0.06]">
          <h3 className="font-semibold text-brand-900">Tenant Directory</h3>
          <span className="badge badge-neutral">{filtered.length} showing</span>
        </div>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead><tr><th>Tenant</th><th>Email</th><th>Phone</th><th>Account</th><th>KYC</th><th></th></tr></thead>
            <tbody>
              {loading ? Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:6}).map((_,j)=><td key={j}><div className="skeleton h-4 w-full"/></td>)}</tr>)
              : filtered.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-16">
                  <IcoUser size={32} className="mx-auto mb-2 text-brand-200"/>
                  <div className="text-brand-400">{search ? "No matching tenants" : "No tenants yet"}</div>
                </td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{background:"linear-gradient(135deg,#c4b5fd,#8b5cf6)"}}>
                        {(t.firstName || t.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-900 text-sm">{[t.firstName, t.lastName].filter(Boolean).join(" ") || "—"}</div>
                        <div className="text-[10px] text-brand-400 font-mono">{t.id.slice(0,12)}…</div>
                      </div>
                    </div>
                  </td>
                  <td><div className="flex items-center gap-1.5 text-brand-700 text-xs"><IcoMail size={11} className="text-brand-400"/>{t.email || "—"}</div></td>
                  <td>{t.phone ? <div className="flex items-center gap-1.5 text-brand-700 text-xs"><IcoPhone size={11} className="text-brand-400"/>{t.phone}</div> : <span className="text-brand-300">—</span>}</td>
                  <td>{statusBadge(t.accountStatus)}</td>
                  <td>{kycBadge(t.kycStatus)}</td>
                  <td>
                    <button onClick={() => void viewTenant(t)} className="btn-ghost text-xs text-brand-teal gap-1">
                      <IcoEye size={12}/>View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tenant detail drawer */}
      {selected && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setSelected(null);}}>
          <div className="modal-box max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{background:"linear-gradient(135deg,#c4b5fd,#8b5cf6)"}}>
                  {(selected.firstName || selected.email).charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-display text-lg text-brand-900">{[selected.firstName, selected.lastName].filter(Boolean).join(" ") || selected.email}</div>
                  <div className="text-xs text-brand-500">{selected.email}</div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Email",    val: selected.email, icon: <IcoMail size={13}/> },
                  { label: "Phone",    val: selected.phone ?? "—", icon: <IcoPhone size={13}/> },
                  { label: "Account",  val: selected.accountStatus ?? "—", icon: <IcoUser size={13}/> },
                  { label: "KYC",      val: selected.kycStatus ?? "—", icon: <IcoShield size={13}/> },
                ].map(row => (
                  <div key={row.label} className="card p-3">
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-400 uppercase tracking-wide mb-1">{row.icon}{row.label}</div>
                    <div className="text-sm font-semibold text-brand-900 truncate">{row.val}</div>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="font-semibold text-brand-900 mb-3 flex items-center gap-2"><IcoDocument size={15}/>KYC Documents</h4>
                {docsLoading ? (
                  <div className="space-y-2">{Array.from({length:2}).map((_,i)=><div key={i} className="skeleton h-12 rounded-xl"/>)}</div>
                ) : docs.length === 0 ? (
                  <div className="text-center py-6 text-sm text-brand-400 border border-dashed border-brand-200 rounded-xl">No documents uploaded yet</div>
                ) : (
                  <div className="space-y-2">
                    {docs.map(d => (
                      <div key={d.id} className="flex items-center gap-3 p-3 card">
                        <IcoDocument size={15} className="text-brand-teal shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-brand-900 truncate">{d.name}</div>
                          {d.type && <div className="text-[10px] text-brand-400">{d.type}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          {d.status && <span className={`badge text-[10px] ${d.status.toLowerCase().includes("approv") ? "badge-success" : d.status.toLowerCase().includes("pend") ? "badge-warning" : "badge-neutral"}`}>{d.status}</span>}
                          {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="btn-ghost text-xs text-brand-teal py-1">View</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
