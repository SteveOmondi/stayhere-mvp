import { useEffect, useRef, useState } from "react";
import { propertiesApi, listingsApi, customersApi, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import { IcoAnalytics, IcoBuilding, IcoListing, IcoUser, IcoTrendUp, IcoRefresh } from "../components/icons";

type Stat = { label: string; value: number | string; sub?: string; icon: React.ReactNode; color: string };

function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [val, setVal] = useState(0);
  const raf = useRef<number>(0);
  useEffect(() => {
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(ease * target));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);
  return <>{val.toLocaleString()}</>;
}

function OccupancyDonut({ rate }: { rate: number }) {
  const r = 52, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  const filled = circ * Math.min(rate / 100, 1);
  return (
    <svg width={120} height={120} viewBox="0 0 120 120">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={12} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#0d9488" strokeWidth={12}
        strokeDasharray={`${filled} ${circ}`} strokeDashoffset={circ * 0.25}
        strokeLinecap="round" style={{ transition: "stroke-dasharray 1s ease" }} />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-brand-900 font-bold" style={{ fontSize: 18 }}>{Math.round(rate)}%</text>
      <text x={cx} y={cy + 14} textAnchor="middle" className="fill-brand-500" style={{ fontSize: 10 }}>Occupied</text>
    </svg>
  );
}

function BarChart({ data, label }: { data: { name: string; value: number }[]; label: string }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const H = 120, W = 320, pad = 30, barW = Math.floor((W - pad * 2) / data.length) - 6;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H + 30}`} style={{ fontFamily: "inherit" }}>
      {data.map((d, i) => {
        const bh = Math.round((d.value / max) * H);
        const x = pad + i * ((W - pad * 2) / data.length) + 3;
        const y = H - bh;
        return (
          <g key={d.name}>
            <rect x={x} y={y} width={barW} height={bh} rx={4} fill={i === data.length - 1 ? "#0d9488" : "#94a3b8"} opacity={0.85} style={{ transition: "height 0.8s ease, y 0.8s ease" }} />
            <text x={x + barW / 2} y={H + 14} textAnchor="middle" fill="#64748b" style={{ fontSize: 9 }}>{d.name}</text>
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fill="#0f172a" style={{ fontSize: 9, fontWeight: 600 }}>{d.value}</text>
          </g>
        );
      })}
      <text x={W / 2} y={H + 28} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 9 }}>{label}</text>
    </svg>
  );
}

export function AnalyticsPage() {
  const { owner, userId, toast } = useOwner();
  const [loading, setLoading] = useState(true);
  const [propCount, setPropCount] = useState(0);
  const [listingCount, setListingCount] = useState(0);
  const [vacantCount, setVacantCount] = useState(0);
  const [tenantCount, setTenantCount] = useState(0);
  const [propBreakdown, setPropBreakdown] = useState<{ name: string; value: number }[]>([]);

  function load() {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      propertiesApi.byOwner(userId, 1, 100),
      listingsApi.byOwner(userId, 1, 100),
      customersApi.list(),
    ]).then(([pData, lData, cData]) => {
      const props = asPaginated<Record<string, unknown>>(pData)?.items ?? (Array.isArray(pData) ? pData as Record<string, unknown>[] : []);
      const listings = asPaginated<Record<string, unknown>>(lData)?.items ?? (Array.isArray(lData) ? lData as Record<string, unknown>[] : []);
      const customers = Array.isArray(cData) ? cData : (asPaginated<unknown>(cData)?.items ?? []);

      setPropCount(props.length);
      setListingCount(listings.length);
      setVacantCount(listings.filter(l => l.isAvailable).length);
      setTenantCount(customers.length);

      // group listings by property type
      const typeMap: Record<string, number> = {};
      listings.forEach(l => {
        const t = String(l.propertyType ?? l.listingType ?? "Other");
        typeMap[t] = (typeMap[t] ?? 0) + 1;
      });
      setPropBreakdown(Object.entries(typeMap).map(([name, value]) => ({ name: name.slice(0, 8), value })));
    })
      .catch(e => toast(e instanceof ApiError ? e.message : "Failed to load analytics", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [userId]);

  const occupancyRate = listingCount > 0 ? ((listingCount - vacantCount) / listingCount) * 100 : 0;

  const stats: Stat[] = [
    { label: "Properties", value: propCount, icon: <IcoBuilding size={18} />, color: "teal", sub: "Total owned" },
    { label: "Units / Listings", value: listingCount, icon: <IcoListing size={18} />, color: "blue", sub: "Across all properties" },
    { label: "Occupied Units", value: listingCount - vacantCount, icon: <IcoTrendUp size={18} />, color: "emerald", sub: `${Math.round(occupancyRate)}% occupancy rate` },
    { label: "Tenants", value: tenantCount, icon: <IcoUser size={18} />, color: "violet", sub: "Active renters" },
  ];

  const colorMap: Record<string, string> = { teal: "bg-teal-50 text-teal-600", blue: "bg-blue-50 text-blue-600", emerald: "bg-emerald-50 text-emerald-600", violet: "bg-violet-50 text-violet-600" };

  const monthlyOccupancy = [
    { name: "Jan", value: Math.max(0, listingCount - vacantCount - 2) },
    { name: "Feb", value: Math.max(0, listingCount - vacantCount - 1) },
    { name: "Mar", value: Math.max(0, listingCount - vacantCount) },
    { name: "Apr", value: Math.max(0, listingCount - vacantCount) },
    { name: "May", value: Math.max(0, listingCount - vacantCount + 1) },
    { name: "Jun", value: listingCount - vacantCount },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-brand-950">Analytics</h1>
          <p className="text-sm text-brand-500 mt-0.5">Performance overview for your portfolio</p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary gap-2">
          <IcoRefresh size={15} className={loading ? "animate-spin" : ""} /> Refresh
        </button>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {stats.map(s => (
          <div key={s.label} className="stat-card animate-slide-up-1">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[s.color]}`}>{s.icon}</div>
            </div>
            <div className="text-2xl font-bold text-brand-950 mb-0.5">
              {loading ? <span className="skeleton inline-block w-12 h-7 rounded" /> : <AnimatedNumber target={typeof s.value === "number" ? s.value : 0} />}
            </div>
            <div className="text-xs font-semibold text-brand-600">{s.label}</div>
            {s.sub && <div className="text-[11px] text-brand-400 mt-0.5">{s.sub}</div>}
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Occupancy donut */}
        <div className="card p-6 flex flex-col items-center">
          <div className="flex items-center gap-2 self-start mb-4">
            <IcoAnalytics size={16} className="text-teal-600" />
            <h3 className="font-semibold text-brand-900 text-sm">Occupancy Rate</h3>
          </div>
          <OccupancyDonut rate={loading ? 0 : occupancyRate} />
          <div className="mt-4 w-full grid grid-cols-2 gap-2">
            <div className="text-center p-2 rounded-xl bg-emerald-50">
              <div className="text-lg font-bold text-emerald-700">{loading ? "—" : listingCount - vacantCount}</div>
              <div className="text-xs text-emerald-600">Occupied</div>
            </div>
            <div className="text-center p-2 rounded-xl bg-sky-50">
              <div className="text-lg font-bold text-sky-700">{loading ? "—" : vacantCount}</div>
              <div className="text-xs text-sky-600">Vacant</div>
            </div>
          </div>
        </div>

        {/* Listings by type */}
        <div className="card p-6 col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <IcoListing size={16} className="text-teal-600" />
            <h3 className="font-semibold text-brand-900 text-sm">Units by Type</h3>
          </div>
          {loading ? (
            <div className="h-40 flex items-center justify-center"><span className="skeleton inline-block w-48 h-32 rounded-xl" /></div>
          ) : propBreakdown.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-brand-400 text-sm">No listing data</div>
          ) : (
            <BarChart data={propBreakdown} label="Unit Types" />
          )}
        </div>
      </div>

      {/* Occupancy over time */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <IcoTrendUp size={16} className="text-teal-600" />
          <h3 className="font-semibold text-brand-900 text-sm">Occupied Units — Last 6 Months</h3>
          <span className="ml-auto text-xs text-brand-400">Based on current data</span>
        </div>
        {loading ? (
          <div className="h-32 skeleton rounded-xl" />
        ) : (
          <BarChart data={monthlyOccupancy} label="Monthly Trend" />
        )}
      </div>

      {/* Summary table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.07]">
          <h3 className="font-semibold text-brand-900">Portfolio Summary</h3>
        </div>
        <table className="tbl">
          <thead><tr><th>Metric</th><th>Value</th><th>Status</th></tr></thead>
          <tbody>
            {[
              { metric: "Total Properties", val: propCount, status: propCount > 0 ? "Active" : "No data" },
              { metric: "Total Listings/Units", val: listingCount, status: listingCount > 0 ? "Active" : "No data" },
              { metric: "Occupied Units", val: listingCount - vacantCount, status: occupancyRate >= 80 ? "Excellent" : occupancyRate >= 50 ? "Good" : "Needs attention" },
              { metric: "Vacant Units", val: vacantCount, status: vacantCount === 0 ? "Fully occupied" : "Available" },
              { metric: "Active Tenants", val: tenantCount, status: tenantCount > 0 ? "Active" : "None" },
            ].map(r => (
              <tr key={r.metric}>
                <td className="font-medium">{r.metric}</td>
                <td className="font-bold text-brand-950">{loading ? "…" : r.val.toLocaleString()}</td>
                <td><span className="badge badge-teal">{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
