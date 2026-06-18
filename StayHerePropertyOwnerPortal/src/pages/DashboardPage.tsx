import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { propertiesApi, listingsApi, customersApi, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import {
  IcoBuilding, IcoListing, IcoUser, IcoWallet, IcoTrendUp,
  IcoMapPin, IcoChevRight, IcoVacant, IcoTeam, IcoRefresh,
  IcoActivity, IcoNotice, IcoOnboard,
} from "../components/icons";

/* ── Animated counter hook ───────────────────────────────── */
function useCounter(target: number, duration = 1000) {
  const [val, setVal] = useState(0);
  const ref = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (target === 0) { setVal(0); return; }
    const steps = 40;
    const step = target / steps;
    let cur = 0;
    const tick = () => {
      cur = Math.min(cur + step, target);
      setVal(Math.round(cur));
      if (cur < target) ref.current = setTimeout(tick, duration / steps);
    };
    ref.current = setTimeout(tick, 50);
    return () => { if (ref.current) clearTimeout(ref.current); };
  }, [target, duration]);
  return val;
}

/* ── Sparkline ───────────────────────────────────────────── */
function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const W = 72, H = 28;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * W).toFixed(1)},${(H - ((v - min) / range) * H).toFixed(1)}`).join(" L ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ── SVG revenue line chart ──────────────────────────────── */
function RevenueChart({ data }: { data: number[] }) {
  const M = ["J","F","M","A","M","J","J","A","S","O","N","D"];
  const W = 500, H = 140, padL = 40, padB = 28, padT = 10, padR = 10;
  const cW = W - padL - padR, cH = H - padT - padB;
  const max = Math.max(...data) * 1.2 || 1;
  const toX = (i: number) => padL + (i / (data.length - 1)) * cW;
  const toY = (v: number) => padT + cH - (v / max) * cH;
  const path = "M " + data.map((v, i) => `${toX(i).toFixed(1)},${toY(v).toFixed(1)}`).join(" L ");
  const area = path + ` L ${toX(data.length - 1)},${toY(0)} L ${toX(0)},${toY(0)} Z`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 140 }}>
      <defs>
        <linearGradient id="tealGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0d9488" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#0d9488" stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {[0,1,2,3].map(i => (
        <line key={i} x1={padL} y1={padT + (i / 3) * cH} x2={W - padR} y2={padT + (i / 3) * cH} stroke="#e2e8f0" strokeWidth={1} />
      ))}
      <path d={area} fill="url(#tealGrad)" />
      <path d={path} className="chart-line" />
      {data.map((v, i) => (
        <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill="#0d9488" stroke="white" strokeWidth={1.5} />
      ))}
      {M.slice(0, data.length).map((m, i) => (
        <text key={i} x={toX(i)} y={H - 5} textAnchor="middle" fontSize={9} fill="#94a3b8">{m}</text>
      ))}
    </svg>
  );
}

type Stats = { properties: number; listings: number; occupied: number; vacant: number; customers: number; loading: boolean };

const QUICK = [
  { label: "Add Property",       to: "/properties",  color: "#0d9488", Icon: IcoBuilding },
  { label: "Create Listing",     to: "/listings",    color: "#c9a227", Icon: IcoListing  },
  { label: "View Tenants",       to: "/tenants",     color: "#8b5cf6", Icon: IcoUser     },
  { label: "Manage Team",        to: "/team",        color: "#3b82f6", Icon: IcoTeam     },
  { label: "Send Notice",        to: "/noticeboard", color: "#f59e0b", Icon: IcoNotice   },
  { label: "Onboard Tenant",     to: "/onboarding",  color: "#10b981", Icon: IcoOnboard  },
];

const MOCK_REVENUE = [210,185,230,280,310,295,340,380,420,390,460,510];

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good Morning" : h < 17 ? "Good Afternoon" : "Good Evening";
}

export function DashboardPage() {
  const { owner, userId, reloadKey, toast, bumpReload } = useOwner();
  const [stats, setStats] = useState<Stats>({ properties:0, listings:0, occupied:0, vacant:0, customers:0, loading:true });
  const [recentListings, setRecentListings] = useState<Record<string, unknown>[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const propCount   = useCounter(stats.loading ? 0 : stats.properties, 800);
  const listCount   = useCounter(stats.loading ? 0 : stats.listings, 900);
  const tenantCount = useCounter(stats.loading ? 0 : stats.customers, 1000);
  const vacantCount = useCounter(stats.loading ? 0 : stats.vacant, 700);

  const refresh = async (signal?: AbortSignal) => {
    if (!userId) return;
    setRefreshing(true);
    try {
      const [propsData, listData, custData] = await Promise.allSettled([
        propertiesApi.byOwner(userId, 1, 1),
        listingsApi.byOwner(userId, 1, 50),
        customersApi.byOwner(userId),
      ]);
      if (signal?.aborted) return;
      const propPg  = propsData.status === "fulfilled" ? asPaginated<unknown>(propsData.value) : null;
      const listPg  = listData.status  === "fulfilled" ? asPaginated<unknown>(listData.value)  : null;
      const custArr = custData.status  === "fulfilled" && Array.isArray(custData.value) ? custData.value : [];
      const listItems = listPg?.items ?? [];
      const occupied = listItems.filter(l => { const r = l as Record<string,unknown>; return r.isAvailable === false || r.isOccupied === true; }).length;
      const vacant   = listItems.length - occupied;
      setStats({ properties: propPg?.totalCount ?? 0, listings: listPg?.totalCount ?? 0, occupied, vacant, customers: custArr.length, loading: false });
      setRecentListings(listItems.slice(0, 4) as Record<string, unknown>[]);
    } catch (e) {
      if (signal?.aborted) return;
      toast(e instanceof ApiError ? e.message : "Failed to load stats", "error");
      setStats(s => ({ ...s, loading: false }));
    } finally {
      if (!signal?.aborted) setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [reloadKey, userId]);

  const STAT_CARDS = [
    { label: "Properties",  val: propCount,   raw: stats.properties, Icon: IcoBuilding, color: "#0d9488", spark: [2,3,2,4,3,5,4,6],    to: "/properties" },
    { label: "Total Units", val: listCount,   raw: stats.listings,   Icon: IcoListing,  color: "#c9a227", spark: [5,7,6,9,8,11,10,14],  to: "/listings"   },
    { label: "Tenants",     val: tenantCount, raw: stats.customers,  Icon: IcoUser,     color: "#8b5cf6", spark: [3,4,3,5,4,6,5,7],     to: "/tenants"    },
    { label: "Vacant Units",val: vacantCount, raw: stats.vacant,     Icon: IcoVacant,   color: "#f59e0b", spark: [4,3,4,2,3,2,3,2],     to: "/listings"   },
  ];

  const occupancyPct = stats.listings > 0 ? Math.round((stats.occupied / stats.listings) * 100) : 0;

  return (
    <div className="space-y-6">

      {/* ── Hero banner ────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl animate-slide-up" style={{ minHeight: 200 }}>
        <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1800&q=80"
          alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 opacity-15" style={{ background: "radial-gradient(ellipse at 25% 60%, rgba(13,148,136,0.8) 0%, transparent 65%)" }} />
        <div className="relative z-10 px-8 py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-white/55 text-sm font-medium mb-1">{getGreeting()}, {owner?.fullName?.split(" ")[0] ?? "Owner"} 👋</div>
            <h1 className="font-display text-3xl md:text-4xl text-white tracking-tight leading-tight">
              Your Portfolio<br /><span className="text-brand-teallight">Control Centre</span>
            </h1>
            <p className="text-white/65 mt-3 text-sm max-w-md">Manage properties, tenants, team, and analytics — all from one place.</p>
            <div className="flex gap-3 mt-4">
              <Link to="/listings" className="btn-teal text-sm px-5 py-2.5 rounded-xl">View All Units</Link>
              <Link to="/onboarding" className="btn px-5 py-2.5 rounded-xl text-sm font-semibold text-white border border-white/25 hover:bg-white/10 transition-colors">+ Onboard Tenant</Link>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            {owner?.walletBalance != null && (
              <div className="px-4 py-3 rounded-2xl backdrop-blur-sm border border-white/15" style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="flex items-center gap-1.5 text-white/50 text-[10px] uppercase tracking-wide mb-0.5"><IcoWallet size={11} />Wallet</div>
                <div className="text-white font-bold text-sm">KES {owner.walletBalance.toLocaleString()}</div>
              </div>
            )}
            <div className="px-4 py-3 rounded-2xl backdrop-blur-sm border border-white/15" style={{ background: "rgba(255,255,255,0.1)" }}>
              <div className="text-white/50 text-[10px] uppercase tracking-wide mb-0.5">Occupancy</div>
              <div className="text-brand-teallight font-bold text-sm">{stats.loading ? "…" : `${occupancyPct}%`}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        {STAT_CARDS.map(c => {
          const Icon = c.Icon;
          return (
            <Link key={c.label} to={c.to} className="card-hover p-5 block group animate-slide-up">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: `${c.color}18` }}>
                  <Icon size={18} style={{ color: c.color }} />
                </div>
                {!stats.loading && <IcoTrendUp size={13} className="text-emerald-500 mt-1" />}
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-display font-bold text-brand-900">
                    {stats.loading ? <span className="skeleton inline-block h-7 w-10" /> : c.val}
                  </div>
                  <div className="text-xs text-brand-500 mt-0.5">{c.label}</div>
                </div>
                <Spark data={c.spark} color={c.color} />
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-brand-500 group-hover:text-brand-teal transition-colors">
                View all <IcoChevRight size={11} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Revenue chart + Occupancy ───────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="card p-6 lg:col-span-2 animate-slide-up-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-brand-900">Revenue Trend</h3>
              <p className="text-xs text-brand-500 mt-0.5">KES ×1,000 · monthly estimate</p>
            </div>
            <button onClick={() => { bumpReload(); }} className="btn-icon" title="Refresh">
              <IcoRefresh size={14} className={refreshing ? "animate-spin" : ""} />
            </button>
          </div>
          <RevenueChart data={MOCK_REVENUE} />
          <div className="mt-4 grid grid-cols-3 divide-x divide-black/[0.06]">
            {[
              { label: "This Month", val: "KES 510K", up: true },
              { label: "Last Month", val: "KES 460K", up: true },
              { label: "YTD Total",  val: "KES 4.01M", up: true },
            ].map(m => (
              <div key={m.label} className="px-4 first:pl-0 last:pr-0">
                <div className="text-[10px] text-brand-400 uppercase tracking-wide">{m.label}</div>
                <div className="text-base font-bold text-brand-900 mt-0.5">{m.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Occupancy donut */}
        <div className="card p-6 flex flex-col animate-slide-up-3">
          <h3 className="font-semibold text-brand-900 mb-4">Occupancy Rate</h3>
          <div className="flex-1 flex flex-col items-center justify-center">
            <svg viewBox="0 0 120 120" className="w-32 h-32 mb-4">
              <circle cx="60" cy="60" r="48" fill="none" stroke="#f1f5f9" strokeWidth="14" />
              <circle cx="60" cy="60" r="48" fill="none" stroke="#0d9488" strokeWidth="14"
                strokeDasharray={`${2 * Math.PI * 48 * occupancyPct / 100} ${2 * Math.PI * 48}`}
                strokeDashoffset={2 * Math.PI * 48 * 0.25}
                strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1.2s ease-out" }}
              />
              <text x="60" y="55" textAnchor="middle" fontSize="18" fontWeight="bold" fill="#0f172a">{stats.loading ? "…" : `${occupancyPct}%`}</text>
              <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#94a3b8">Occupied</text>
            </svg>
            <div className="w-full space-y-2.5">
              {[
                { label: "Occupied", val: stats.occupied, color: "#0d9488" },
                { label: "Vacant",   val: stats.vacant,   color: "#f59e0b" },
              ].map(r => (
                <div key={r.label} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: r.color }} />
                  <span className="text-xs text-brand-600 flex-1">{r.label}</span>
                  <span className="text-xs font-bold text-brand-900">{stats.loading ? "–" : r.val}</span>
                </div>
              ))}
            </div>
          </div>
          <Link to="/listings" className="mt-4 btn-secondary w-full justify-center text-xs py-2">View All Units</Link>
        </div>
      </div>

      {/* ── Recent Listings + Quick Actions ────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent listings */}
        <div className="card p-5 lg:col-span-2 animate-slide-up-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-brand-900">Recent Listings</h3>
            <Link to="/listings" className="text-xs text-brand-teal font-semibold hover:underline">View all</Link>
          </div>
          {stats.loading ? (
            <div className="space-y-3">{Array.from({length:3}).map((_,i)=>(
              <div key={i} className="flex gap-3"><div className="skeleton w-14 h-14 rounded-xl shrink-0"/><div className="flex-1 space-y-2"><div className="skeleton h-4 w-2/3"/><div className="skeleton h-3 w-1/2"/></div></div>
            ))}</div>
          ) : recentListings.length === 0 ? (
            <div className="text-center py-10">
              <IcoListing size={28} className="mx-auto mb-2 text-brand-200" />
              <p className="text-sm text-brand-400">No listings yet</p>
              <Link to="/listings" className="btn-teal text-xs mt-3 inline-flex">+ Add First Listing</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentListings.map((l, i) => {
                const imgs = ["https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=200&q=70","https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=200&q=70","https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=200&q=70","https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=200&q=70"];
                const isVacant = l.isAvailable !== false && l.isOccupied !== true;
                return (
                  <div key={String(l.id ?? i)} className="flex gap-3 items-center group">
                    <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden">
                      <img src={imgs[i % imgs.length]} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-brand-900 truncate">{String(l.title ?? `Unit ${i+1}`)}</div>
                      <div className="flex items-center gap-1 text-[10px] text-brand-500 mt-0.5">
                        <IcoMapPin size={10}/>{String(l.suburb ?? l.city ?? "Nairobi")}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {l.price != null && <div className="text-xs font-bold text-brand-teal">KES {Number(l.price).toLocaleString()}</div>}
                      <span className={`badge text-[9px] mt-0.5 ${isVacant ? "badge-vacant" : "badge-occupied"}`}>{isVacant ? "Vacant" : "Occupied"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="card p-5 animate-slide-up-4">
          <h3 className="font-semibold text-brand-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK.map(q => {
              const Icon = q.Icon;
              return (
                <Link key={q.to} to={q.to}
                  className="group flex flex-col gap-2.5 p-3 rounded-2xl border border-black/[0.06] hover:border-brand-teal/30 hover:bg-brand-teal/[0.03] transition-all duration-200">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200" style={{ background: `${q.color}18` }}>
                    <Icon size={15} style={{ color: q.color }} />
                  </div>
                  <div className="text-[11px] font-bold text-brand-900 leading-tight">{q.label}</div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Activity feed ──────────────────────────────────── */}
      <div className="card p-5 animate-slide-up-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-brand-900">Portfolio Activity</h3>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-online"/>Live
          </div>
        </div>
        <div className="space-y-3">
          {[
            { icon: IcoUser,     text: "New tenant inquiry on Westlands listing",       time: "Just now",   color: "#8b5cf6" },
            { icon: IcoActivity, text: "Rent payment received — Kilimani 2BR",           time: "12 min ago", color: "#10b981" },
            { icon: IcoListing,  text: "Unit marked as available — Karen Estate",        time: "1 hr ago",   color: "#0d9488" },
            { icon: IcoTeam,     text: "Agent assigned to Parklands listing",            time: "3 hr ago",   color: "#3b82f6" },
            { icon: IcoBuilding, text: "Maintenance request — Lavington property",       time: "Yesterday",  color: "#f59e0b" },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-black/[0.05] last:border-0">
                <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${a.color}15` }}>
                  <Icon size={13} style={{ color: a.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-brand-800 leading-snug">{a.text}</div>
                  <div className="text-[10px] text-brand-400 mt-0.5">{a.time}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
