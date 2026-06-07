import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useOwner } from "../context/OwnerContext";
import {
  IcoDashboard, IcoBuilding, IcoListing, IcoUser, IcoTeam,
  IcoAnalytics, IcoNotice, IcoOnboard, IcoSettings,
  IcoBell, IcoLogout, IcoWallet, IcoX, IcoChevRight,
} from "./icons";

const NAV = [
  { group: "My Portfolio", items: [
    { to: "/dashboard",   label: "Dashboard",     Icon: IcoDashboard },
    { to: "/properties",  label: "My Properties",  Icon: IcoBuilding  },
    { to: "/listings",    label: "Units & Listings",Icon: IcoListing   },
  ]},
  { group: "People", items: [
    { to: "/tenants",    label: "Tenants",         Icon: IcoUser      },
    { to: "/team",       label: "My Team",         Icon: IcoTeam      },
    { to: "/onboarding", label: "Tenant Onboarding",Icon: IcoOnboard  },
  ]},
  { group: "Insights", items: [
    { to: "/analytics",  label: "Analytics",       Icon: IcoAnalytics },
    { to: "/noticeboard",label: "Notice Board",    Icon: IcoNotice    },
  ]},
  { group: "Account", items: [
    { to: "/settings",   label: "Settings",        Icon: IcoSettings  },
  ]},
];

const BREADCRUMBS: Record<string, string> = {
  "/dashboard": "Dashboard", "/properties": "My Properties", "/listings": "Units & Listings",
  "/tenants": "Tenants", "/team": "My Team", "/onboarding": "Tenant Onboarding",
  "/analytics": "Analytics", "/noticeboard": "Notice Board", "/settings": "Settings",
};

export function Layout() {
  const { owner, authUser, logout, toasts, dismissToast } = useOwner();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const title = BREADCRUMBS["/" + pathname.split("/").filter(Boolean)[0]] ?? "Portal";

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f7]">

      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside
        className="shrink-0 flex flex-col transition-all duration-300 overflow-hidden"
        style={{ width: collapsed ? 72 : 268, background: "#0c1222", boxShadow: "4px 0 24px rgba(0,0,0,0.18)" }}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/[0.07] shrink-0">
          <div className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-xs text-brand-950 animate-float"
            style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>SH</div>
          {!collapsed && (
            <div className="min-w-0 animate-fade-in">
              <div className="font-display text-xl text-brand-teallight leading-tight">StayHere</div>
              <div className="text-[10px] text-white/30 uppercase tracking-widest">Owner Portal</div>
            </div>
          )}
          <button onClick={() => setCollapsed(v => !v)}
            className="ml-auto shrink-0 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.06] transition-colors">
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Wallet pill */}
        {!collapsed && owner?.walletBalance != null && (
          <div className="mx-3 mt-3 px-3 py-2 rounded-xl flex items-center gap-2 animate-fade-in"
            style={{ background: "rgba(13,148,136,0.12)", border: "1px solid rgba(13,148,136,0.2)" }}>
            <IcoWallet size={14} className="text-brand-teallight shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-white/35">Wallet Balance</div>
              <div className="text-xs font-bold text-brand-teallight">KES {owner.walletBalance.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2.5 overflow-y-auto space-y-0.5">
          {NAV.map(group => (
            <div key={group.group}>
              {!collapsed && <div className="nav-section">{group.group}</div>}
              {collapsed && <div className="h-3" />}
              {group.items.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} title={collapsed ? label : undefined}
                  className={({ isActive }) => `nav-item ${isActive ? "active" : ""} ${collapsed ? "justify-center px-0" : ""}`}>
                  <Icon size={18} className="shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="shrink-0 p-3 border-t border-white/[0.07]">
          {!collapsed ? (
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
                style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                {(owner?.fullName ?? authUser?.name ?? "O").charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-white truncate">{owner?.fullName ?? authUser?.name ?? "Owner"}</div>
                <div className="text-[10px] text-white/35 truncate">{owner?.email ?? authUser?.email ?? ""}</div>
              </div>
              <button onClick={logout} title="Sign out" className="text-white/30 hover:text-red-400 transition-colors p-1">
                <IcoLogout size={15} />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button onClick={logout} title="Sign out"
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white hover:ring-2 hover:ring-red-400/50 transition-all"
                style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                {(owner?.fullName ?? "O").charAt(0).toUpperCase()}
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="shrink-0 flex items-center justify-between px-6 bg-white border-b border-black/[0.07]" style={{ height: 64 }}>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-brand-500 font-medium">Owner Portal</span>
            <IcoChevRight size={14} className="text-brand-400" />
            <span className="font-semibold text-brand-900">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700">
              <span className="w-1.5 h-1.5 rounded-full bg-teal-500 dot-online" />
              Live
            </div>
            <button className="relative p-2.5 rounded-xl text-brand-600 hover:bg-slate-100 transition-colors">
              <IcoBell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-brand-teal ring-2 ring-white" />
            </button>
            {owner?.fullName && (
              <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold bg-teal-50 text-teal-800">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                  {owner.fullName.charAt(0)}
                </div>
                {owner.fullName}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 lg:p-8 animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Toasts ──────────────────────────────────────────── */}
      <div className="fixed bottom-5 right-5 z-[200] space-y-2.5 w-80 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id}
            className={`toast pointer-events-auto animate-slide-up ${t.type === "error" ? "toast-error" : t.type === "success" ? "toast-success" : "toast-info"}`}>
            <span className={`shrink-0 w-2 h-2 rounded-full mt-1 ${t.type === "error" ? "bg-red-500" : t.type === "success" ? "bg-emerald-500" : "bg-brand-teal"}`} />
            <span className="flex-1 leading-snug">{t.message}</span>
            <button onClick={() => dismissToast(t.id)} className="shrink-0 text-current/40 hover:text-current/70 transition-colors ml-1">
              <IcoX size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
