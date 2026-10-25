import { useEffect, useId, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { customerApi, applicationApi, listingsApi, type TenantApplication, type Listing } from "../lib/api";
import { formatKes, primaryImage, resolveLocation, resolveFirstName } from "../lib/format";
import { useApp } from "../context/AppContext";
import { CardSkeleton, AnimatedCounter, CursorSpotlight, GrainLayer } from "../components/ui";
import { DocumentPreviewModal } from "../components/DocumentPreviewModal";
import {
  IcoArrowRight, IcoBed, IcoBath, IcoBuilding, IcoCalendar,
  IcoKey, IcoLoader, IcoLocation, IcoWallet, IcoX,
  IcoFile, IcoDownload, IcoTrendUp, IcoSearch, IcoHeart,
} from "../components/icons";

/* Reuses the same cinematic interior stock set HomePage.tsx opens with, so a
 * tenant with no property photo of their own yet still gets the same premium
 * hero treatment instead of a flat gradient. */
const FALLBACK_HERO = "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85";

type TenantProperty = {
  id: string;
  listingId?: string;
  title?: string;
  address?: string;
  city?: string;
  suburb?: string;
  primaryImageUrl?: string;
  images?: string[];
  bedrooms?: number;
  bathrooms?: number;
  rentAmount?: number;
  leaseStartDate?: string;
  leaseEndDate?: string;
  status?: string;
  nextDueDate?: string;
  balance?: number;
  documents?: { name: string; url: string }[];
  [key: string]: unknown;
};

type PayModal = { open: boolean; property?: TenantProperty; amount: string; paying: boolean };

/** Tenancies are driven by TenantApplication.status reaching "Active" (confirmed lease + payment) -
 * there is no separate CustomerProperty record created anywhere in the rental flow, so that's the
 * one source of truth for "what am I renting right now" rather than customers/{id}/properties
 * (a distinct, manually-attached relationship nothing in this flow ever populates). */
function toTenantProperty(app: TenantApplication, listing?: Listing): TenantProperty {
  const confirmedPayment = app.payments?.find((p) => p.status === "Confirmed");
  return {
    id: app.id,
    listingId: app.listingId,
    title: listing?.title ?? app.listingTitle,
    city: listing?.city,
    suburb: listing?.suburb,
    primaryImageUrl: listing?.primaryImageUrl ?? undefined,
    images: listing?.images,
    bedrooms: listing?.bedrooms,
    bathrooms: listing?.bathrooms,
    rentAmount: listing?.price,
    leaseStartDate: confirmedPayment?.confirmedAt ?? app.termsAcceptedAt ?? app.createdAt,
    status: app.status.toLowerCase(),
    documents: app.documents?.map((d) => ({ name: d.fileName ?? d.documentType, url: d.fileUrl })),
  };
}

/* ── Radial lease-progress ring — the dashboard's visual centerpiece, a
 * circular gold→teal gradient stroke rather than a flat bar. Degrades to an
 * "Ongoing" dash state when no lease end date exists, never fabricating one. */
function RadialProgress({ pct, topLabel, bottomLabel, size = 104, strokeWidth = 7 }: {
  pct: number | null; topLabel: string; bottomLabel: string; size?: number; strokeWidth?: number;
}) {
  const gradId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = pct == null ? circumference : circumference * (1 - pct / 100);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={radius}
          stroke={`url(#${gradId})`} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.3, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e8d48b" />
            <stop offset="100%" stopColor="#2dd4bf" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-2">
        <span className="font-display text-base font-bold leading-tight text-white">{topLabel}</span>
        <span className="text-[9px] uppercase tracking-wider text-brand-muted leading-tight">{bottomLabel}</span>
      </div>
    </div>
  );
}

function leaseStats(start?: string, end?: string) {
  if (!start) return { pct: null, daysLeft: null };
  const startDate = new Date(start);
  if (!end) return { pct: null, daysLeft: null };
  const endDate = new Date(end);
  const now = Date.now();
  const total = endDate.getTime() - startDate.getTime();
  const elapsed = Math.min(Math.max(now - startDate.getTime(), 0), Math.max(total, 1));
  const pct = total > 0 ? Math.round((elapsed / total) * 100) : 100;
  const daysLeft = Math.max(0, Math.ceil((endDate.getTime() - now) / 86_400_000));
  return { pct, daysLeft };
}

function PayModal({ modal, onClose }: { modal: PayModal; onClose: () => void }) {
  if (!modal.open || !modal.property) return null;
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.92, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md glass-strong rounded-3xl p-7 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-semibold text-white">Pay Rent</h3>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-xl text-white/40 hover:bg-white/10 hover:text-white transition">
            <IcoX size={16} />
          </button>
        </div>
        <div className="mb-4 rounded-xl bg-white/5 p-4 text-sm">
          <div className="font-medium text-white">{modal.property.title ?? "Your Property"}</div>
          <div className="text-brand-muted mt-0.5">{modal.property.suburb ?? modal.property.city}</div>
        </div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Amount (KES)</label>
        <input
          type="number"
          value={modal.amount}
          readOnly
          className="input-dark mb-5"
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-ghost flex-1 justify-center text-sm">Cancel</button>
          <button disabled={modal.paying} className="btn-gold flex-1 justify-center disabled:opacity-50">
            {modal.paying ? <IcoLoader size={18} /> : <><IcoWallet size={16} /> Confirm Payment</>}
          </button>
        </div>
        <p className="mt-4 text-center text-xs text-brand-muted">Secure payment via M-Pesa / Card</p>
      </motion.div>
    </motion.div>
  );
}

export function MyPropertiesPage() {
  const { authUser, customerProfile, toast } = useApp();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<TenantProperty[]>([]);
  const [docs, setDocs] = useState<{ name: string; url: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"active" | "history" | "docs">("active");
  const [payModal, setPayModal] = useState<PayModal>({ open: false, amount: "", paying: false });
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      applicationApi.getByCustomer(customerId, 1, 100).catch(() => ({ items: [] as TenantApplication[] })),
      customerApi.getDocuments(customerId).catch(() => []),
    ]).then(async ([appsRes, docList]) => {
      const apps = appsRes.items.filter((a) => !["Cancelled", "Rejected"].includes(a.status));
      const listingIds = [...new Set(apps.map((a) => a.listingId).filter(Boolean))];
      const listingsById: Record<string, Listing> = {};
      await Promise.all(listingIds.map((id) =>
        listingsApi.getById(id).then((l) => { listingsById[id] = l; }).catch(() => {})
      ));
      setProperties(apps.map((a) => toTenantProperty(a, listingsById[a.listingId])));
      setDocs((docList as { name: string; url: string }[]) ?? []);
    }).catch(() => toast("Failed to load property data", "error")).finally(() => setLoading(false));
  }, [customerId]);

  function openPay(p: TenantProperty) {
    setPayModal({ open: true, property: p, amount: String(p.rentAmount ?? 0), paying: false });
  }

  const active = properties.filter((p) => (p.status ?? "active").toLowerCase() === "active");
  const history = properties.filter((p) => (p.status ?? "active").toLowerCase() !== "active");
  const totalMonthlyRent = active.reduce((sum, p) => sum + (p.rentAmount ?? 0), 0);

  const firstName = resolveFirstName(customerProfile?.fullName || authUser?.name, authUser?.email);

  const activeLocation = active[0] ? resolveLocation(active[0] as never) : null;
  const activePlace = activeLocation?.suburb || activeLocation?.city;
  const heroImage = active[0] ? primaryImage(active[0] as never) : FALLBACK_HERO;

  const floatingStats = [
    { icon: <IcoBuilding size={18} />, value: active.length, label: "Active Tenancies", color: "gold" as const },
    { icon: <IcoTrendUp size={18} />, value: totalMonthlyRent, label: "Monthly Rent (KES)", color: "teal" as const },
    { icon: <IcoFile size={18} />, value: docs.length, label: "Documents on File", color: "violet" as const },
    { icon: <IcoKey size={18} />, value: history.length, label: "Past Tenancies", color: "rose" as const },
  ];
  const accentClasses: Record<string, { bg: string; text: string; ring: string }> = {
    gold: { bg: "bg-brand-gold/15", text: "text-brand-gold", ring: "group-hover:shadow-glow-gold" },
    teal: { bg: "bg-brand-teal/15", text: "text-brand-teallight", ring: "group-hover:shadow-glow-teal" },
    violet: { bg: "bg-violet-400/15", text: "text-violet-300", ring: "" },
    rose: { bg: "bg-rose-400/15", text: "text-rose-300", ring: "" },
  };

  return (
    <div className="pb-24">
      {/* ── Cinematic hero ─────────────────────────────────────────── */}
      <section className="relative h-[360px] sm:h-[420px] overflow-hidden clip-parent grain-overlay">
        <img
          src={heroImage}
          alt=""
          className="ken-burns-img absolute inset-0 h-full w-full object-cover"
        />
        {/* Brand-colored wash — without this the overlay reads as flat neutral
         * grey on most interior photos; these radial tints pull the same
         * gold/teal mood the rest of the app uses out of whatever photo loads. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 60% at 12% 15%, rgba(13,148,136,0.38) 0%, transparent 55%), " +
              "radial-gradient(ellipse 55% 50% at 92% 12%, rgba(201,162,39,0.32) 0%, transparent 55%)",
          }}
        />
        <div className="absolute inset-0 cinematic-overlay" />
        <CursorSpotlight />
        <GrainLayer opacity={0.05} />

        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <span className="section-tag mb-4 inline-flex">My Dashboard</span>
            <h1 className="hero-solid-text font-display text-4xl font-bold text-white sm:text-5xl">
              Welcome back{firstName ? <>, <span className="text-gradient-gold">{firstName}</span></> : null}
            </h1>
            <p className="mt-3 max-w-md text-brand-muted">
              {active.length > 0
                ? activePlace
                  ? `Your home in ${activePlace} is all set.`
                  : "Your tenancy is active and all set."
                : "Manage your rentals, payments, and documents in one place."}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {/* ── Floating stat strip — straddles the hero/content boundary ─── */}
        {!loading && (
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-20 -mt-12 grid grid-cols-2 gap-3 rounded-3xl glass-strong p-4 shadow-elevated sm:grid-cols-4 sm:p-5"
          >
            {floatingStats.map((s) => {
              const a = accentClasses[s.color];
              return (
                <div key={s.label} className={`group flex items-center gap-3 rounded-2xl p-2.5 transition-all duration-300 ${a.ring}`}>
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.bg} ${a.text}`}>
                    {s.icon}
                  </div>
                  <div className="min-w-0">
                    <div className="font-display text-lg font-bold leading-none text-white">
                      <AnimatedCounter value={s.value} />
                    </div>
                    <div className="mt-1 text-[11px] leading-tight text-brand-muted truncate">{s.label}</div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── Quick actions ──────────────────────────────────────────── */}
        <div className="mt-10 grid grid-cols-4 gap-3 sm:gap-4">
          {[
            { icon: <IcoSearch size={20} />, label: "Browse", to: "/explore", color: "gold" as const },
            { icon: <IcoKey size={20} />, label: "Applications", to: "/my-applications", color: "teal" as const },
            { icon: <IcoCalendar size={20} />, label: "Bookings", to: "/bookings", color: "gold" as const },
            { icon: <IcoHeart size={20} />, label: "Saved", to: "/favorites", color: "teal" as const },
          ].map((a, i) => {
            const acc = accentClasses[a.color];
            return (
              <motion.div
                key={a.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              >
                <Link
                  to={a.to}
                  className="btn-magnetic group flex flex-col items-center gap-2.5 rounded-2xl glass-card px-3 py-5 text-center transition-colors duration-300 hover:border-brand-gold/30"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-full ${acc.bg} ${acc.text} transition-all duration-300 ${acc.ring}`}>
                    {a.icon}
                  </div>
                  <span className="text-xs font-medium text-white/85">{a.label}</span>
                </Link>
              </motion.div>
            );
          })}
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div className="mt-10 mb-6 flex gap-1 rounded-2xl bg-white/5 p-1 max-w-sm">
          {(["active", "history", "docs"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium transition capitalize ${tab === t ? "bg-brand-gold text-brand-dark shadow" : "text-brand-muted hover:text-white"}`}
            >
              {t === "docs" ? "Documents" : t === "active" ? "Active" : "History"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2">
            {[...Array(2)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : tab === "active" ? (
          active.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                <IcoBuilding size={30} className="text-white/20" />
              </div>
              <h3 className="font-display text-xl font-semibold text-white">No active tenancies</h3>
              <p className="mt-2 text-brand-muted mb-5">Find your next home and start a tenancy.</p>
              <Link to="/explore" className="btn-gold">Browse Listings <IcoArrowRight size={16} /></Link>
            </div>
          ) : (
            /* Editorial split feature cards — image and detail panel side by side
             * on desktop (Sotheby's-style property spread), one per tenancy. */
            <div className="space-y-6">
              <AnimatePresence>
                {active.map((p, i) => {
                  const loc = resolveLocation(p as never);
                  const { pct, daysLeft } = leaseStats(p.leaseStartDate, p.leaseEndDate);
                  return (
                    <motion.div
                      key={p.id}
                      initial={{ opacity: 0, y: 28 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="card-beam card-dark grid overflow-hidden lg:grid-cols-5"
                    >
                      {/* Image panel */}
                      <div
                        className="relative h-56 cursor-pointer overflow-hidden group lg:col-span-2 lg:h-auto"
                        onClick={() => p.listingId && navigate(`/listing/${p.listingId}`)}
                      >
                        <img
                          src={primaryImage(p as never)}
                          alt={p.title ?? "Property"}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent lg:bg-gradient-to-r" />
                        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs font-semibold text-emerald-300 backdrop-blur-sm">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Active Tenancy
                        </div>
                        <div className="absolute inset-x-0 bottom-0 p-5 lg:hidden">
                          <h3 className="font-display text-xl font-bold text-white">{p.title ?? "Your Property"}</h3>
                        </div>
                      </div>

                      {/* Detail panel */}
                      <div className="flex flex-col justify-between p-6 lg:col-span-3 lg:p-8">
                        <div>
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-gold">Your Residence</span>
                              <h3 className="mt-1 font-display text-2xl font-bold text-white truncate">{p.title ?? "Your Property"}</h3>
                              <div className="mt-1.5 flex items-center gap-1.5 text-sm text-brand-muted">
                                <IcoLocation size={13} className="text-brand-teal shrink-0" />
                                {[loc.suburb, loc.city].filter(Boolean).join(", ") || "Kenya"}
                              </div>
                            </div>
                            <RadialProgress
                              pct={pct}
                              topLabel={pct != null ? `${daysLeft}d` : "—"}
                              bottomLabel={pct != null ? "left on lease" : "ongoing lease"}
                            />
                          </div>

                          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
                            {p.bedrooms != null && <span className="flex items-center gap-1.5"><IcoBed size={14} className="text-brand-muted" /> {p.bedrooms} BR</span>}
                            {p.bathrooms != null && <span className="flex items-center gap-1.5"><IcoBath size={14} className="text-brand-muted" /> {p.bathrooms} BA</span>}
                            <span className="flex items-center gap-1.5 font-display text-lg font-bold text-gradient-gold">
                              {formatKes(p.rentAmount)}<span className="text-xs font-sans font-normal text-brand-muted">/mo</span>
                            </span>
                          </div>

                          {p.nextDueDate && (
                            <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-gold/20 bg-brand-gold/5 px-4 py-3 text-sm">
                              <span className="flex items-center gap-2 text-brand-muted"><IcoCalendar size={14} className="text-brand-gold" /> Next Payment Due</span>
                              <span className="font-semibold text-white">
                                {new Date(p.nextDueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="mt-6 flex gap-2">
                          <button onClick={() => openPay(p)} className="btn-gold btn-magnetic flex-1 justify-center text-sm py-2.5">
                            <IcoWallet size={15} /> Pay Rent
                          </button>
                          {p.listingId && (
                            <button onClick={() => navigate(`/listing/${p.listingId}`)} className="btn-ghost text-sm py-2.5 px-4">
                              View Property <IcoArrowRight size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )
        ) : tab === "history" ? (
          history.length === 0 ? (
            <div className="py-16 text-center text-brand-muted">No past tenancies found.</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {history.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                  className="card-dark flex gap-4 p-5 transition-all duration-200 hover:border-brand-teal/20 hover:-translate-y-0.5"
                >
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                    <img src={primaryImage(p as never)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-white truncate">{p.title ?? "Property"}</h4>
                    <p className="text-xs text-brand-muted mt-0.5">{[p.suburb, p.city].filter(Boolean).join(", ")}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-white/50 capitalize">{p.status ?? "ended"}</span>
                      {p.leaseEndDate && <span className="text-xs text-brand-muted">{new Date(p.leaseEndDate).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}</span>}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          /* Documents — file-manager-style card grid with a gradient icon tile
           * and a hover-reveal download affordance, instead of a plain list. */
          docs.length === 0 ? (
            <div className="py-16 text-center text-brand-muted">No documents available yet.</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {docs.map((doc, i) => (
                <motion.button
                  key={i}
                  onClick={() => setPreviewDoc({ url: doc.url, title: doc.name })}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 8) * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  className="group card-dark flex items-center gap-4 p-4 text-left transition-all duration-200 hover:border-brand-gold/30 hover:-translate-y-0.5 hover:shadow-glow-gold"
                >
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-gold/25 to-brand-teal/15">
                    <IcoFile size={19} className="text-brand-gold" />
                  </div>
                  <span className="flex-1 min-w-0 truncate text-sm text-white">{doc.name}</span>
                  <IcoDownload size={16} className="shrink-0 text-brand-muted transition-colors group-hover:text-brand-gold" />
                </motion.button>
              ))}
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {payModal.open && <PayModal modal={payModal} onClose={() => setPayModal((m) => ({ ...m, open: false }))} />}
      </AnimatePresence>
      {previewDoc && (
        <DocumentPreviewModal url={previewDoc.url} title={previewDoc.title} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}
