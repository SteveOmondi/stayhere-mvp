import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { applicationApi, listingsApi, shortStayApi, type TenantApplication, type Listing, type ShortStayBooking } from "../lib/api";
import { useApp } from "../context/AppContext";
import { loginUrlWithRedirect } from "../lib/authRedirect";
import { listingLocation, formatKes, primaryImage } from "../lib/format";
import { GradientBlobs, SectionHeading, SkeletonGrid } from "../components/ui";
import { DocumentPreviewModal } from "../components/DocumentPreviewModal";
import {
  IcoArrowRight, IcoCalendar, IcoCheck, IcoChevRight, IcoKey, IcoLoader, IcoX,
  IcoUser, IcoShare, IcoEye, IcoWallet, IcoSparkle,
} from "../components/icons";

const STAY_STATUS_STYLES: Record<string, string> = {
  PendingPayment: "bg-amber-500/15 text-amber-300",
  Confirmed: "bg-emerald-500/15 text-emerald-300",
  Completed: "bg-brand-teallight/15 text-brand-teallight",
  Cancelled: "bg-red-500/15 text-red-300",
};
const STAY_STATUS_LABELS: Record<string, string> = {
  PendingPayment: "Payment Pending",
  Confirmed: "Confirmed",
  Completed: "Completed",
  Cancelled: "Cancelled",
};
const STAY_TERMINAL_STATUSES = new Set(["Cancelled", "Completed"]);

function formatStayDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
}

function StayCard({ booking }: { booking: ShortStayBooking }) {
  const needsPayment = booking.status === "PendingPayment";
  const needsVerification = booking.status === "Confirmed" && !booking.documentsSubmittedAt;
  const resumeUrl = `/book-stay?listingId=${booking.listingId}&bookingId=${booking.id}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl glass-strong border border-white/[0.06] p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <Link to={`/listing/${booking.listingId}`} className="truncate font-display text-base font-semibold text-white hover:text-brand-gold transition">
          {booking.listingTitle ?? "StayHere listing"}
        </Link>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STAY_STATUS_STYLES[booking.status] ?? "bg-white/10 text-white/60"}`}>
          {STAY_STATUS_LABELS[booking.status] ?? booking.status}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
        <span className="flex items-center gap-1"><IcoCalendar size={13} /> {formatStayDate(booking.checkInDate)} → {formatStayDate(booking.checkOutDate)}</span>
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px]">{booking.numberOfGuests} guest{booking.numberOfGuests !== 1 ? "s" : ""}</span>
      </div>
      <div className="mt-1 text-xs text-brand-gold">Booking fee: {formatKes(booking.bookingFeeAmount)}</div>

      {needsPayment && (
        <Link to={resumeUrl} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-gold hover:underline">
          <IcoWallet size={13} /> Complete Payment <IcoArrowRight size={12} />
        </Link>
      )}
      {needsVerification && (
        <Link to={resumeUrl} className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-brand-teallight hover:underline">
          <IcoKey size={13} /> Verify Your ID <IcoArrowRight size={12} />
        </Link>
      )}
      {booking.status === "Confirmed" && booking.documentsSubmittedAt && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-400">
          <IcoCheck size={13} /> All set for check-in
        </div>
      )}
    </motion.div>
  );
}

function ShortStayBookingsPanel({ customerId }: { customerId?: string }) {
  const [bookings, setBookings] = useState<ShortStayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    shortStayApi.getByCustomer(customerId)
      .then((r) => setBookings(r.items))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [customerId]);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return {
      upcoming: sorted.filter((b) => !STAY_TERMINAL_STATUSES.has(b.status)),
      past: sorted.filter((b) => STAY_TERMINAL_STATUSES.has(b.status)),
    };
  }, [bookings]);

  const visible = tab === "upcoming" ? upcoming : past;

  return (
    <>
      <div className="mb-6 flex gap-2 rounded-xl bg-white/5 p-1 w-fit">
        {(["upcoming", "past"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium capitalize transition ${
              tab === t ? "bg-white/10 text-white" : "text-brand-muted hover:text-white/80"
            }`}
          >
            {t} {t === "upcoming" ? `(${upcoming.length})` : `(${past.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonGrid count={3} />
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
            <IcoKey size={36} className="text-white/20" />
          </div>
          <h3 className="font-display text-xl font-semibold text-white">
            {tab === "upcoming" ? "No upcoming stays" : "No past stays yet"}
          </h3>
          <p className="mt-2 text-brand-muted">
            {tab === "upcoming"
              ? "Book a short stay from any listing to see it here."
              : "Completed and cancelled stays will show up here."}
          </p>
          {tab === "upcoming" && (
            <Link to="/explore" className="btn-gold mt-6">
              Explore Listings <IcoArrowRight size={17} />
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((b) => <StayCard key={b.id} booking={b} />)}
        </div>
      )}
    </>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; glow: string; step: number }> = {
  PendingApproval:  { label: "Pending Approval",    color: "text-purple-400",  bg: "bg-purple-400/15",  glow: "#a78bfa", step: 1 },
  DocumentsPending: { label: "Documents Pending",  color: "text-yellow-400",  bg: "bg-yellow-400/15",  glow: "#facc15", step: 2 },
  UnderReview:      { label: "Under Review",        color: "text-blue-400",    bg: "bg-blue-400/15",    glow: "#60a5fa", step: 3 },
  Approved:         { label: "Approved",            color: "text-emerald-400", bg: "bg-emerald-400/15", glow: "#34d399", step: 4 },
  Rejected:         { label: "Not Approved",        color: "text-red-400",     bg: "bg-red-400/15",     glow: "#f87171", step: 4 },
  TermsAccepted:    { label: "Terms Accepted",      color: "text-teal-400",    bg: "bg-teal-400/15",    glow: "#2dd4bf", step: 5 },
  PaymentPending:   { label: "Payment Pending",     color: "text-orange-400",  bg: "bg-orange-400/15",  glow: "#fb923c", step: 6 },
  Active:           { label: "Active Tenancy",      color: "text-green-400",   bg: "bg-green-400/15",   glow: "#4ade80", step: 7 },
  Cancelled:        { label: "Cancelled",           color: "text-gray-400",    bg: "bg-gray-400/15",    glow: "#9ca3af", step: 0 },
};

/** The 7-stage narrative arc every application moves through - same step numbering as
 * STATUS_CONFIG above, just with an icon + short description per stage for the stepper UI. */
const STAGES = [
  { step: 1, label: "Application",  desc: "Submitted, awaiting initial review", Icon: IcoUser },
  { step: 2, label: "Documents",    desc: "Upload your ID & signature",         Icon: IcoShare },
  { step: 3, label: "Review",       desc: "Owner reviews your documents",       Icon: IcoEye },
  { step: 4, label: "Decision",     desc: "Approved or declined",               Icon: IcoCheck },
  { step: 5, label: "Terms",        desc: "Accept the lease terms",             Icon: IcoKey },
  { step: 6, label: "Payment",      desc: "Secure the unit",                    Icon: IcoWallet },
  { step: 7, label: "Move In",      desc: "Welcome home!",                      Icon: IcoSparkle },
] as const;

/** Resolves an application's status into stepper state: which stages are complete, which one is
 * actively in progress (pulses in the UI), and - for Rejected - which stage it stopped at. This is
 * deliberately NOT just "steps before cfg.step are done": e.g. Approved means the decision stage
 * itself is done and Terms is what's actionable next, not that Approved is still "in progress". */
function getStepperState(app: TenantApplication): { doneUpTo: number; current: number | null; rejectedAt: number | null } {
  const hasDocs = (app.documents?.length ?? 0) > 0;
  switch (app.status) {
    case "PendingApproval":  return { doneUpTo: 0, current: 1, rejectedAt: null };
    case "DocumentsPending": return { doneUpTo: 1, current: 2, rejectedAt: null };
    case "UnderReview":      return { doneUpTo: 2, current: 3, rejectedAt: null };
    case "Approved":         return { doneUpTo: 4, current: 5, rejectedAt: null };
    case "TermsAccepted":    return { doneUpTo: 5, current: 6, rejectedAt: null };
    case "PaymentPending":   return { doneUpTo: 5, current: 6, rejectedAt: null };
    case "Active":           return { doneUpTo: 7, current: null, rejectedAt: null };
    // Rejected can happen at the pre-screen gate (no documents were ever requested) or at the
    // document-review gate (documents exist) - the presence of documents tells us which.
    case "Rejected":         return hasDocs
      ? { doneUpTo: 3, current: null, rejectedAt: 4 }
      : { doneUpTo: 1, current: null, rejectedAt: 2 };
    default:                 return { doneUpTo: 0, current: 1, rejectedAt: null };
  }
}

const PAGE_SIZE = 10;

export function MyApplicationsPage() {
  const { authUser, customerProfile, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [section, setSection] = useState<"applications" | "stays">(
    searchParams.get("section") === "stays" ? "stays" : "applications"
  );
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantApplication | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  // The applications list itself never includes price/image (see TenantApplication's comment in
  // lib/api.ts) - fetched separately per distinct listing so cards/detail can show the actual
  // property instead of just an application id and a generic house icon.
  const [listingsById, setListingsById] = useState<Record<string, Listing>>({});

  // customerProfile is only ever populated by a profile fetch that doesn't actually run anywhere
  // in this app today - every other page that needs an id (RentalFlowPage, MyPropertiesPage,
  // MyBookingsPage) already falls back to the JWT's own authUser.id for exactly this reason. This
  // page was missing that fallback, so customerId silently stayed "" forever: the effect below
  // returned before ever calling the API, leaving the loading spinner stuck with no way out.
  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id ?? "";

  useEffect(() => {
    if (!isAuthenticated) { navigate(loginUrlWithRedirect("/my-applications"), { replace: true }); return; }
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    applicationApi.getByCustomer(customerId, page, PAGE_SIZE)
      .then((res) => {
        setApplications(res.items);
        setTotalPages(Math.max(1, res.totalPages));
        const ids = [...new Set(res.items.map((a) => a.listingId).filter(Boolean))];
        for (const id of ids) {
          listingsApi.getById(id).then((l) => setListingsById((m) => ({ ...m, [id]: l }))).catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, customerId, page]);

  const activeApps = applications.filter((a) => !["Cancelled"].includes(a.status));
  const pastApps = applications.filter((a) => a.status === "Cancelled");
  const stats = {
    total: applications.length,
    active: applications.filter((a) => !["Cancelled", "Rejected", "Active"].includes(a.status)).length,
    approved: applications.filter((a) => ["Approved", "TermsAccepted", "PaymentPending"].includes(a.status)).length,
    homes: applications.filter((a) => a.status === "Active").length,
  };

  return (
    <div className="min-h-screen pb-24 gradient-hero relative overflow-hidden">
      <GradientBlobs />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <SectionHeading
          title="My Applications"
          subtitle="Track all your rental applications and short-stay bookings"
        />

        <div className="mt-6 flex gap-2 rounded-xl bg-white/[0.03] border border-white/10 p-1 w-fit">
          {(["applications", "stays"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSection(s)}
              className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                section === s ? "bg-brand-gold text-brand-dark" : "text-brand-muted hover:text-white"
              }`}
            >
              {s === "applications" ? "Applications" : "My Stays"}
            </button>
          ))}
        </div>

        {section === "stays" ? (
          <div className="mt-8">
            <ShortStayBookingsPanel customerId={customerId} />
          </div>
        ) : (
        <>
        {!loading && applications.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4"
          >
            {[
              { label: "Total",    value: stats.total,    icon: <IcoUser size={16} />,    accent: "text-white",         bg: "bg-white/[0.04]" },
              { label: "In Progress", value: stats.active, icon: <IcoLoader size={16} />, accent: "text-brand-gold",    bg: "bg-brand-gold/[0.08]" },
              { label: "Approved",  value: stats.approved, icon: <IcoCheck size={16} />,  accent: "text-emerald-400",   bg: "bg-emerald-400/[0.08]" },
              { label: "Active Homes", value: stats.homes, icon: <IcoSparkle size={16} />, accent: "text-teal-400",     bg: "bg-teal-400/[0.08]" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className={`glass rounded-2xl p-4 border border-white/[0.06] ${s.bg}`}
              >
                <div className={`flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-medium text-brand-muted`}>
                  {s.icon} {s.label}
                </div>
                <div className={`mt-2 font-display text-2xl font-bold ${s.accent}`}>{s.value}</div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {loading ? (
          <div className="space-y-4 mt-8">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass rounded-2xl p-5 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-xl bg-white/[0.06]" />
                  <div className="flex-1 space-y-2.5 py-1">
                    <div className="h-3.5 w-40 rounded-full bg-white/[0.06]" />
                    <div className="h-2.5 w-24 rounded-full bg-white/[0.05]" />
                    <div className="h-1.5 w-full rounded-full bg-white/[0.04] mt-3" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : applications.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-gold/15 to-brand-teal/10 border border-white/10">
              <span className="text-4xl">🏠</span>
            </div>
            <h3 className="font-display text-xl font-bold text-white mb-2">No Applications Yet</h3>
            <p className="text-brand-muted mb-6">Start by browsing available listings and booking a viewing.</p>
            <Link to="/explore" className="btn-gold inline-flex items-center gap-2">
              Explore Listings <IcoArrowRight size={16} />
            </Link>
          </motion.div>
        ) : (
          <div className="space-y-8 mt-8">
            {activeApps.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-muted mb-3">Active Applications</h3>
                <div className="space-y-4">
                  {activeApps.map((app, i) => (
                    <AppCard key={app.id} app={app} listing={listingsById[app.listingId]} index={i} onClick={() => setSelected(app)} />
                  ))}
                </div>
              </section>
            )}
            {pastApps.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-muted mb-3">Past Applications</h3>
                <div className="space-y-4 opacity-60">
                  {pastApps.map((app, i) => (
                    <AppCard key={app.id} app={app} listing={listingsById[app.listingId]} index={i} onClick={() => setSelected(app)} />
                  ))}
                </div>
              </section>
            )}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="btn-ghost text-sm px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>
                <span className="text-xs text-brand-muted">Page {page} of {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="btn-ghost text-sm px-4 py-2 disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </div>

      {/* ── Detail Drawer ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)} className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-brand-dark border-l border-white/10 overflow-y-auto">
              <AppDetail app={selected} listing={listingsById[selected.listingId]} onClose={() => setSelected(null)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppCard({ app, listing, index, onClick }: { app: TenantApplication; listing?: Listing; index: number; onClick: () => void }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;
  const createdDate = new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  const title = listing?.title ?? app.listingTitle ?? app.listingCode ?? "Listing";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      transition={{ delay: index * 0.06, type: "spring", stiffness: 300, damping: 24 }}
      onClick={onClick}
      style={{ "--accent": cfg.glow } as React.CSSProperties}
      className="relative glass rounded-2xl p-5 pl-6 cursor-pointer border border-white/[0.06] hover:border-white/[0.14] hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.5)] transition-all group overflow-hidden"
    >
      <span className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: "var(--accent)" }} />
      <div className="flex items-start gap-4">
        <div className="h-16 w-16 shrink-0 rounded-2xl bg-white/10 overflow-hidden flex items-center justify-center text-2xl ring-1 ring-white/10 group-hover:ring-white/20 transition">
          {listing ? <img src={primaryImage(listing)} alt="" className="h-full w-full object-cover" /> : "🏠"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-display font-semibold text-white truncate">{title}</span>
            <span className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              {cfg.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-brand-muted">
            {listing && <span>{listingLocation(listing)}</span>}
            {listing?.price != null && <span className="text-brand-gold font-medium">{formatKes(listing.price)}{listing.listingType === "Rent" ? "/mo" : ""}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-brand-muted">
            <span className="flex items-center gap-1"><IcoCalendar size={11} /> {createdDate}</span>
            {app.documents && <span>{app.documents.length} doc{app.documents.length !== 1 ? "s" : ""} uploaded</span>}
          </div>
          <MiniStepper app={app} />
        </div>
        <IcoChevRight size={16} className="text-brand-muted group-hover:text-white transition shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

/** Compact horizontal stage row for the application card - 7 small nodes connected by a line that
 * fills as the application progresses, with the active stage pulsing so the card reads as "alive"
 * rather than a static bar. */
function MiniStepper({ app }: { app: TenantApplication }) {
  if (app.status === "Cancelled") return null;
  const { doneUpTo, current, rejectedAt } = getStepperState(app);

  return (
    <div className="mt-3 flex items-center">
      {STAGES.map((stage, i) => {
        const isLast = i === STAGES.length - 1;
        const isRejected = rejectedAt === stage.step;
        const isDone = stage.step <= doneUpTo;
        const isCurrent = stage.step === current;
        const lineFilled = stage.step <= doneUpTo && !isLast;
        const lineIsRedStop = rejectedAt === stage.step + 1;

        return (
          <div key={stage.step} className="flex items-center flex-1 last:flex-none">
            <div className="relative shrink-0">
              {isCurrent && (
                <motion.span
                  className="absolute inset-0 rounded-full bg-brand-gold/40"
                  animate={{ scale: [1, 1.8], opacity: [0.6, 0] }}
                  transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                />
              )}
              <div
                className={`relative h-2.5 w-2.5 rounded-full transition-colors ${
                  isRejected ? "bg-red-400" : isDone ? "bg-emerald-400" : isCurrent ? "bg-brand-gold" : "bg-white/15"
                }`}
              />
            </div>
            {!isLast && (
              <div className="h-[2px] flex-1 mx-1 rounded-full bg-white/10 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: lineFilled ? "100%" : "0%" }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                  className={`h-full ${lineIsRedStop ? "bg-red-400/60" : "bg-emerald-400/60"}`}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Rich vertical stepper for the detail drawer: icon-in-circle per stage, a connecting line that
 * animates its fill as it loads, a pulsing glow ring on whichever stage is actively in progress,
 * and - for a rejected application - a red stop marker exactly where the journey ended instead of
 * silently showing empty upcoming stages. */
function ApplicationStepper({ app }: { app: TenantApplication }) {
  const { doneUpTo, current, rejectedAt } = getStepperState(app);
  const createdDate = new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

  return (
    <div>
      <h3 className="text-xs uppercase tracking-wider text-brand-muted mb-4">Application Progress</h3>
      <div className="space-y-0">
        {STAGES.map((stage, i) => {
          const isRejected = rejectedAt === stage.step;
          const isDone = stage.step <= doneUpTo;
          const isCurrent = stage.step === current;
          const isUpcoming = !isDone && !isCurrent && !isRejected;
          const isLast = i === STAGES.length - 1;
          // The line leading OUT of a done stage should render whenever that stage is done -
          // whether it's connecting to the current stage, a rejection stop, or (once Active) just
          // another done stage - the rejection case needs its own red tint rather than green.
          const lineFilled = stage.step <= doneUpTo;
          const lineIsRedStop = rejectedAt === stage.step + 1;
          const Icon = stage.Icon;

          return (
            <motion.div
              key={stage.step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-start gap-3.5"
            >
              <div className="flex flex-col items-center">
                <div className="relative shrink-0">
                  {isCurrent && (
                    <motion.span
                      className="absolute inset-0 rounded-full bg-brand-gold/40"
                      animate={{ scale: [1, 1.6], opacity: [0.7, 0] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
                    />
                  )}
                  <div
                    className={`relative flex h-9 w-9 items-center justify-center rounded-full border-2 transition-colors ${
                      isRejected
                        ? "bg-red-500/15 border-red-400 text-red-400"
                        : isDone
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : isCurrent
                        ? "bg-brand-gold/15 border-brand-gold text-brand-gold"
                        : "bg-white/5 border-white/15 text-white/25"
                    }`}
                  >
                    {isRejected ? <IcoX size={16} /> : isDone ? <IcoCheck size={16} /> : <Icon size={16} />}
                  </div>
                </div>
                {!isLast && (
                  <div className="w-0.5 h-9 mt-0.5 rounded-full bg-white/10 overflow-hidden">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: lineFilled ? "100%" : "0%" }}
                      transition={{ duration: 0.5, delay: i * 0.05 + 0.1 }}
                      className={`w-full ${lineIsRedStop ? "bg-red-400/50" : "bg-emerald-500/50"}`}
                    />
                  </div>
                )}
              </div>
              <div className={`pb-7 pt-1 ${isLast ? "pb-1" : ""}`}>
                <span className={`text-sm font-semibold ${isRejected ? "text-red-400" : isUpcoming ? "text-white/30" : "text-white"}`}>
                  {isRejected ? "Not Approved" : stage.label}
                </span>
                {!isUpcoming && (
                  <p className={`text-xs mt-0.5 ${isRejected ? "text-red-400/70" : "text-brand-muted"}`}>
                    {isRejected ? (app.rejectionReason ?? "The application did not pass this stage.") : stage.desc}
                  </p>
                )}
                {stage.step === 1 && isDone && app.createdAt && (
                  <div className="text-[11px] text-brand-muted/70 mt-0.5">{createdDate}</div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function AppDetail({ app, listing, onClose }: { app: TenantApplication; listing?: Listing; onClose: () => void }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;
  const isContinuable = ["DocumentsPending","Approved","TermsAccepted","PaymentPending"].includes(app.status);
  const title = listing?.title ?? app.listingTitle ?? app.listingCode ?? "Listing";
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Application Details</h2>
        <button onClick={onClose} className="text-brand-muted hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
          <IcoX size={18} />
        </button>
      </div>

      {/* Listing summary */}
      <Link to={`/listing/${app.listingId}`} className="flex items-center gap-3 glass rounded-2xl p-3 hover:bg-white/[0.06] transition group">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-white/10 overflow-hidden flex items-center justify-center text-2xl">
          {listing ? <img src={primaryImage(listing)} alt="" className="h-full w-full object-cover" /> : "🏠"}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white truncate group-hover:text-brand-gold transition">{title}</div>
          {listing && (
            <div className="flex items-center gap-2 text-xs text-brand-muted mt-0.5">
              <span>{listingLocation(listing)}</span>
              {listing.price != null && <span className="text-brand-gold font-medium">· {formatKes(listing.price)}{listing.listingType === "Rent" ? "/mo" : ""}</span>}
            </div>
          )}
        </div>
        <IcoChevRight size={15} className="text-brand-muted group-hover:text-white transition shrink-0" />
      </Link>

      {/* Status badge */}
      <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 ${cfg.bg}`}>
        <span className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</span>
      </div>

      {/* Viewing is a separate, optional action - shown only when one was actually booked. */}
      {app.viewingBookingId && (
        <div className="text-xs text-brand-muted flex items-center gap-1.5">
          <IcoCalendar size={12} /> A viewing was booked for this listing
        </div>
      )}

      {app.rejectionReason && (
        <div className="glass rounded-xl p-4 border border-red-500/20">
          <div className="text-sm font-semibold text-red-400 mb-1">Reason for Rejection</div>
          <p className="text-sm text-brand-muted">{app.rejectionReason}</p>
        </div>
      )}

      {/* Progress Stepper */}
      {app.status !== "Cancelled" && <ApplicationStepper app={app} />}

      {/* Documents */}
      {app.documents && app.documents.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-brand-muted mb-3">Uploaded Documents</h3>
          <div className="space-y-2">
            {app.documents.map((doc) => (
              <div key={doc.id} className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-white">{formatDocType(doc.documentType)}</span>
                <button
                  onClick={() => setPreviewDoc({ url: doc.fileUrl, title: formatDocType(doc.documentType) })}
                  className="text-xs text-brand-teallight hover:underline"
                >
                  View
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {isContinuable && (
        <Link
          to={`/rental-flow?listingId=${app.listingId}&applicationId=${app.id}`}
          className="btn-gold w-full justify-center mt-2 block text-center"
        >
          Continue Application <IcoArrowRight size={16} />
        </Link>
      )}

      {app.status === "Active" && (
        <div className="glass rounded-2xl p-5 text-center space-y-2">
          <div className="text-4xl">🎉</div>
          <div className="font-display text-lg font-bold text-white">Tenancy Active!</div>
          <p className="text-sm text-brand-muted">Congratulations on your new home.</p>
          <Link to="/dashboard" className="btn-ghost text-sm inline-flex items-center gap-2">
            <IcoKey size={14} /> Go to My Properties
          </Link>
        </div>
      )}
      {previewDoc && (
        <DocumentPreviewModal url={previewDoc.url} title={previewDoc.title} onClose={() => setPreviewDoc(null)} />
      )}
    </div>
  );
}

function formatDocType(t: string): string {
  return t.replace(/([A-Z])/g, " $1").trim();
}
