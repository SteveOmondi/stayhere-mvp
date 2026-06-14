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
  IcoSparkle,
  IcoUser,
  IcoX,
} from "./icons";
import { Logo } from "./ui";

const NAV_LINKS = [
  { to: "/",       label: "Home" },
  { to: "/explore", label: "Explore" },
  { to: "/about",   label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const { isAuthenticated, authUser, favorites, cart, logout } = useApp();
  const [scrolled,     setScrolled]     = useState(false);
  const [mobileOpen,   setMobileOpen]   = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
          scrolled
            ? "bg-brand-dark/90 backdrop-blur-2xl border-b border-white/[0.05] shadow-glass"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-4 sm:px-6 lg:px-8">

          {/* Logo */}
          <Link to="/" className="shrink-0 z-10" onClick={() => setMobileOpen(false)}>
            <Logo withTagline />
          </Link>

          {/* ── Centered pill nav (desktop) ── */}
          <nav className="hidden md:flex absolute left-1/2 -translate-x-1/2">
            <div className={`flex items-center gap-0.5 rounded-full px-2 py-1.5 transition-all duration-300 ${
              scrolled
                ? "bg-white/[0.06] border border-white/[0.08]"
                : "bg-white/[0.08] border border-white/[0.1] backdrop-blur-md"
            }`}>
              {NAV_LINKS.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    `px-4 py-1.5 rounded-full text-[13px] font-hero font-medium uppercase tracking-wide transition-all duration-200 ${
                      isActive
                        ? "bg-brand-gold text-brand-dark shadow-glow-gold"
                        : "text-white/65 hover:text-white hover:bg-white/10"
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </div>
          </nav>

          {/* ── Right actions ── */}
          <div className="flex items-center gap-1.5 z-10">

            {/* Ask Sage */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))}
              className="hidden sm:flex items-center gap-1.5 rounded-full border border-brand-teal/40 bg-brand-teal/10 px-3.5 py-1.5 text-[11px] font-hero font-semibold uppercase tracking-wide text-brand-teallight transition-all duration-200 hover:border-brand-teal hover:bg-brand-teal/20 animate-pulse-glow"
            >
              <IcoSparkle size={12} /> Ask Sage
            </button>

            {/* Favorites */}
            <Link
              to="/favorites"
              className="relative flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
              aria-label="Favorites"
            >
              {favorites.length > 0
                ? <IcoHeartFilled size={19} className="text-brand-gold" />
                : <IcoHeart size={19} />}
              {favorites.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[9px] font-bold text-brand-dark">
                  {favorites.length}
                </span>
              )}
            </Link>

            {/* Cart/Bell */}
            <Link
              to="/cart"
              className="relative hidden sm:flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200"
              aria-label="Enquiries"
            >
              <IcoBell size={19} />
              {cart.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-teal text-[9px] font-bold text-white">
                  {cart.length}
                </span>
              )}
            </Link>

            {/* Auth */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-full border border-white/10 pl-1 pr-3 py-1 text-sm text-white transition-all duration-200 hover:border-white/25 hover:bg-white/5"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-brand-dark shrink-0"
                    style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
                    {(authUser?.name ?? authUser?.email ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden sm:block max-w-[90px] truncate text-[12px] font-medium">
                    {authUser?.name ?? "Account"}
                  </span>
                  <IcoChevDown size={13} className="text-brand-muted" />
                </button>

                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 4, scale: 0.97 }}
                      className="absolute right-0 top-12 w-48 rounded-2xl glass-strong py-2 shadow-elevated border border-white/[0.06]"
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/75 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <IcoUser size={15} /> My Properties
                      </Link>
                      <Link
                        to="/favorites"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-[13px] text-white/75 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <IcoHeart size={15} /> Saved ({favorites.length})
                      </Link>
                      <hr className="my-1 border-white/[0.07]" />
                      <button
                        onClick={() => { logout(); setUserMenuOpen(false); navigate("/"); }}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-[13px] text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <IcoLogout size={15} /> Sign Out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link to="/login" className="btn-gold text-[12px] px-4 py-2 rounded-full font-hero uppercase tracking-wide">
                Sign In
              </Link>
            )}

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white transition-all duration-200 md:hidden"
              aria-label="Menu"
            >
              {mobileOpen ? <IcoX size={19} /> : <IcoMenu size={19} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile fullscreen overlay ── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, clipPath: "circle(0% at calc(100% - 2.5rem) 2rem)" }}
            animate={{ opacity: 1, clipPath: "circle(150% at calc(100% - 2.5rem) 2rem)" }}
            exit={{ opacity: 0, clipPath: "circle(0% at calc(100% - 2.5rem) 2rem)" }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-40 flex flex-col bg-brand-deep md:hidden"
          >
            {/* Grain + glow */}
            <div className="pointer-events-none absolute inset-0 bg-dot-pattern opacity-20" />
            <div className="pointer-events-none absolute top-0 right-0 h-64 w-64 rounded-full bg-brand-gold/10 blur-3xl" />
            <div className="pointer-events-none absolute bottom-0 left-0 h-48 w-48 rounded-full bg-brand-teal/15 blur-3xl" />

            <div className="relative z-10 flex h-16 items-center justify-between px-4">
              <Logo withTagline />
              <button onClick={() => setMobileOpen(false)} className="text-white/60 hover:text-white p-2">
                <IcoX size={22} />
              </button>
            </div>

            <nav className="relative z-10 flex-1 overflow-y-auto p-8 pt-6">
              {NAV_LINKS.map(({ to, label }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink
                    to={to}
                    end={to === "/"}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `block py-4 font-hero font-bold uppercase tracking-widest text-3xl transition-colors ${
                        isActive ? "text-brand-gold" : "text-white/70 hover:text-white"
                      }`
                    }
                  >
                    {label}
                  </NavLink>
                </motion.div>
              ))}

              {[
                { to: "/favorites", label: `Favorites${favorites.length > 0 ? ` (${favorites.length})` : ""}` },
                { to: "/cart",      label: `Enquiries${cart.length > 0 ? ` (${cart.length})` : ""}` },
              ].map(({ to, label }, i) => (
                <motion.div
                  key={to}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.38 + i * 0.07 }}
                >
                  <NavLink
                    to={to}
                    onClick={() => setMobileOpen(false)}
                    className="block py-4 font-hero font-bold uppercase tracking-widest text-3xl text-white/50 hover:text-white/80 transition-colors"
                  >
                    {label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>

            <div className="relative z-10 p-8 pt-0 space-y-3">
              <button
                onClick={() => { setMobileOpen(false); window.dispatchEvent(new CustomEvent("sh:open-ai-chat")); }}
                className="btn-teal w-full justify-center font-hero uppercase tracking-wide"
              >
                <IcoSparkle size={16} /> Chat with Sage AI
              </button>
              {isAuthenticated ? (
                <button
                  onClick={() => { logout(); setMobileOpen(false); navigate("/"); }}
                  className="btn-ghost w-full justify-center text-red-400 border-red-400/25 font-hero uppercase tracking-wide"
                >
                  <IcoLogout size={16} /> Sign Out
                </button>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="btn-gold w-full justify-center font-hero uppercase tracking-wide">
                  Sign In
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spacer */}
      <div className="h-16" />
    </>
  );
}
