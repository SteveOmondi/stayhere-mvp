import { useEffect, useState } from "react";
import { bookingApi, type ViewingBooking } from "../lib/api";
import { useOwner } from "../context/OwnerContext";
import {
  IcoCalendar, IcoCheck, IcoChevRight, IcoLoader, IcoPhone, IcoUser, IcoX,
  IcoRefresh, IcoEye, IcoMapPin,
} from "../components/icons";

const STATUS_STYLES: Record<string, { dot: string; text: string; badge: string }> = {
  Pending:   { dot: "bg-yellow-400", text: "text-yellow-700", badge: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  Confirmed: { dot: "bg-teal-500",   text: "text-teal-700",   badge: "bg-teal-50 text-teal-700 border-teal-200" },
  Completed: { dot: "bg-green-500",  text: "text-green-700",  badge: "bg-green-50 text-green-700 border-green-200" },
  Cancelled: { dot: "bg-red-400",    text: "text-red-600",    badge: "bg-red-50 text-red-600 border-red-200" },
  NoShow:    { dot: "bg-gray-400",   text: "text-gray-500",   badge: "bg-gray-50 text-gray-500 border-gray-200" },
};

const TABS = ["All", "Pending", "Confirmed", "Completed", "Cancelled"] as const;

export function BookingsPage() {
  const { owner } = useOwner();
  const [bookings, setBookings] = useState<ViewingBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("All");
  const [selected, setSelected] = useState<ViewingBooking | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [ownerNotes, setOwnerNotes] = useState("");
  const [meetingLink, setMeetingLink] = useState("");

  const ownerId = owner?.id ?? "";

  function load() {
    if (!ownerId) return;
    setLoading(true);
    bookingApi.byOwner(ownerId).then(setBookings).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [ownerId]);

  const filtered = tab === "All" ? bookings : bookings.filter((b) => b.status === tab);

  async function handleConfirm(b: ViewingBooking) {
    setActionLoading(true);
    try {
      const updated = await bookingApi.confirm(b.id, { ownerNotes: ownerNotes || undefined, meetingLink: meetingLink || undefined });
      setBookings((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      setSelected(updated);
      setOwnerNotes(""); setMeetingLink("");
    } finally { setActionLoading(false); }
  }

  async function handleComplete(b: ViewingBooking) {
    setActionLoading(true);
    try {
      const updated = await bookingApi.complete(b.id);
      setBookings((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      setSelected(updated);
    } finally { setActionLoading(false); }
  }

  async function handleCancel(b: ViewingBooking) {
    if (!window.confirm("Cancel this viewing?")) return;
    setActionLoading(true);
    try {
      const updated = await bookingApi.cancel(b.id, { ownerNotes: ownerNotes || undefined });
      setBookings((prev) => prev.map((x) => x.id === updated.id ? updated : x));
      setSelected(updated);
    } finally { setActionLoading(false); }
  }

  const countFor = (s: string) => s === "All" ? bookings.length : bookings.filter(b => b.status === s).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Viewing Bookings</h1>
          <p className="text-sm text-brand-500 mt-0.5">Manage all property viewing requests from prospective tenants</p>
        </div>
        <button onClick={load} className="btn-ghost border border-brand-200 flex items-center gap-1.5 text-sm">
          <IcoRefresh size={14} /> Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition border ${
              tab === t ? "bg-brand-teal text-white border-brand-teal" : "bg-white text-brand-600 border-brand-200 hover:border-brand-teal/50"
            }`}>
            {t}
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === t ? "bg-white/20 text-white" : "bg-brand-100 text-brand-500"}`}>
              {countFor(t)}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><IcoLoader size={32} className="text-brand-teal" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <IcoCalendar size={40} className="mx-auto text-brand-300 mb-3" />
          <div className="font-semibold text-brand-700">No bookings {tab !== "All" ? `with status "${tab}"` : "yet"}</div>
          <p className="text-sm text-brand-400 mt-1">Viewing requests from prospective tenants appear here.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((b) => (
            <BookingCard key={b.id} booking={b} onClick={() => setSelected(b)} />
          ))}
        </div>
      )}

      {/* Detail panel */}
      {selected && (
        <DetailOverlay title="Viewing Details" onClose={() => setSelected(null)}>
          <BookingDetail
            booking={selected}
            ownerNotes={ownerNotes}
            meetingLink={meetingLink}
            onOwnerNotesChange={setOwnerNotes}
            onMeetingLinkChange={setMeetingLink}
            loading={actionLoading}
            onConfirm={() => handleConfirm(selected)}
            onComplete={() => handleComplete(selected)}
            onCancel={() => handleCancel(selected)}
          />
        </DetailOverlay>
      )}
    </div>
  );
}

function BookingCard({ booking: b, onClick }: { booking: ViewingBooking; onClick: () => void }) {
  const st = STATUS_STYLES[b.status] ?? STATUS_STYLES.Pending;
  const dateStr = new Date(b.preferredDate).toLocaleDateString("en-KE", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div onClick={onClick} className="card cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal">
          <IcoCalendar size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-brand-900">{b.listingTitle ?? `Listing ${b.listingId.slice(0, 8)}`}</div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-brand-500 flex-wrap">
                <span className="flex items-center gap-1"><IcoCalendar size={12} /> {dateStr} at {b.preferredTime}</span>
                <span className="flex items-center gap-1"><IcoEye size={12} /> {b.viewingType}</span>
                {b.contactPhone && <span className="flex items-center gap-1"><IcoPhone size={12} /> {b.contactPhone}</span>}
              </div>
              {b.customerName && (
                <div className="flex items-center gap-1 mt-1 text-sm text-brand-700">
                  <IcoUser size={12} /> {b.customerName}
                </div>
              )}
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${st.badge}`}>
              {b.status}
            </span>
          </div>
          {b.notes && <p className="mt-2 text-xs text-brand-500 italic line-clamp-2">"{b.notes}"</p>}
        </div>
        <IcoChevRight size={16} className="text-brand-300 shrink-0 mt-1" />
      </div>
    </div>
  );
}

function BookingDetail({
  booking, ownerNotes, meetingLink, onOwnerNotesChange, onMeetingLinkChange,
  loading, onConfirm, onComplete, onCancel
}: {
  booking: ViewingBooking;
  ownerNotes: string; meetingLink: string;
  onOwnerNotesChange: (v: string) => void; onMeetingLinkChange: (v: string) => void;
  loading: boolean; onConfirm: () => void; onComplete: () => void; onCancel: () => void;
}) {
  const dateStr = new Date(booking.preferredDate).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="space-y-5">
      <InfoRow label="Listing" value={booking.listingTitle ?? booking.listingId} />
      <InfoRow label="Date" value={`${dateStr} at ${booking.preferredTime}`} />
      <InfoRow label="Type" value={booking.viewingType} />
      <InfoRow label="Status" value={
        <span className={`font-semibold ${(STATUS_STYLES[booking.status] ?? STATUS_STYLES.Pending).text}`}>{booking.status}</span>
      } />
      {booking.customerName && <InfoRow label="Customer" value={booking.customerName} />}
      {booking.customerEmail && <InfoRow label="Email" value={booking.customerEmail} />}
      {booking.contactPhone && <InfoRow label="Phone" value={booking.contactPhone} />}
      {booking.notes && <InfoRow label="Customer Notes" value={<span className="italic text-brand-600">"{booking.notes}"</span>} />}
      {booking.ownerNotes && <InfoRow label="Your Notes" value={booking.ownerNotes} />}
      {booking.meetingLink && (
        <InfoRow label="Meeting Link" value={<a href={booking.meetingLink} target="_blank" rel="noopener noreferrer" className="text-brand-teal hover:underline">{booking.meetingLink}</a>} />
      )}

      {booking.status === "Pending" && (
        <div className="pt-3 border-t border-brand-100 space-y-3">
          <h4 className="text-sm font-semibold text-brand-800">Confirm Viewing</h4>
          {booking.viewingType === "Virtual" && (
            <div>
              <label className="field-label">Meeting Link (optional)</label>
              <input value={meetingLink} onChange={(e) => onMeetingLinkChange(e.target.value)}
                placeholder="https://meet.google.com/..." className="input" />
            </div>
          )}
          <div>
            <label className="field-label">Notes for tenant (optional)</label>
            <textarea rows={2} value={ownerNotes} onChange={(e) => onOwnerNotesChange(e.target.value)}
              placeholder="e.g. Please arrive 10 min early…" className="input resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={onConfirm} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <IcoLoader size={14} /> : <><IcoCheck size={14} /> Confirm</>}
            </button>
            <button onClick={onCancel} disabled={loading} className="btn-danger flex-1 justify-center">
              <IcoX size={14} /> Cancel
            </button>
          </div>
        </div>
      )}

      {booking.status === "Confirmed" && (
        <div className="pt-3 border-t border-brand-100">
          <button onClick={onComplete} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <IcoLoader size={14} /> : <><IcoCheck size={14} /> Mark as Completed</>}
          </button>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-4 text-sm">
      <span className="text-brand-500 shrink-0">{label}</span>
      <span className="text-brand-900 text-right font-medium">{value}</span>
    </div>
  );
}

function DetailOverlay({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white border-b border-brand-100">
          <h2 className="font-bold text-brand-900">{title}</h2>
          <button onClick={onClose} className="text-brand-400 hover:text-brand-700 p-1.5 rounded-lg hover:bg-brand-50 transition">
            <IcoX size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
