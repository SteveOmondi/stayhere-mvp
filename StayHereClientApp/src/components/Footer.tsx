import { Link } from "react-router-dom";
import { IcoArrowRight, IcoEmail, IcoLocation, IcoPhone } from "./icons";
import { Logo } from "./ui";

const LINKS = {
  platform: [
    { to: "/explore", label: "Browse Listings" },
    { to: "/explore?type=Apartment", label: "Apartments" },
    { to: "/explore?type=House", label: "Houses" },
    { to: "/explore?listingType=Sale", label: "For Sale" },
    { to: "/explore?listingType=Rent", label: "For Rent" },
  ],
  company: [
    { to: "/about", label: "About Us" },
    { to: "/contact", label: "Contact" },
    { to: "/about#team", label: "Our Team" },
  ],
  support: [
    { to: "/faq", label: "FAQ" },
    { to: "/terms", label: "Terms of Service" },
    { to: "/privacy", label: "Privacy Policy" },
  ],
};

export function Footer() {
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-white/[0.06] bg-brand-dark">
      {/* Subtle top gradient */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-gold/30 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2 space-y-5">
            <Logo withTagline />
            <p className="max-w-xs text-sm leading-relaxed text-brand-muted">
              Kenya's premier real estate platform connecting tenants with quality homes across Nairobi and beyond.
            </p>
            <div className="space-y-2.5 text-sm text-brand-muted">
              <a href="mailto:hello@stayhere.co.ke" className="flex items-center gap-2.5 hover:text-white transition">
                <IcoEmail size={15} className="text-brand-gold" /> hello@stayhere.co.ke
              </a>
              <a href="tel:+254700000000" className="flex items-center gap-2.5 hover:text-white transition">
                <IcoPhone size={15} className="text-brand-gold" /> +254 700 000 000
              </a>
              <span className="flex items-center gap-2.5">
                <IcoLocation size={15} className="text-brand-gold" /> Westlands, Nairobi, Kenya
              </span>
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/40">Platform</h4>
            <ul className="space-y-3">
              {LINKS.platform.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="group flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition">
                    <IcoArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-gold" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/40">Company</h4>
            <ul className="space-y-3">
              {LINKS.company.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="group flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition">
                    <IcoArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-gold" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-5 text-sm font-semibold uppercase tracking-widest text-white/40">Support</h4>
            <ul className="space-y-3">
              {LINKS.support.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="group flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition">
                    <IcoArrowRight size={12} className="opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-brand-gold" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-8 sm:flex-row">
          <p className="text-xs text-brand-muted">
            &copy; {new Date().getFullYear()} StayHere Technologies Ltd. All rights reserved.
          </p>
          <p className="text-xs text-brand-muted">
            Made with ♥ in Nairobi, Kenya
          </p>
        </div>
      </div>
    </footer>
  );
}
