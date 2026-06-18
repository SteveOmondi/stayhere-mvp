import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { customersApi, ownersApi, propertiesApi, listingsApi, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";
import {
  IcoOwners, IcoBuilding, IcoCustomers, IcoListing, IcoTrendUp,
  IcoSearch, IcoEye, IcoMapPin, IcoAnalytics,
  IcoAI, IcoChevronRight, IcoLoader, IcoRefresh,
} from "../components/icons";

/* ── Simple SVG sparkline ────────────────────────────────── */
function SparkLine({ data, color = "#10b981" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const W = 80, H = 28;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => {
    const x = ((i / (data.length - 1)) * W).toFixed(1);
    const y = (H - ((v - min) / range) * H).toFixed(1);
    return `${x},${y}`;
  }).join(" L ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <path d={`M ${pts}`} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const QUICK_ACTIONS = [
  { label: "Register Owner",  desc: "Add a new property owner",   to: "/owners",                   color: "#c9a227", Icon: IcoOwners   },
  { label: "Add Property",    desc: "Register a new building",    to: "/properties/new",           color: "#3b82f6", Icon: IcoBuilding },
  { label: "Create Listing",  desc: "List a new rental unit",     to: "/listings/new-from-property", color: "#10b981", Icon: IcoListing  },
  { label: "Search Market",   desc: "Browse all listings",        to: "/listings",                 color: "#8b5cf6", Icon: IcoSearch   },
  { label: "AI Agent",        desc: "Ask anything about inventory", to: "/ai-agent",               color: "#f59e0b", Icon: IcoAI       },
  { label: "Analytics",       desc: "View KPIs & trends",         to: "/analytics",               color: "#ef4444", Icon: IcoAnalytics },
];

type ListingRow = { id: string; title?: string; price?: number; city?: string; suburb?: string; type?: string };
type OwnerRow   = { id: string; fullName: string; email: string };
type Stats = { owners: string; properties: string; customers: string; listings: string; loading: boolean };

function mapListing(x: unknown): ListingRow | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = r.id ?? r.listingId;
  if (!id) return null;
  return {
    id: String(id),
    title:  r.title ? String(r.title) : undefined,
    price:  typeof r.price === "number" ? r.price : typeof r.rentPrice === "number" ? r.rentPrice : undefined,
    city:   r.city ? String(r.city) : undefined,
    suburb: r.suburb ? String(r.suburb) : undefined,
    type:   r.propertyType ? String(r.propertyType) : undefined,
  };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const PLACEHOLDER_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=400&q=70",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?auto=format&fit=crop&w=400&q=70",
];

export function DashboardPage() {
  const { reloadKey, toast, adminUser } = usePortal();
  const [stats, setStats] = useState<Stats>({
    owners: "—", properties: "—", customers: "—", listings: "—", loading: true,
  });
  const [recentListings, setRecentListings] = useState<ListingRow[]>([]);
  const [recentOwners,   setRecentOwners]   = useState<OwnerRow[]>([]);
  const [dataLoading,    setDataLoading]    = useState(true);
  const [lastRefreshed,  setLastRefreshed]  = useState<string>("");

  const loadAll = async (signal?: AbortSignal) => {
    setStats(s => ({ ...s, loading: true }));
    setDataLoading(true);

    const isCancelled = () => signal?.aborted ?? false;

    /* Retry a single fetch up to maxAttempts times before giving up */
    const fetchWithRetry = async <T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> => {
      let lastErr: unknown;
      for (let i = 0; i < maxAttempts; i++) {
        if (isCancelled()) throw new DOMException("Aborted", "AbortError");
        if (i > 0) await new Promise<void>((r) => setTimeout(r, 1500 * i));
        try { return await fn(); } catch (e) { lastErr = e; }
      }
      throw lastErr;
    };

    try {
      const [o, p, c, l] = await Promise.allSettled([
        fetchWithRetry(() => ownersApi.list(1, 1)),
        fetchWithRetry(() => propertiesApi.list(1, 1)),
        fetchWithRetry(() => customersApi.list()),
        fetchWithRetry(() => listingsApi.list(1, 1)),
      ]);
      if (isCancelled()) return;
      const op = o.status === "fulfilled" ? asPaginated<unknown>(o.value) : null;
      const pp = p.status === "fulfilled" ? asPaginated<unknown>(p.value) : null;
      const lp = l.status === "fulfilled" ? asPaginated<unknown>(l.value) : null;
      const custCount = c.status === "fulfilled" && Array.isArray(c.value) ? c.value.length : null;
      setStats({
        owners:     op       ? String(op.totalCount)   : (o.status === "fulfilled" && Array.isArray(o.value) ? String((o.value as unknown[]).length) : "–"),
        properties: pp       ? String(pp.totalCount)   : "–",
        customers:  custCount != null ? String(custCount) : "–",
        listings:   lp       ? String(lp.totalCount)   : "–",
        loading: false,
      });
    } catch (e) {
      if (isCancelled()) return;
      setStats(s => ({ ...s, loading: false }));
      toast(e instanceof ApiError ? e.message : "Dashboard metrics failed", "error");
    }

    if (isCancelled()) return;

    /* Load recent listings for highlights panel */
    try {
      const listData = await fetchWithRetry(() => listingsApi.list(1, 4));
      if (!isCancelled()) {
        const pg = asPaginated<unknown>(listData);
        const raw = pg ? pg.items : (Array.isArray(listData) ? listData : []);
        setRecentListings((raw as unknown[]).map(mapListing).filter(Boolean) as ListingRow[]);
      }
    } catch { /* non-critical */ }

    if (isCancelled()) return;

    /* Load recent owners for activity feed */
    try {
      const ownerData = await fetchWithRetry(() => ownersApi.list(1, 5));
      if (!isCancelled()) {
        const pg = asPaginated<unknown>(ownerData);
        const raw = pg ? pg.items : (Array.isArray(ownerData) ? ownerData : []);
        setRecentOwners(
          (raw as unknown[]).map(x => {
            const r = x as Record<string, unknown>;
            return { id: String(r.id ?? ""), fullName: String(r.fullName ?? ""), email: String(r.email ?? "") };
          })
        );
      }
    } catch { /* non-critical */ }

    if (!isCancelled()) {
      setDataLoading(false);
      setLastRefreshed(new Date().toLocaleTimeString());
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadAll(controller.signal);
    return () => controller.abort();
  }, [reloadKey]);

  const statCards = [
    { label: "Property Owners", value: stats.owners,     Icon: IcoOwners,    color: "#c9a227", to: "/owners",     spark: [4,6,5,8,7,9,10,11] },
    { label: "Properties",      value: stats.properties, Icon: IcoBuilding,  color: "#3b82f6", to: "/properties", spark: [6,8,7,9,8,10,11,13] },
    { label: "Active Listings", value: stats.listings,   Icon: IcoListing,   color: "#10b981", to: "/listings",   spark: [3,5,4,7,6,9,8,12]  },
    { label: "Customers",       value: stats.customers,  Icon: IcoCustomers, color: "#8b5cf6", to: "/customers",  spark: [5,4,6,5,7,6,8,9]   },
  ];

  return (
    <div className="space-y-6 animate-slide-up">

      {/* ── Hero Banner ───────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl" style={{ minHeight: 200 }}>
        <img
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1800&q=80"
          alt="Property hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 hero-overlay" />
        <div className="absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse at 30% 50%, rgba(201,162,39,0.6) 0%, transparent 70%)" }} />

        <div className="relative z-10 px-8 py-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="text-white/60 text-sm font-medium mb-1">
              {getGreeting()}{adminUser?.name ? `, ${adminUser.name}` : ""} ✨
            </div>
            <h1 className="font-display text-3xl md:text-4xl text-white tracking-tight leading-tight">
              Kenyan Real Estate
              <br /><span className="text-brand-goldlight">Operations Centre</span>
            </h1>
            <p className="text-white/70 mt-3 text-sm max-w-lg">
              Your end-to-end control surface for property owners, listings, agents, caretakers and renters — connected to your live Azure APIM backend.
            </p>
            <div className="flex gap-3 mt-4">
              <Link to="/listings/new-from-property" className="btn-gold text-sm px-5 py-2.5 rounded-xl">
                + Create Listing
              </Link>
              <Link to="/ai-agent" className="btn px-5 py-2.5 rounded-xl text-sm font-semibold text-white hover:bg-white/10 transition-colors border border-white/25">
                Ask AI Agent
              </Link>
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            {[
              { label: "Auth",     val: "Connected" },
              { label: "APIs",     val: "6 Live"    },
              { label: "AI Agent", val: "Ready"     },
            ].map(s => (
              <div key={s.label} className="px-4 py-2 rounded-2xl text-sm backdrop-blur-sm border border-white/15"
                style={{ background: "rgba(255,255,255,0.1)" }}>
                <div className="text-white/50 text-[10px] uppercase tracking-wide">{s.label}</div>
                <div className="text-white font-semibold text-sm mt-0.5">{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── KPI Stat Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(c => {
          const Icon = c.Icon;
          return (
            <Link key={c.label} to={c.to} className="portal-card-hover p-5 block group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: `${c.color}18` }}>
                  <Icon size={18} style={{ color: c.color }} />
                </div>
                {stats.loading
                  ? <div className="skeleton h-5 w-12 rounded-full" />
                  : <IcoTrendUp size={14} className="text-emerald-500 mt-1" />
                }
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-2xl font-display font-bold text-brand-900">
                    {stats.loading ? <span className="skeleton h-7 w-10 inline-block" /> : c.value}
                  </div>
                  <div className="text-xs text-brand-500 mt-0.5">{c.label}</div>
                </div>
                <SparkLine data={c.spark} color={c.color} />
              </div>
              <div className="mt-3 flex items-center gap-1 text-xs text-brand-500 group-hover:text-brand-gold transition-colors">
                View all <IcoChevronRight size={12} />
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Recent Listings + Quick Actions ──────────────────── */}
      <div className="grid lg:grid-cols-3 gap-5">

        {/* Recent Listings from API */}
        <div className="portal-card p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-brand-900">Recent Listings</h3>
              <p className="text-xs text-brand-500 mt-0.5">Latest from the Property API</p>
            </div>
            <div className="flex items-center gap-2">
              {lastRefreshed && <span className="text-[10px] text-brand-400">Updated {lastRefreshed}</span>}
              <button onClick={() => void loadAll()} className="btn-icon" title="Refresh">
                <IcoRefresh size={14} className={dataLoading ? "animate-spin" : ""} />
              </button>
              <Link to="/listings" className="text-xs text-brand-gold font-semibold hover:underline">See all</Link>
            </div>
          </div>

          {dataLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3 items-center">
                  <div className="skeleton w-14 h-14 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-4 w-2/3" />
                    <div className="skeleton h-3 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentListings.length === 0 ? (
            <div className="text-center py-10">
              <IcoListing size={28} className="mx-auto mb-2 text-brand-200" />
              <p className="text-sm text-brand-400">No listings yet</p>
              <Link to="/listings/new-from-property" className="btn-primary text-xs mt-3 inline-flex">
                + Create First Listing
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentListings.map((l, i) => (
                <div key={l.id} className="flex gap-3 items-center group cursor-pointer">
                  <div className="relative shrink-0 w-14 h-14 rounded-xl overflow-hidden">
                    <img src={PLACEHOLDER_IMAGES[i % PLACEHOLDER_IMAGES.length]} alt=""
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" />
                    {l.type && (
                      <div className="absolute bottom-0.5 left-0.5 text-[8px] font-bold bg-brand-950/80 text-brand-goldlight rounded px-1">
                        {l.type}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-brand-900 truncate">
                      {l.title || `Listing ${l.id.slice(0, 8)}`}
                    </div>
                    {(l.city || l.suburb) && (
                      <div className="flex items-center gap-1 text-[10px] text-brand-500 mt-0.5">
                        <IcoMapPin size={10} />
                        {[l.suburb, l.city].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {l.price != null && (
                      <div className="text-xs font-bold text-brand-gold mt-0.5">
                        KES {l.price.toLocaleString()}/mo
                      </div>
                    )}
                  </div>
                  <IcoChevronRight size={14} className="text-brand-400 shrink-0" />
                </div>
              ))}
            </div>
          )}
          <Link to="/listings" className="mt-4 btn-secondary w-full justify-center text-xs py-2">
            Browse All Listings
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="portal-card p-5">
          <h3 className="font-semibold text-brand-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            {QUICK_ACTIONS.map(a => {
              const Icon = a.Icon;
              return (
                <Link key={a.to} to={a.to}
                  className="group flex flex-col gap-2 p-3 rounded-2xl border border-black/[0.06] hover:border-brand-gold/30 hover:bg-brand-gold/[0.03] transition-all duration-200">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-200"
                    style={{ background: `${a.color}18` }}>
                    <Icon size={15} style={{ color: a.color }} />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-brand-900 leading-tight">{a.label}</div>
                    <div className="text-[9px] text-brand-500 mt-0.5 leading-tight">{a.desc}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Owners + System Status ─────────────────────────── */}
      <div className="grid lg:grid-cols-2 gap-5">

        {/* Recent owners as activity */}
        <div className="portal-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-brand-900">Recent Property Owners</h3>
            <Link to="/owners" className="text-xs text-brand-gold font-semibold hover:underline">View all</Link>
          </div>
          {dataLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="skeleton w-8 h-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3 w-1/2" />
                    <div className="skeleton h-2.5 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentOwners.length === 0 ? (
            <div className="text-center py-8">
              <IcoOwners size={28} className="mx-auto mb-2 text-brand-200" />
              <p className="text-sm text-brand-400">No owners registered yet</p>
              <Link to="/owners" className="btn-primary text-xs mt-3 inline-flex">+ Register Owner</Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentOwners.map((o, i) => (
                <Link key={o.id} to={`/owners/${o.id}`}
                  className="flex items-center gap-3 py-2 border-b border-black/[0.05] last:border-0 hover:text-brand-gold transition-colors group">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-brand-950"
                    style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)", opacity: 0.8 + i * 0.04 }}>
                    {o.fullName.charAt(0) || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-brand-900 group-hover:text-brand-gold transition-colors truncate">{o.fullName}</div>
                    <div className="text-[10px] text-brand-400 truncate">{o.email}</div>
                  </div>
                  <IcoChevronRight size={13} className="text-brand-300 shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* System status + API health */}
        <div className="portal-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-brand-900">API System Status</h3>
            <span className="badge badge-success text-[10px]">Azure APIM</span>
          </div>
          <div className="space-y-2.5">
            {[
              { name: "Auth API",           base: "auth",          ok: true  },
              { name: "PropertyOwner API",  base: "propertyowner", ok: !stats.loading && stats.owners !== "–" },
              { name: "Property API",       base: "property",      ok: !stats.loading && stats.properties !== "–" },
              { name: "Customer API",       base: "customers",     ok: !stats.loading && stats.customers !== "–" },
              { name: "Static Data API",    base: "staticdata",    ok: true  },
              { name: "AI Agent API",       base: "aiagent",       ok: true  },
            ].map(s => (
              <div key={s.name} className="flex items-center justify-between py-1.5 border-b border-black/[0.05] last:border-0">
                <div className="flex items-center gap-2 text-xs text-brand-700">
                  <span className={`w-1.5 h-1.5 rounded-full ${s.ok ? "bg-emerald-500 status-online" : "bg-amber-400"}`} />
                  {s.name}
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium">
                  {stats.loading
                    ? <IcoLoader size={11} className="text-brand-400" />
                    : <span className={s.ok ? "text-emerald-600" : "text-amber-600"}>{s.ok ? "Online" : "Checking"}</span>
                  }
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-black/[0.06]">
            <div className="text-[10px] text-brand-400 text-center">
              All calls proxied through Vite → Azure APIM
            </div>
            <Link to="/settings" className="mt-2 btn-ghost w-full justify-center text-xs py-1.5 text-brand-500">
              Configure Endpoints →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Recent Customers ─────────────────────────────────── */}
      <RecentCustomers />
    </div>
  );
}

function RecentCustomers() {
  const { reloadKey, toast } = usePortal();
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await customersApi.list();
        if (!c) setRows(Array.isArray(data) ? (data as Record<string, unknown>[]).slice(0, 5) : []);
      } catch (e) {
        if (!c && e instanceof ApiError) toast(e.message, "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => { c = true; };
  }, [reloadKey, toast]);

  return (
    <div className="portal-card">
      <div className="flex items-center justify-between p-5 border-b border-black/[0.06]">
        <div>
          <h3 className="font-semibold text-brand-900">Recent Customers</h3>
          <p className="text-xs text-brand-500 mt-0.5">Latest from Customer API</p>
        </div>
        <Link to="/customers" className="btn-secondary text-xs px-3 py-1.5 rounded-lg">View all</Link>
      </div>
      <div className="overflow-x-auto">
        <table className="portal-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Email</th>
              <th>Account Status</th>
              <th>KYC Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>{Array.from({ length: 5 }).map((_, j) => (
                  <td key={j}><div className="skeleton h-4 w-full" /></td>
                ))}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10">
                  <IcoCustomers size={28} className="mx-auto mb-2 text-brand-200" />
                  <div className="text-brand-400 text-sm">No customers yet</div>
                </td>
              </tr>
            ) : rows.map((r) => {
              const name = [r.firstName, r.lastName].filter(Boolean).join(" ") || "—";
              const status = String(r.accountStatus ?? "");
              return (
                <tr key={String(r.id)}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ background: "linear-gradient(135deg, #ede9fe, #8b5cf6)" }}>
                        {(String(r.firstName ?? r.email ?? "?")).charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-brand-900 text-sm">{name}</span>
                    </div>
                  </td>
                  <td className="text-brand-600 text-xs">{String(r.email ?? "—")}</td>
                  <td>
                    <span className={`badge text-[10px] ${
                      status.toLowerCase().includes("active") ? "badge-success" :
                      status.toLowerCase().includes("pend")   ? "badge-warning" : "badge-neutral"
                    }`}>{status || "—"}</span>
                  </td>
                  <td className="text-xs text-brand-600">{String(r.kycStatus ?? "—")}</td>
                  <td>
                    <Link to={`/customers/${String(r.id)}`} className="btn-ghost text-xs text-brand-gold gap-1">
                      <IcoEye size={12} /> View
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
