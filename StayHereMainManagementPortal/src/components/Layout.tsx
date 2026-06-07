import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { usePortal } from "../context/PortalContext";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import {
  IcoDashboard, IcoOwners, IcoBuilding, IcoListing, IcoAgents, IcoCustomers,
  IcoAnalytics, IcoAI, IcoCategory, IcoSettings, IcoBell, IcoSearch,
  IcoChevronDown, IcoRefresh, IcoX, IcoTrendUp, IcoActivity, IcoLogout,
  IcoUsers, IcoDatabase,
} from "./icons";

const navGroups = [
  {
    label: "Operations",
    items: [
      { to: "/dashboard",         label: "Dashboard",          Icon: IcoDashboard },
      { to: "/owners",            label: "Property Owners",    Icon: IcoOwners    },
      { to: "/properties",        label: "Properties",         Icon: IcoBuilding  },
      { to: "/listings",          label: "Listings",           Icon: IcoListing   },
      { to: "/agents-caretakers", label: "Agents & Caretakers",Icon: IcoAgents    },
      { to: "/customers",         label: "Customers",          Icon: IcoCustomers },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/analytics", label: "Analytics", Icon: IcoAnalytics },
      { to: "/ai-agent",  label: "AI Agent",  Icon: IcoAI        },
    ],
  },
  {
    label: "System",
    items: [
      { to: "/users",          label: "User Management", Icon: IcoUsers    },
      { to: "/reference-data", label: "Reference Data",  Icon: IcoDatabase },
      { to: "/categories",     label: "Categories",      Icon: IcoCategory },
      { to: "/settings",       label: "Settings",        Icon: IcoSettings },
    ],
  },
];

function useBreadcrumb(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/owners": "Property Owners",
    "/properties": "Properties",
    "/listings": "Listings",
    "/agents-caretakers": "Agents & Caretakers",
    "/customers": "Customers",
    "/analytics": "Analytics",
    "/ai-agent": "AI Agent",
    "/users":          "User Management",
    "/reference-data": "Reference Data",
    "/categories":     "Categories",
    "/settings":       "Settings",
  };
  const key = "/" + pathname.split("/").filter(Boolean)[0];
  return map[key] ?? "Portal";
}

export function Layout() {
  const { toasts, dismissToast, config, setConfig, bumpReload,
    ownerDirectory, ownerDirectoryLoading, refreshOwnerDirectory,
    adminUser, logout } = usePortal();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [ownerDropOpen, setOwnerDropOpen] = useState(false);
  const pageTitle = useBreadcrumb(location.pathname);
  const activeOwner = effectiveOwnerId(config);
  const activeOwnerName = ownerDirectory.find(o => o.userId === activeOwner || o.id === activeOwner)?.fullName
    || (activeOwner ? activeOwner.slice(0, 8) + "…" : "All owners");

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#f0f2f7" }}>

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col transition-all duration-300 overflow-hidden"
        style={{
          width: sidebarOpen ? 272 : 72,
          background: "#0c1222",
          boxShadow: "4px 0 24px rgba(0,0,0,0.18)",
        }}
      >
        {/* Brand header */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.07] shrink-0">
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-sm text-brand-950"
            style={{ background: "linear-gradient(135deg, #e8d48b 0%, #c9a227 100%)" }}>
            SH
          </div>
          {sidebarOpen && (
            <div className="min-w-0 animate-fade-in">
              <div className="font-display text-xl text-brand-goldlight leading-tight">StayHere</div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest font-medium">Admin Portal</div>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="ml-auto shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              {sidebarOpen
                ? <><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></>
                : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>
              }
            </svg>
          </button>
        </div>

        {/* Owner scope selector */}
        {sidebarOpen && (
          <div className="px-3 py-3 border-b border-white/[0.06] shrink-0">
            <div className="text-[9px] font-bold uppercase tracking-widest text-white/25 mb-2 px-1">
              Active Owner Scope
            </div>
            <div className="relative">
              <button
                onClick={() => setOwnerDropOpen(v => !v)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/70 hover:text-white/90 transition-colors"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-brand-950"
                  style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)" }}>
                  {activeOwnerName.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 text-left truncate">{activeOwnerName}</span>
                <IcoChevronDown size={12} className={`shrink-0 transition-transform ${ownerDropOpen ? "rotate-180" : ""}`} />
              </button>
              {ownerDropOpen && (
                <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-xl border border-white/10 overflow-hidden shadow-modal animate-scale-in"
                  style={{ background: "#1e293b", maxHeight: 240, overflowY: "auto" }}>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Select Owner</span>
                    <button onClick={() => { void refreshOwnerDirectory(); }} className="text-white/40 hover:text-white/70">
                      <IcoRefresh size={12} />
                    </button>
                  </div>
                  <button
                    className="w-full text-left px-3 py-2 text-xs text-white/60 hover:bg-white/[0.06] hover:text-white transition-colors"
                    onClick={() => { setConfig({ defaultOwnerUserId: "" }); bumpReload(); setOwnerDropOpen(false); }}
                  >
                    — All owners
                  </button>
                  {ownerDirectoryLoading
                    ? <div className="px-3 py-2 text-[10px] text-white/30">Loading…</div>
                    : ownerDirectory.map(o => (
                      <button
                        key={o.id}
                        className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                          activeOwner === o.userId || activeOwner === o.id
                            ? "text-brand-goldlight bg-brand-gold/10"
                            : "text-white/60 hover:bg-white/[0.06] hover:text-white"
                        }`}
                        onClick={() => {
                          setConfig({ defaultOwnerUserId: o.userId || o.id });
                          bumpReload();
                          setOwnerDropOpen(false);
                        }}
                      >
                        <div className="font-medium">{o.fullName || o.email}</div>
                        {o.email && <div className="text-[10px] text-white/30 mt-0.5">{o.email}</div>}
                      </button>
                    ))
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
          {navGroups.map(group => (
            <div key={group.label}>
              {sidebarOpen && (
                <div className="nav-section">{group.label}</div>
              )}
              {!sidebarOpen && <div className="h-3" />}
              {group.items.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={!sidebarOpen ? label : undefined}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""} ${!sidebarOpen ? "justify-center px-0" : ""}`
                  }
                >
                  <Icon size={18} className="shrink-0" />
                  {sidebarOpen && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* Bottom user section */}
        <div className="shrink-0 p-3 border-t border-white/[0.07]">
          {sidebarOpen ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-brand-950 shrink-0"
                style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)" }}>
                {(adminUser?.name ?? adminUser?.email ?? "A").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">
                  {adminUser?.name ?? adminUser?.email ?? "Admin User"}
                </div>
                <div className="text-[10px] text-white/35 truncate">
                  {adminUser?.role ?? "Portal Manager"}
                </div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="text-white/30 hover:text-red-400 transition-colors p-1"
              >
                <IcoLogout size={15} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                onClick={logout}
                title="Sign out"
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-brand-950 hover:ring-2 hover:ring-red-400/50 transition-all"
                style={{ background: "linear-gradient(135deg, #e8d48b, #c9a227)" }}
              >
                {(adminUser?.name ?? adminUser?.email ?? "A").charAt(0).toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="shrink-0 flex items-center justify-between px-6 bg-white border-b border-black/[0.07]"
          style={{ height: 64 }}>

          {/* Breadcrumb */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-brand-500 font-medium">StayHere</span>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" className="text-brand-400">
                <polyline points="9 18 15 12 9 6" />
              </svg>
              <span className="font-semibold text-brand-900">{pageTitle}</span>
            </div>
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/[0.08] bg-slate-50/80 text-brand-500 text-sm w-56 cursor-pointer hover:border-brand-gold/40 transition-colors">
              <IcoSearch size={15} className="shrink-0" />
              <span className="text-brand-400 text-xs">Search anything…</span>
              <kbd className="ml-auto text-[10px] bg-white border border-black/[0.08] rounded px-1.5 py-0.5 text-brand-400 font-mono">⌘K</kbd>
            </div>

            {/* Live indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 status-online" />
              Live
            </div>

            {/* Notifications */}
            <button className="relative p-2.5 rounded-xl text-brand-600 hover:bg-slate-100 transition-colors">
              <IcoBell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-gold ring-2 ring-white" />
            </button>

            {/* Activity */}
            <button className="hidden lg:flex p-2.5 rounded-xl text-brand-600 hover:bg-slate-100 transition-colors">
              <IcoActivity size={18} />
            </button>

            {/* Analytics shortcut */}
            <button className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-brand-950/[0.06] text-brand-900 hover:bg-brand-950/[0.10] transition-colors">
              <IcoTrendUp size={14} />
              <span>Analytics</span>
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Toast stack ──────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[200] space-y-2.5 w-80 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={`toast pointer-events-auto animate-slide-up ${
              t.type === "error"   ? "toast-error"   :
              t.type === "success" ? "toast-success" : "toast-info"
            }`}
          >
            <span className={`shrink-0 w-2 h-2 rounded-full mt-1 ${
              t.type === "error"   ? "bg-red-500"     :
              t.type === "success" ? "bg-emerald-500" : "bg-brand-gold"
            }`} />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismissToast(t.id)}
              className="shrink-0 text-current/40 hover:text-current/70 transition-colors ml-1"
            >
              <IcoX size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
