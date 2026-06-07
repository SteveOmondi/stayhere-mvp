import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, customersApi } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import { IcoCustomers, IcoChevronRight, IcoSearch, IcoMail, IcoPhone, IcoShield } from "../components/icons";

type CustomerRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  accountStatus?: string;
  kycStatus?: string;
};

function mapCustomer(r: unknown): CustomerRow | null {
  if (!r || typeof r !== "object") return null;
  const x = r as Record<string, unknown>;
  const id = x.id ?? x.customerId;
  if (!id) return null;
  return {
    id: String(id),
    email:         String(x.email ?? ""),
    firstName:     String(x.firstName ?? ""),
    lastName:      String(x.lastName ?? ""),
    phone:         x.phone ? String(x.phone) : undefined,
    accountStatus: x.accountStatus ? String(x.accountStatus) : undefined,
    kycStatus:     x.kycStatus ? String(x.kycStatus) : undefined,
  };
}

function statusBadge(status?: string) {
  if (!status) return <span className="badge badge-neutral">Unknown</span>;
  const s = status.toLowerCase();
  if (s.includes("active") || s.includes("verified"))
    return <span className="badge badge-success">{status}</span>;
  if (s.includes("pend") || s.includes("review"))
    return <span className="badge badge-warning">{status}</span>;
  if (s.includes("inactive") || s.includes("suspend"))
    return <span className="badge badge-error">{status}</span>;
  return <span className="badge badge-neutral">{status}</span>;
}

export function CustomersPage() {
  const { toast, reloadKey } = usePortal();
  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await customersApi.list();
        if (!c) setRows(Array.isArray(data) ? (data as unknown[]).map(mapCustomer).filter(Boolean) as CustomerRow[] : []);
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load customers", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [reloadKey, toast]);

  const filtered = rows.filter(r =>
    !search || [r.email, r.firstName, r.lastName, r.phone ?? ""].some(v =>
      v.toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#8b5cf618" }}>
              <IcoCustomers size={17} style={{ color: "#8b5cf6" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Customers</h2>
          </div>
          <p className="text-sm text-brand-500">
            Universal renter directory · <strong>{rows.length}</strong> registered
          </p>
        </div>
      </div>

      {/* Hero */}
      <div className="relative rounded-2xl overflow-hidden h-28">
        <img
          src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1600&q=75"
          alt="" className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(90deg, rgba(12,18,34,0.88), rgba(12,18,34,0.4))" }} />
        <div className="absolute inset-0 flex items-center px-7 gap-10">
          {[
            { label: "Total Renters", value: rows.length || "—" },
            { label: "Verified KYC",  value: rows.filter(r => r.kycStatus?.toLowerCase().includes("verif")).length || "—" },
            { label: "Pending KYC",   value: rows.filter(r => r.kycStatus?.toLowerCase().includes("pend")).length || "—" },
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
        <input
          className="portal-input pl-10"
          placeholder="Search by name, email or phone…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-semibold text-brand-900">Customer Directory</h3>
          <span className="badge badge-neutral">{filtered.length} {search ? "matching" : "total"}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Account Status</th>
                <th>KYC</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j}><div className="skeleton h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16">
                    <IcoCustomers size={32} className="mx-auto mb-2 text-brand-200" />
                    <div className="text-brand-400">
                      {search ? "No customers match your search" : "No customers yet"}
                    </div>
                  </td>
                </tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0"
                        style={{ background: "linear-gradient(135deg, #ede9fe, #8b5cf6)" , color: "#fff" }}>
                        {(r.firstName || r.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-900">
                          {[r.firstName, r.lastName].filter(Boolean).join(" ") || "—"}
                        </div>
                        <div className="text-[10px] text-brand-400 font-mono">{r.id.slice(0, 12)}…</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1.5 text-brand-700">
                      <IcoMail size={12} className="text-brand-400" />{r.email || "—"}
                    </div>
                  </td>
                  <td>
                    {r.phone ? (
                      <div className="flex items-center gap-1.5 text-brand-700">
                        <IcoPhone size={12} className="text-brand-400" />{r.phone}
                      </div>
                    ) : <span className="text-brand-300">—</span>}
                  </td>
                  <td>{statusBadge(r.accountStatus)}</td>
                  <td>
                    <div className="flex items-center gap-1.5">
                      <IcoShield size={13} className={
                        r.kycStatus?.toLowerCase().includes("verif") ? "text-emerald-500" :
                        r.kycStatus?.toLowerCase().includes("pend") ? "text-amber-500" : "text-brand-300"
                      } />
                      <span className="text-xs text-brand-600">{r.kycStatus ?? "—"}</span>
                    </div>
                  </td>
                  <td>
                    <Link to={`/customers/${r.id}`} className="btn-ghost text-xs text-brand-gold gap-1">
                      View <IcoChevronRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
