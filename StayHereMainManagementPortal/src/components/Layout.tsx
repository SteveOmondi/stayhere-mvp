import { NavLink, Outlet } from "react-router-dom";
import { ManagementOwnerScope } from "./ManagementOwnerScope";
import { usePortal } from "../context/PortalContext";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: "◆" },
  { to: "/owners", label: "Property owners", icon: "◎" },
  { to: "/properties", label: "Properties", icon: "▣" },
  { to: "/listings", label: "Listings", icon: "☰" },
  { to: "/agents-caretakers", label: "Agents & caretakers", icon: "✦" },
  { to: "/customers", label: "Customers", icon: "◇" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

const heroImage =
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=2000&q=80";

export function Layout() {
  const { toasts, dismissToast } = usePortal();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 bg-brand-950 text-brand-cream flex flex-col border-r border-brand-gold/20">
        <div className="p-6 border-b border-white/10">
          <div className="font-display text-2xl text-brand-goldlight tracking-tight">
            StayHere
          </div>
          <p className="text-xs text-white/60 mt-1 uppercase tracking-widest">
            Management portal
          </p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                  isActive
                    ? "bg-brand-gold/20 text-brand-goldlight"
                    : "text-white/75 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span className="opacity-80">{n.icon}</span>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 text-[10px] text-white/40 leading-relaxed">
          Pick the active property owner at the top of the main panel; API bases live under Settings.
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="relative h-44 shrink-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 hero-overlay" />
          <div className="relative z-10 h-full flex flex-col justify-end p-8 max-w-5xl">
            <h1 className="font-display text-3xl md:text-4xl text-white tracking-tight">
              Kenyan real estate operations
            </h1>
            <p className="text-white/80 mt-2 max-w-2xl text-sm md:text-base">
              Owners, listings, agents, caretakers, and renters — one control
              surface aligned with your StayHere backend.
            </p>
          </div>
        </header>

        <main className="flex-1 p-6 md:p-10 -mt-8 relative z-20">
          <div className="glass-panel p-6 md:p-8 min-h-[480px]">
            <ManagementOwnerScope />
            <Outlet />
          </div>
        </main>
      </div>

      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => dismissToast(t.id)}
            className={`w-full text-left px-4 py-3 rounded-xl shadow-lg text-sm border ${
              t.type === "error"
                ? "bg-red-50 border-red-200 text-red-900"
                : t.type === "success"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                  : "bg-brand-900 border-brand-700 text-brand-cream"
            }`}
          >
            {t.message}
          </button>
        ))}
      </div>
    </div>
  );
}
