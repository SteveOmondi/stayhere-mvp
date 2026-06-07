import { useEffect, useState } from "react";
import { ownersApi, propertiesApi, customersApi, listingsApi, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";
import { IcoTrendUp, IcoOwners, IcoBuilding, IcoCustomers, IcoListing, IcoArrowUp } from "../components/icons";

/* ── Chart helpers ────────────────────────────────────────── */
const M = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const R = [320,410,380,510,490,620,580,710,680,780,820,910];
const E = [210,250,230,310,290,380,350,420,400,460,480,530];
const L = [5,8,6,12,11,15,14,18,17,22,25,28];
const C = [2,3,2,5,4,7,6,9,8,11,13,15];

function BarChart({ data, color, labels }: { data: number[]; color: string; labels: string[] }) {
  const max = Math.max(...data) * 1.15;
  const W = 560, H = 140, barW = W / data.length - 8;
  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} className="w-full">
      {data.map((v, i) => {
        const bh = (v / max) * H;
        const x = i * (W / data.length) + 4;
        const y = H - bh;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={bh} rx={4}
              fill={color} opacity={i === data.length - 1 ? 1 : 0.5} />
            <text x={x + barW / 2} y={H + 16} textAnchor="middle" fontSize={9} fill="#94a3b8">
              {labels[i]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function LineChart({ datasets }: { datasets: { data: number[]; color: string; label: string }[] }) {
  const W = 560, H = 160, pad = { t: 16, r: 16, b: 32, l: 44 };
  const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b;
  const allVals = datasets.flatMap(d => d.data);
  const max = Math.max(...allVals) * 1.15;
  const toX = (i: number) => pad.l + (i / (M.length - 1)) * cW;
  const toY = (v: number) => pad.t + cH - (v / max) * cH;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 160 }}>
      <defs>
        {datasets.map(d => (
          <linearGradient key={d.label} id={`grad_${d.label}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={d.color} stopOpacity="0.2" />
            <stop offset="100%" stopColor={d.color} stopOpacity="0.02" />
          </linearGradient>
        ))}
      </defs>
      {[0,1,2,3].map(i => {
        const y = pad.t + (i / 3) * cH;
        return <line key={i} x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#e2e8f0" strokeWidth={1} />;
      })}
      {datasets.map(d => {
        const path = "M " + d.data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" L ");
        const area = path + ` L ${toX(d.data.length - 1)},${toY(0)} L ${toX(0)},${toY(0)} Z`;
        return (
          <g key={d.label}>
            <path d={area} fill={`url(#grad_${d.label})`} />
            <path d={path} fill="none" stroke={d.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
            {d.data.map((v, i) => (
              <circle key={i} cx={toX(i)} cy={toY(v)} r={2.5} fill={d.color} stroke="white" strokeWidth={1.5} />
            ))}
          </g>
        );
      })}
      {M.map((m, i) => (
        <text key={m} x={toX(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

function DonutChart({ segments }: { segments: { label: string; value: number; color: string }[] }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const cx = 70, cy = 70, r = 55, innerR = 36;
  let startAngle = -Math.PI / 2;
  const arcs = segments.map(s => {
    const angle = (s.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    startAngle += angle;
    const x2 = cx + r * Math.cos(startAngle);
    const y2 = cy + r * Math.sin(startAngle);
    const large = angle > Math.PI ? 1 : 0;
    const xi1 = cx + innerR * Math.cos(startAngle - angle);
    const yi1 = cy + innerR * Math.sin(startAngle - angle);
    const xi2 = cx + innerR * Math.cos(startAngle);
    const yi2 = cy + innerR * Math.sin(startAngle);
    return { ...s, path: `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${innerR} ${innerR} 0 ${large} 0 ${xi1} ${yi1} Z` };
  });
  return (
    <div className="flex items-center gap-5">
      <svg width={140} height={140} viewBox="0 0 140 140" className="shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color} className="hover:opacity-80 transition-opacity cursor-pointer" />
        ))}
        <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#0c1222">{total}</text>
        <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill="#94a3b8">Total</text>
      </svg>
      <div className="space-y-2 flex-1">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
            <div className="flex-1 text-xs text-brand-700">{s.label}</div>
            <div className="text-xs font-bold text-brand-900">{s.value}</div>
            <div className="text-[10px] text-brand-400">{Math.round((s.value / total) * 100)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { reloadKey, toast } = usePortal();
  const [counts, setCounts] = useState({ owners: 0, properties: 0, customers: 0, listings: 0, loading: true });

  useEffect(() => {
    let c = false;
    (async () => {
      try {
        const [o, p, cu, l] = await Promise.allSettled([
          ownersApi.list(1, 1),
          propertiesApi.list(1, 1),
          customersApi.list(),
          listingsApi.list(1, 1),
        ]);
        if (c) return;
        const op = o.status === "fulfilled" ? asPaginated<unknown>(o.value) : null;
        const pp = p.status === "fulfilled" ? asPaginated<unknown>(p.value) : null;
        const lp = l.status === "fulfilled" ? asPaginated<unknown>(l.value) : null;
        setCounts({
          owners:     op ? op.totalCount : 0,
          properties: pp ? pp.totalCount : 0,
          customers:  cu.status === "fulfilled" && Array.isArray(cu.value) ? cu.value.length : 0,
          listings:   lp ? lp.totalCount : 0,
          loading: false,
        });
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Analytics load failed", "error");
        if (!c) setCounts(s => ({ ...s, loading: false }));
      }
    })();
    return () => { c = true; };
  }, [reloadKey, toast]);

  const kpiCards = [
    { label: "Total Owners",    val: counts.owners,     Icon: IcoOwners,    color: "#c9a227", change: "+12%" },
    { label: "Total Properties",val: counts.properties, Icon: IcoBuilding,  color: "#3b82f6", change: "+8%"  },
    { label: "Total Listings",  val: counts.listings,   Icon: IcoListing,   color: "#10b981", change: "+24%" },
    { label: "Total Customers", val: counts.customers,  Icon: IcoCustomers, color: "#8b5cf6", change: "+5%"  },
  ];

  return (
    <div className="space-y-6 animate-slide-up">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="font-display text-3xl text-brand-900">Analytics</h2>
          <p className="text-sm text-brand-500 mt-1">Platform KPIs and performance metrics</p>
        </div>
        <div className="flex gap-2">
          <button className="btn-secondary text-xs">Export CSV</button>
          <button className="btn-primary text-xs">
            <IcoTrendUp size={14} /> Generate Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map(k => {
          const Icon = k.Icon;
          return (
            <div key={k.label} className="stat-card">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: `${k.color}15` }}>
                  <Icon size={18} style={{ color: k.color }} />
                </div>
                <span className="badge badge-success text-[10px]">
                  <IcoArrowUp size={9} />{k.change}
                </span>
              </div>
              <div className="text-3xl font-display font-bold text-brand-900">
                {counts.loading ? <span className="skeleton h-8 w-14 inline-block" /> : k.val}
              </div>
              <div className="text-xs text-brand-500 mt-1">{k.label}</div>
              <div className="absolute bottom-0 right-0 w-20 h-20 rounded-tl-3xl opacity-[0.06]"
                style={{ background: k.color }} />
            </div>
          );
        })}
      </div>

      {/* Revenue Charts row */}
      <div className="grid lg:grid-cols-2 gap-5">
        <div className="portal-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-brand-900">Revenue vs Expenses</h3>
              <p className="text-xs text-brand-500 mt-0.5">KES ×1,000 · monthly</p>
            </div>
            <div className="flex gap-3 text-[10px]">
              <span className="flex items-center gap-1 text-brand-500"><span className="w-3 h-0.5 bg-brand-gold rounded inline-block"/>Revenue</span>
              <span className="flex items-center gap-1 text-brand-500"><span className="w-3 h-0.5 bg-blue-500 rounded inline-block"/>Expenses</span>
            </div>
          </div>
          <LineChart datasets={[
            { data: R, color: "#c9a227", label: "Revenue" },
            { data: E, color: "#3b82f6", label: "Expenses" },
          ]} />
        </div>

        <div className="portal-card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-brand-900">New Listings per Month</h3>
              <p className="text-xs text-brand-500 mt-0.5">Listing creation velocity</p>
            </div>
          </div>
          <BarChart data={L} color="#10b981" labels={M} />
        </div>
      </div>

      {/* Lower charts row */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Property types donut */}
        <div className="portal-card p-6">
          <h3 className="font-semibold text-brand-900 mb-4">Listing Types</h3>
          <DonutChart segments={[
            { label: "Apartment",   value: 42, color: "#c9a227" },
            { label: "House",       value: 28, color: "#3b82f6" },
            { label: "Studio",      value: 15, color: "#10b981" },
            { label: "Commercial",  value: 10, color: "#8b5cf6" },
            { label: "Land",        value: 5,  color: "#f59e0b" },
          ]} />
        </div>

        {/* Customer growth */}
        <div className="portal-card p-6">
          <h3 className="font-semibold text-brand-900 mb-4">Customer Growth</h3>
          <LineChart datasets={[{ data: C, color: "#8b5cf6", label: "Customers" }]} />
        </div>

        {/* Top regions */}
        <div className="portal-card p-6">
          <h3 className="font-semibold text-brand-900 mb-4">Top Regions</h3>
          <div className="space-y-3">
            {[
              { region: "Nairobi — Westlands", pct: 82, color: "#c9a227" },
              { region: "Nairobi — Karen",     pct: 65, color: "#3b82f6" },
              { region: "Nairobi — Kilimani",  pct: 54, color: "#10b981" },
              { region: "Mombasa — CBD",       pct: 38, color: "#8b5cf6" },
              { region: "Nairobi — Lavington", pct: 29, color: "#f59e0b" },
            ].map(r => (
              <div key={r.region}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-brand-700 truncate">{r.region}</span>
                  <span className="font-bold text-brand-900 ml-2">{r.pct}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${r.pct}%`, background: r.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Owner Performance Table */}
      <div className="portal-card">
        <div className="p-5 border-b border-black/[0.06]">
          <h3 className="font-semibold text-brand-900">Owner Performance</h3>
          <p className="text-xs text-brand-500 mt-0.5">Ranking by listing count and portfolio value</p>
        </div>
        <table className="portal-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Owner</th>
              <th>Properties</th>
              <th>Listings</th>
              <th>Avg Price (KES)</th>
              <th>Portfolio Score</th>
            </tr>
          </thead>
          <tbody>
            {[
              { rank: 1, name: "James Mwangi",   props: 8,  listings: 24, avg: "85,000",  score: 94 },
              { rank: 2, name: "Amina Hassan",   props: 5,  listings: 18, avg: "120,000", score: 87 },
              { rank: 3, name: "David Kamau",    props: 6,  listings: 15, avg: "65,000",  score: 81 },
              { rank: 4, name: "Susan Njoroge",  props: 3,  listings: 12, avg: "150,000", score: 76 },
              { rank: 5, name: "Patrick Otieno", props: 4,  listings: 9,  avg: "45,000",  score: 68 },
            ].map(r => (
              <tr key={r.rank}>
                <td>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold inline-flex ${
                    r.rank === 1 ? "bg-brand-gold/20 text-brand-golddark" :
                    r.rank === 2 ? "bg-slate-200 text-slate-600" :
                    r.rank === 3 ? "bg-orange-100 text-orange-600" : "bg-slate-100 text-slate-500"
                  }`}>{r.rank}</span>
                </td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full text-[10px] font-bold flex items-center justify-center text-brand-950"
                      style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)" }}>
                      {r.name.charAt(0)}
                    </div>
                    <span className="font-medium text-brand-900">{r.name}</span>
                  </div>
                </td>
                <td className="font-semibold">{r.props}</td>
                <td className="font-semibold">{r.listings}</td>
                <td className="text-brand-gold font-semibold">{r.avg}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-100 overflow-hidden" style={{ width: 80 }}>
                      <div className="h-full rounded-full bg-brand-gold" style={{ width: `${r.score}%` }} />
                    </div>
                    <span className="text-xs font-bold text-brand-900">{r.score}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
