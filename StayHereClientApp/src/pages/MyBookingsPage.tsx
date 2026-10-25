import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { bookingApi, type ViewingBooking } from "../lib/api";
import { formatKes, fallbackImage, resolveFirstName } from "../lib/format";
import { useApp } from "../context/AppContext";
import { SkeletonGrid, AnimatedCounter, CursorSpotlight, GrainLayer } from "../components/ui";
import {
  IcoArrowRight, IcoBuilding, IcoCalendar, IcoCheck, IcoLoader,
  IcoLocation, IcoPhone, IcoTrendUp, IcoX,
} from "../components/icons";

const TERMINAL_STATUSES = new Set(["Cancelled", "Completed", "NoShow"]);

/* Same cinematic set HomePage/MyPropertiesPage open with, for a consistent
 * premium backdrop when a booking has no listing photo yet. */
const FALLBACK_HERO = "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=85";

/** The backend only ever moves a booking to Cancelled/Completed/NoShow when a
 * human (owner/agent) acts on it — a Pending or Confirmed viewing whose slot
 * has simply passed stays "Pending"/"Confirmed" in the DB forever otherwise.
 * Since we're told not to touch the DB, "past" and the right status label are
 * both derived here, client-side, from preferredDate+preferredTime vs. now. */
function isSlotPastDue(booking: ViewingBooking): boolean {
  const d = new Date(booking.preferredDate);
  if (Number.isNaN(d.getTime())) return false;
  const match = /^(\d{1,2}):(\d{2})/.exec(booking.preferredTime ?? "");
  if (match) d.setHours(Number(match[1]), Number(match[2]), 0, 0);
  else d.setHours(23, 59, 59, 999); // no parseable time — only consider it past once the whole day has elapsed
  return d.getTime() < Date.now();
}

function isBookingPast(booking: ViewingBooking): boolean {
  return TERMINAL_STATUSES.has(booking.status) || isSlotPastDue(booking);
}

/** Display status — overrides a stale Pending/Confirmed with a label that
 * reflects reality once the slot has passed without the backend ever
 * resolving it, instead of showing a viewing that already happened as if it
 * were still upcoming. */
function effectiveStatus(booking: ViewingBooking): string {
  if (TERMINAL_STATUSES.has(booking.status)) return booking.status;
  if (isSlotPastDue(booking)) return booking.status === "Confirmed" ? "Missed" : "Expired";
  return booking.status;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; dot?: string }> = {
  Pending: { bg: "bg-amber-500/15 border border-amber-500/25", text: "text-amber-300" },
  Confirmed: { bg: "bg-emerald-500/15 border border-emerald-500/25", text: "text-emerald-300", dot: "bg-emerald-400" },
  Completed: { bg: "bg-brand-teal/15 border border-brand-teal/25", text: "text-brand-teallight" },
  Cancelled: { bg: "bg-red-500/15 border border-red-500/25", text: "text-red-300" },
  NoShow: { bg: "bg-white/10 border border-white/10", text: "text-white/50" },
  Missed: { bg: "bg-orange-500/15 border border-orange-500/25", text: "text-orange-300" },
  Expired: { bg: "bg-white/10 border border-white/10", text: "text-white/50" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] ?? { bg: "bg-white/10 border border-white/10", text: "text-white/60" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${s.bg} ${s.text}`}>
      {s.dot && <span className={`h-1.5 w-1.5 rounded-full ${s.dot} animate-pulse`} />}
      {status}
    </span>
  );
}

/* ── Boarding-pass-style reservation ticket ─────────────────────────────────
 * Borrows the "date stub + perforated seam" pattern from Resy/OpenTable/
 * Eventbrite reservation cards — a day/month block torn away from the
 * property details, with circular notches cut into the card edges where the
 * dashed seam meets them, instead of a plain text date row. */
function BookingTicket({ booking, past, onCancel, cancelling }: {
  booking: ViewingBooking;
  past: boolean;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const status = effectiveStatus(booking);
  const pastDue = isSlotPastDue(booking) && !TERMINAL_STATUSES.has(booking.status);
  const canCancel = !past && !pastDue && !TERMINAL_STATUSES.has(booking.status);
  const canReschedule = pastDue; // slot elapsed with no owner action recorded — offer a fresh booking instead
  const image = booking.listingImageUrl || fallbackImage(booking.listingId);
  const d = new Date(booking.preferredDate);
  const valid = !Number.isNaN(d.getTime());
  const weekday = valid ? d.toLocaleDateString("en-KE", { weekday: "short" }).toUpperCase() : "—";
  const day = valid ? d.getDate() : "—";
  const month = valid ? d.toLocaleDateString("en-KE", { month: "short" }).toUpperCase() : "";
  const isVirtual = booking.viewingType === "Virtual";

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={`relative flex overflow-hidden rounded-3xl card-dark transition-all duration-300 ${
        past ? "opacity-70 hover:opacity-100" : "hover:shadow-glow-gold"
      }`}
    >
      {/* Date stub */}
      <div
        className={`relative flex w-24 shrink-0 flex-col items-center justify-center gap-0.5 border-r border-dashed py-6 sm:w-28 ${
          past ? "border-white/10 bg-white/[0.03]" : "border-white/15 bg-gradient-to-b from-brand-gold/15 to-brand-teal/10"
        }`}
      >
        <span className="text-[10px] font-semibold uppercase tracking-widest text-brand-muted">{weekday}</span>
        <span className="font-display text-3xl font-bold text-white sm:text-4xl">{day}</span>
        <span className={`text-xs font-bold uppercase tracking-wider ${past ? "text-white/40" : "text-brand-gold"}`}>{month}</span>
        <span className="mt-2 text-[11px] text-white/50">{booking.preferredTime}</span>
      </div>

      {/* Perforation notches — half-circles biting into the card's top/bottom edges */}
      <span className="pointer-events-none absolute left-24 top-0 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-dark sm:left-28" />
      <span className="pointer-events-none absolute left-24 bottom-0 h-5 w-5 -translate-x-1/2 translate-y-1/2 rounded-full bg-brand-dark sm:left-28" />

      {/* Body */}
      <div className="min-w-0 flex-1 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link to={`/listing/${booking.listingId}`} className="shrink-0">
              <img
                src={image}
                alt={booking.listingTitle ?? "Listing"}
                className={`h-14 w-14 rounded-xl object-cover sm:h-16 sm:w-16 ${past ? "grayscale" : ""}`}
              />
            </Link>
            <div className="min-w-0">
              <Link to={`/listing/${booking.listingId}`} className="block truncate font-display text-base font-semibold text-white hover:text-brand-gold transition sm:text-lg">
                {booking.listingTitle ?? "StayHere listing"}
              </Link>
              {booking.listingLocation && (
                <div className="mt-0.5 flex items-center gap-1 text-xs text-brand-muted">
                  <IcoLocation size={12} className="shrink-0 text-brand-teal" /> <span className="truncate">{booking.listingLocation}</span>
                </div>
              )}
            </div>
          </div>
          <StatusBadge status={status} />
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {booking.listingPrice != null && (
            <span className="font-display text-sm font-bold text-gradient-gold">
              {formatKes(booking.listingPrice)}
              <span className="ml-1 text-[11px] font-sans font-normal text-brand-muted">
                /{booking.listingCurrency && booking.listingCurrency !== "KES" ? booking.listingCurrency : "month"}
              </span>
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[11px] text-white/60">
            <span className={`h-1.5 w-1.5 rounded-full ${isVirtual ? "bg-brand-teallight" : "bg-brand-gold"}`} />
            {isVirtual ? "Virtual viewing" : "In-person viewing"}
          </span>
        </div>

        {!pastDue && booking.status === "Confirmed" && booking.meetingLink && (
          <a
            href={booking.meetingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-brand-teallight hover:underline"
          >
            Join virtual viewing <IcoArrowRight size={12} />
          </a>
        )}
        {!pastDue && booking.status === "Confirmed" && !booking.meetingLink && booking.contactPhone && (
          <div className="mt-2.5 flex items-center gap-1.5 text-xs text-white/60">
            <IcoPhone size={12} /> Contact: {booking.contactPhone}
          </div>
        )}
        {pastDue && (
          <div className="mt-2.5 text-xs text-white/50">
            {status === "Missed" ? "This viewing window has passed." : "This request was never confirmed before the slot passed."}
          </div>
        )}

        <div className="mt-3 flex items-center gap-4">
          <Link to={`/listing/${booking.listingId}`} className="text-xs font-medium text-white/70 hover:text-white transition">
            View Property
          </Link>
          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              className="flex items-center gap-1.5 text-xs font-medium text-red-400/80 hover:text-red-400 disabled:opacity-50"
            >
              {cancelling ? <IcoLoader size={13} className="animate-spin" /> : <IcoX size={13} />} Cancel booking
            </button>
          )}
          {canReschedule && (
            <Link
              to={`/listing/${booking.listingId}`}
              className="flex items-center gap-1.5 text-xs font-medium text-brand-gold hover:text-brand-goldlight transition"
            >
              <IcoCalendar size={13} /> Reschedule viewing
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function MyBookingsPage() {
  const { authUser, customerProfile, toast } = useApp();
  const [bookings, setBookings] = useState<ViewingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"upcoming" | "past">("upcoming");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;
  const firstName = resolveFirstName(customerProfile?.fullName || authUser?.name, authUser?.email);

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    bookingApi.getByCustomer(customerId)
      .then(setBookings)
      .catch(() => toast("Failed to load your bookings", "error"))
      .finally(() => setLoading(false));
  }, [customerId]);

  const { upcoming, past } = useMemo(() => {
    const sorted = [...bookings].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return {
      upcoming: sorted.filter((b) => !isBookingPast(b)),
      past: sorted.filter((b) => isBookingPast(b)),
    };
  }, [bookings]);

  const visible = tab === "upcoming" ? upcoming : past;
  // Only counts viewings that are both confirmed AND still ahead of us — a
  // Confirmed booking whose slot already elapsed shows as "Missed" instead.
  const confirmedCount = useMemo(
    () => bookings.filter((b) => b.status === "Confirmed" && !isSlotPastDue(b)).length,
    [bookings]
  );
  const propertiesToured = useMemo(() => new Set(bookings.map((b) => b.listingId)).size, [bookings]);
  const heroImage = upcoming[0]?.listingImageUrl || FALLBACK_HERO;

  async function handleCancel(id: string) {
    setCancellingId(id);
    try {
      const updated = await bookingApi.cancel(id);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, ...updated } : b)));
      toast("Booking cancelled", "success");
    } catch {
      toast("Could not cancel this booking", "error");
    } finally {
      setCancellingId(null);
    }
  }

  const floatingStats = [
    { icon: <IcoCalendar size={18} />, value: upcoming.length, label: "Upcoming Viewings", color: "gold" as const },
    { icon: <IcoCheck size={18} />, value: confirmedCount, label: "Confirmed", color: "teal" as const },
    { icon: <IcoBuilding size={18} />, value: propertiesToured, label: "Properties Toured", color: "violet" as const },
    { icon: <IcoTrendUp size={18} />, value: past.length, label: "Past Viewings", color: "rose" as const },
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
      <section className="relative h-[300px] sm:h-[360px] overflow-hidden clip-parent grain-overlay">
        <img src={heroImage} alt="" className="ken-burns-img absolute inset-0 h-full w-full object-cover" />
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 65% 60% at 10% 15%, rgba(201,162,39,0.35) 0%, transparent 55%), " +
              "radial-gradient(ellipse 55% 50% at 92% 85%, rgba(13,148,136,0.35) 0%, transparent 55%)",
          }}
        />
        <div className="absolute inset-0 cinematic-overlay" />
        <CursorSpotlight />
        <GrainLayer opacity={0.05} />

        <div className="relative z-10 mx-auto flex h-full max-w-5xl flex-col justify-center px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <span className="section-tag mb-4 inline-flex">My Bookings</span>
            <h1 className="hero-solid-text font-display text-4xl font-bold text-white sm:text-5xl">
              {firstName ? <>Your Viewings, <span className="text-gradient-gold">{firstName}</span></> : "Your Viewings"}
            </h1>
            <p className="mt-3 max-w-md text-brand-muted">
              {upcoming.length > 0
                ? `${upcoming.length} viewing${upcoming.length === 1 ? "" : "s"} coming up — keep track of every visit here.`
                : "Every viewing you book on StayHere shows up here, start to finish."}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* ── Floating stat strip ────────────────────────────────────── */}
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

        {/* ── Tabs ───────────────────────────────────────────────────── */}
        <div className="mt-10 mb-6 flex gap-1 rounded-2xl bg-white/5 p-1 max-w-xs">
          {(["upcoming", "past"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize transition ${
                tab === t ? "bg-brand-gold text-brand-dark shadow" : "text-brand-muted hover:text-white"
              }`}
            >
              {t} ({t === "upcoming" ? upcoming.length : past.length})
            </button>
          ))}
        </div>

        {loading ? (
          <SkeletonGrid count={3} />
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
              <IcoCalendar size={30} className="text-white/20" />
            </div>
            <h3 className="font-display text-xl font-semibold text-white">
              {tab === "upcoming" ? "No upcoming viewings" : "No past viewings yet"}
            </h3>
            <p className="mt-2 text-brand-muted mb-5">
              {tab === "upcoming"
                ? "Book a viewing from any listing to see it here."
                : "Completed and cancelled viewings will show up here."}
            </p>
            {tab === "upcoming" && (
              <Link to="/explore" className="btn-gold">
                Explore Listings <IcoArrowRight size={16} />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {visible.map((b) => (
                <BookingTicket key={b.id} booking={b} past={tab === "past"} onCancel={handleCancel} cancelling={cancellingId === b.id} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
