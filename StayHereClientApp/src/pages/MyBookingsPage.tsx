import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { bookingApi, type ViewingBooking } from "../lib/api";
import { formatKes, fallbackImage } from "../lib/format";
import { useApp } from "../context/AppContext";
import { SkeletonGrid, SectionHeading } from "../components/ui";
import {
  IcoArrowRight, IcoCalendar, IcoLoader, IcoLocation, IcoPhone, IcoX,
} from "../components/icons";

const TERMINAL_STATUSES = new Set(["Cancelled", "Completed", "NoShow"]);

function formatPreferredDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Pending: "bg-amber-500/15 text-amber-300",
    Confirmed: "bg-emerald-500/15 text-emerald-300",
    Completed: "bg-brand-teallight/15 text-brand-teallight",
    Cancelled: "bg-red-500/15 text-red-300",
    NoShow: "bg-white/10 text-white/50",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${styles[status] ?? "bg-white/10 text-white/60"}`}>
      {status}
    </span>
  );
}

function BookingCard({ booking, onCancel, cancelling }: {
  booking: ViewingBooking;
  onCancel: (id: string) => void;
  cancelling: boolean;
}) {
  const canCancel = !TERMINAL_STATUSES.has(booking.status);
  const image = booking.listingImageUrl || fallbackImage(booking.listingId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-2xl glass-strong border border-white/[0.06]"
    >
      <div className="flex gap-4 p-4">
        <Link to={`/listing/${booking.listingId}`} className="shrink-0">
          <img src={image} alt={booking.listingTitle ?? "Listing"} className="h-20 w-24 rounded-xl object-cover" />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/listing/${booking.listingId}`} className="truncate font-display text-base font-semibold text-white hover:text-brand-gold transition">
              {booking.listingTitle ?? "StayHere listing"}
            </Link>
            <StatusBadge status={booking.status} />
          </div>
          {booking.listingLocation && (
            <div className="mt-1 flex items-center gap-1 text-xs text-brand-muted">
              <IcoLocation size={12} /> {booking.listingLocation}
            </div>
          )}
          {booking.listingPrice != null && (
            <div className="mt-0.5 text-xs text-brand-gold">
              {formatKes(booking.listingPrice)} {booking.listingCurrency && booking.listingCurrency !== "KES" ? booking.listingCurrency : ""}/month
            </div>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/70">
            <span className="flex items-center gap-1">
              <IcoCalendar size={13} /> {formatPreferredDate(booking.preferredDate)} · {booking.preferredTime}
            </span>
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px]">
              {booking.viewingType === "Virtual" ? "Virtual viewing" : "In-person viewing"}
            </span>
          </div>
          {booking.status === "Confirmed" && booking.meetingLink && (
            <a
              href={booking.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-brand-teallight hover:underline"
            >
              Join virtual viewing <IcoArrowRight size={12} />
            </a>
          )}
          {booking.status === "Confirmed" && !booking.meetingLink && booking.contactPhone && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
              <IcoPhone size={12} /> Contact: {booking.contactPhone}
            </div>
          )}
          {canCancel && (
            <button
              onClick={() => onCancel(booking.id)}
              disabled={cancelling}
              className="mt-3 flex items-center gap-1.5 text-xs font-medium text-red-400/80 hover:text-red-400 disabled:opacity-50"
            >
              {cancelling ? <IcoLoader size={13} className="animate-spin" /> : <IcoX size={13} />} Cancel booking
            </button>
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
      upcoming: sorted.filter((b) => !TERMINAL_STATUSES.has(b.status)),
      past: sorted.filter((b) => TERMINAL_STATUSES.has(b.status)),
    };
  }, [bookings]);

  const visible = tab === "upcoming" ? upcoming : past;

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-6 flex items-center justify-between">
          <SectionHeading title="My Bookings" subtitle="Viewings you've scheduled on StayHere" />
          <IcoCalendar size={28} className="text-brand-gold" />
        </div>

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
              <IcoCalendar size={36} className="text-white/20" />
            </div>
            <h3 className="font-display text-xl font-semibold text-white">
              {tab === "upcoming" ? "No upcoming viewings" : "No past viewings yet"}
            </h3>
            <p className="mt-2 text-brand-muted">
              {tab === "upcoming"
                ? "Book a viewing from any listing to see it here."
                : "Completed and cancelled viewings will show up here."}
            </p>
            {tab === "upcoming" && (
              <Link to="/explore" className="btn-gold mt-6">
                Explore Listings <IcoArrowRight size={17} />
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((b) => (
              <BookingCard key={b.id} booking={b} onCancel={handleCancel} cancelling={cancellingId === b.id} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
