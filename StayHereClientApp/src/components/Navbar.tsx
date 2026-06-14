import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  IcoBell,
  IcoChevDown,
  IcoHeart,
  IcoHeartFilled,
  IcoLogout,
  IcoMenu,
  IcoSearch,
  IcoSparkle,
  IcoUser,
  IcoX,
} from "./icons";
import { Logo } from "./ui";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const { isAuthenticated, authUser, favorites, cart, logout } = useApp();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    if (mobileOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "glass-strong shadow-glass" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Logo */}
          <Link to="/" className="shrink-0" onClick={() => setMobileOpen(false)}>
            <Logo withTagline />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === "/"}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "text-brand-gold bg-brand-gold/10"
                      : "text-white/70 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* AI Button */}
            <button
              className="hidden sm:flex items-center gap-2 rounded-xl border border-brand-teal/40 px-3 py-2 text-xs font-semibold text-brand-teallight transition hover:border-brand-teal hover:bg-brand-teal/10 animate-pulse-glow"
              onClick={() => {
                const event = new CustomEvent("sh:open-ai-chat");
                window.dispatchEvent(event);
              }}
            >
              <IcoSparkle size={14} />
              Ask Sage
            </button>

            {/* Favorites */}
            <Link
              to="/favorites"
              className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition"
              aria-label="Favorites"
            >
              {favorites.length > 0 ? (
                <IcoHeartFilled size={20} className="text-brand-gold" />
              ) : (
                <IcoHeart size={20} />
              )}
              {favorites.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[9px] font-bold text-brand-dark">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition"
              aria-label="Enquiries"
            >
              <IcoBell size={20} />
              {cart.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-teal text-[9px] font-bold text-white">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-sm text-white transition hover:border-white/30 hover:bg-white/5"
                >
                  <div className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-brand-dark" style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
                    {(authUser?.name ?? authUser?.email ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">
                    {authUser?.name ?? "Account"}
                  </span>
                  <IcoChevDown size={14} className="text-brand-muted" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="absolute right-0 top-12 w-48 rounded-2xl glass-strong py-2 shadow-elevated"
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition"
                      >
                        <IcoUser size={16} /> My Properties
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-white/80 hover:bg-white/5 hover:text-white transition"
                      >
                        <IcoHeart size={16} /> Saved ({favorites.length})
                      </Link>
                      <hr className="my-1 border-white/10" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); navigate("/"); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition"
                      >
                        <IcoLogout size={16} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="btn-gold text-sm px-4 py-2 rounded-xl">
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:bg-white/5 hover:text-white transition md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <IcoX size={20} /> : <IcoMenu size={20} />}
            </button>
          </div>
        </div>

        {/* Search bar hint */}
        <div className="hidden lg:block border-t border-white/5 px-8 py-1.5">
          <button
            onClick={() => navigate("/explore")}
            className="mx-auto flex items-center gap-2 text-xs text-brand-muted hover:text-white transition"
          >
            <IcoSearch size={13} />
            Search listings by location, type, price…
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 flex flex-col bg-brand-dark md:hidden"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <Logo withTagline />
              <button onClick={() => setMobileOpen(false)} className="text-white/70 hover:text-white">
                <IcoX size={22} />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-6 space-y-2">
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `block rounded-2xl px-5 py-4 text-lg font-semibold transition ${
                      isActive
                        ? "text-brand-gold bg-brand-gold/10"
                        : "text-white/80 hover:bg-white/5 hover:text-white"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
              <NavLink
                to="/favorites"
                onClick={() => setMobileOpen(false)}
                className="block rounded-2xl px-5 py-4 text-lg font-semibold text-white/80 hover:bg-white/5 hover:text-white transition"
              >
                Favorites {favorites.length > 0 && <span className="ml-2 rounded-full bg-brand-gold px-2 py-0.5 text-xs text-brand-dark">{favorites.length}</span>}
              </NavLink>
              <NavLink
                to="/cart"
                onClick={() => setMobileOpen(false)}
                className="block rounded-2xl px-5 py-4 text-lg font-semibold text-white/80 hover:bg-white/5 hover:text-white transition"
              >
                Enquiries {cart.length > 0 && <span className="ml-2 rounded-full bg-brand-teal px-2 py-0.5 text-xs text-white">{cart.length}</span>}
              </NavLink>
            </nav>
            <div className="p-6 space-y-3">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  window.dispatchEvent(new CustomEvent("sh:open-ai-chat"));
                }}
                className="btn-teal w-full justify-center"
              >
                <IcoSparkle size={18} /> Chat with Sage AI
              </button>
              {isAuthenticated ? (
                <button onClick={() => { logout(); setMobileOpen(false); navigate("/"); }} className="btn-ghost w-full justify-center text-red-400 border-red-400/30">
                  <IcoLogout size={18} /> Sign Out
                </button>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-gold w-full justify-center">
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer for fixed navbar */}
      <div className="h-16" />
      {/* Extra spacer for the search hint bar */}
      <div className="hidden lg:block h-8" />
    </>
  );
}
