import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { applicationApi, paymentApi, shortStayApi, type TenantApplication, type RentalPayment, type ShortStayBooking } from "../lib/api";
// paymentApi.confirm is used for manual payment confirmation
import { useOwner } from "../context/OwnerContext";
import { DocumentPreviewModal } from "../components/DocumentPreviewModal";
import {
  IcoActivity, IcoCalendar, IcoCheck, IcoChevRight, IcoClipboard, IcoDocument,
  IcoEdit, IcoEye, IcoFileText, IcoHome, IcoKey, IcoLoader, IcoRefresh, IcoTerms, IcoUser,
  IcoWallet, IcoX,
} from "../components/icons";

const STAY_STATUS_STYLES: Record<string, { badge: string; text: string }> = {
  PendingPayment: { badge: "bg-amber-50 text-amber-700 border-amber-200", text: "text-amber-700" },
  Confirmed: { badge: "bg-teal-50 text-teal-700 border-teal-200", text: "text-teal-700" },
  Completed: { badge: "bg-green-50 text-green-700 border-green-200", text: "text-green-700" },
  Cancelled: { badge: "bg-red-50 text-red-600 border-red-200", text: "text-red-600" },
};
const STAY_TABS = ["All", "PendingPayment", "Confirmed", "Completed", "Cancelled"] as const;

type StatusCfg = {
  label: string;
  step: number;
  icon: (p: { size?: number; className?: string }) => JSX.Element;
  badge: string;
  bar: string;
  ring: string;
};

const TOTAL_STEPS = 7;

const STATUS_CONFIG: Record<string, StatusCfg> = {
  PendingApproval:  { label: "Pending Approval", step: 1, icon: IcoClipboard, badge: "bg-purple-50 text-purple-700 border-purple-200", bar: "bg-purple-400", ring: "ring-purple-100" },
  DocumentsPending: { label: "Docs Pending",   step: 2, icon: IcoFileText, badge: "bg-amber-50 text-amber-700 border-amber-200",   bar: "bg-amber-400",   ring: "ring-amber-100" },
  UnderReview:      { label: "Under Review",   step: 3, icon: IcoActivity, badge: "bg-blue-50 text-blue-700 border-blue-200",     bar: "bg-blue-400",    ring: "ring-blue-100" },
  Approved:         { label: "Approved",       step: 4, icon: IcoCheck,    badge: "bg-teal-50 text-teal-700 border-teal-200",     bar: "bg-teal-400",    ring: "ring-teal-100" },
  Rejected:         { label: "Rejected",       step: 4, icon: IcoX,        badge: "bg-red-50 text-red-600 border-red-200",        bar: "bg-red-400",     ring: "ring-red-100" },
  TermsAccepted:    { label: "Terms Accepted", step: 5, icon: IcoTerms,    badge: "bg-indigo-50 text-indigo-700 border-indigo-200", bar: "bg-indigo-400", ring: "ring-indigo-100" },
  PaymentPending:   { label: "Payment Pending", step: 6, icon: IcoWallet,  badge: "bg-orange-50 text-orange-700 border-orange-200", bar: "bg-orange-400", ring: "ring-orange-100" },
  Active:           { label: "Active",         step: 7, icon: IcoKey,      badge: "bg-emerald-50 text-emerald-700 border-emerald-200", bar: "bg-emerald-400", ring: "ring-emerald-100" },
  Cancelled:        { label: "Cancelled",      step: 0, icon: IcoX,        badge: "bg-gray-50 text-gray-500 border-gray-200",     bar: "bg-gray-300",    ring: "ring-gray-100" },
};

const TABS = ["All", "PendingApproval", "UnderReview", "Approved", "Rejected", "Active", "Cancelled"] as const;
const LABEL_MAP: Record<string, string> = { PendingApproval: "Pending Approval", UnderReview: "Under Review", Approved: "Approved", Rejected: "Rejected", Active: "Active", Cancelled: "Cancelled", All: "All" };
const TAB_ICON: Record<string, (p: { size?: number; className?: string }) => JSX.Element> = {
  All: IcoClipboard, PendingApproval: IcoClipboard, UnderReview: IcoActivity, Approved: IcoCheck, Rejected: IcoX, Active: IcoKey, Cancelled: IcoX,
};

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "?";
}

export function ApplicationsPage() {
  const { owner, userId, toast } = useOwner();
  const ownerId = userId;
  const [section, setSection] = useState<"applications" | "stays">("applications");
  const [apps, setApps] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("All");
  const [selected, setSelected] = useState<TenantApplication | null>(null);
  const [payments, setPayments] = useState<RentalPayment[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  function load() {
    if (!ownerId) return;
    setLoading(true);
    applicationApi.byOwner(ownerId)
      .then(setApps)
      .catch((err) => toast(err instanceof Error ? err.message : "Failed to load applications", "error"))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [ownerId]);

  async function selectApp(app: TenantApplication) {
    setSelected(app);
    // Payments are already embedded in the application DTO — no extra call needed.
    setPayments(app.payments ?? []);
  }

  // Two separate gates share this handler: pre-screening the applicant (before documents are even
  // requested) and reviewing their submitted documents. Which API call to make depends on which
  // gate is currently pending - the backend rejects the wrong one for the current status anyway,
  // but branching here keeps the request correct instead of relying on that as the only guard.
  async function handleApprove() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const call = selected.status === "PendingApproval" ? applicationApi.prescreen : applicationApi.review;
      const updated = await call(selected.id, {
        decision: "Approved",
        reviewerEmail: owner?.email ?? owner?.fullName ?? "Owner",
      });
      setApps((p) => p.map((a) => a.id === updated.id ? updated : a));
      setSelected(updated);
    } finally { setActionLoading(false); }
  }

  async function handleReject() {
    if (!selected) return;
    if (!rejectionReason.trim()) { alert("Please provide a reason for rejection."); return; }
    setActionLoading(true);
    try {
      const call = selected.status === "PendingApproval" ? applicationApi.prescreen : applicationApi.review;
      const updated = await call(selected.id, {
        decision: "Rejected",
        reason: rejectionReason,
        reviewerEmail: owner?.email ?? owner?.fullName ?? "Owner",
      });
      setApps((p) => p.map((a) => a.id === updated.id ? updated : a));
      setSelected(updated);
      setRejectionReason("");
    } finally { setActionLoading(false); }
  }

  async function handleConfirmPayment(paymentId: string) {
    setActionLoading(true);
    try {
      await paymentApi.confirm(paymentId);
      if (selected) {
        // Refresh the full application (includes updated payments).
        const updated = await applicationApi.getById(selected.id);
        setApps((p) => p.map((a) => a.id === updated.id ? updated : a));
        setSelected(updated);
        setPayments(updated.payments ?? []);
      }
    } finally { setActionLoading(false); }
  }

  const filtered = tab === "All" ? apps : apps.filter((a) => a.status === tab);
  const countFor = (s: string) => s === "All" ? apps.length : apps.filter((a) => a.status === s).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-brand-900">Applications</h1>
          <p className="text-sm text-brand-500 mt-0.5">Tenant applications and short-stay reservations across your listings</p>
        </div>
        {section === "applications" && (
          <button onClick={load} className="btn-ghost border border-brand-200 flex items-center gap-1.5 text-sm">
            <IcoRefresh size={14} /> Refresh
          </button>
        )}
      </div>

      {/* Section toggle */}
      <div className="flex gap-1.5 rounded-xl bg-brand-50 border border-brand-100 p-1 w-fit">
        {(["applications", "stays"] as const).map((s) => (
          <button key={s} onClick={() => setSection(s)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              section === s ? "bg-brand-teal text-white" : "text-brand-600 hover:text-brand-900"
            }`}>
            {s === "applications" ? "Applications" : "Stays"}
          </button>
        ))}
      </div>

      {section === "stays" ? (
        <StaysPanel ownerId={ownerId} />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatTile icon={IcoClipboard} label="Total Applications" value={apps.length} tint="bg-brand-50 text-brand-700" />
            <StatTile icon={IcoClipboard} label="Pending Approval" value={countFor("PendingApproval")} tint="bg-purple-50 text-purple-600" />
            <StatTile icon={IcoActivity} label="Under Review" value={countFor("UnderReview")} tint="bg-blue-50 text-blue-600" />
            <StatTile icon={IcoCheck} label="Approved" value={countFor("Approved")} tint="bg-teal-50 text-teal-600" />
            <StatTile icon={IcoKey} label="Active Tenancies" value={countFor("Active")} tint="bg-emerald-50 text-emerald-600" />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {TABS.map((t) => {
              const TIco = TAB_ICON[t] ?? IcoClipboard;
              const active = tab === t;
              return (
                <button key={t} onClick={() => setTab(t)}
                  className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 border ${
                    active ? "text-white border-transparent shadow-glow" : "bg-white text-brand-600 border-brand-200 hover:border-brand-teal/50"
                  }`}
                  style={active ? { background: "linear-gradient(135deg,#0d9488,#0f766e)" } : undefined}>
                  <TIco size={13} />
                  {LABEL_MAP[t] ?? t}
                  <span className={`rounded-full px-1.5 text-[10px] font-bold transition-colors ${active ? "bg-white/20 text-white" : "bg-brand-100 text-brand-500"}`}>
                    {countFor(t)}
                  </span>
                </button>
              );
            })}
          </div>

          {loading ? (
            <div className="grid gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="card p-5">
                  <div className="flex items-start gap-4">
                    <div className="skeleton h-12 w-12 rounded-full shrink-0" />
                    <div className="flex-1 space-y-2.5">
                      <div className="skeleton h-4 w-40" />
                      <div className="skeleton h-3 w-56" />
                      <div className="skeleton h-2 w-full" />
                    </div>
                    <div className="skeleton h-6 w-24 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="card text-center py-16">
              <div className="mx-auto mb-3 h-16 w-16 rounded-full bg-brand-50 flex items-center justify-center">
                <IcoClipboard size={28} className="text-brand-300" />
              </div>
              <div className="font-semibold text-brand-700">No applications{tab !== "All" ? ` with status "${LABEL_MAP[tab] ?? tab}"` : " yet"}</div>
              <p className="text-sm text-brand-400 mt-1">Applications from prospective tenants appear here as soon as they apply - booking a viewing is optional and separate.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filtered.map((app, index) => (
                <AppCard key={app.id} app={app} index={index} onClick={() => selectApp(app)} />
              ))}
            </div>
          )}
        </>
      )}

      {selected && (
        <DetailOverlay title="Application Details" onClose={() => { setSelected(null); setPayments([]); }}>
          <AppDetail
            app={selected} payments={payments}
            rejectionReason={rejectionReason} onRejectionChange={setRejectionReason}
            loading={actionLoading}
            onApprove={handleApprove} onReject={handleReject}
            onConfirmPayment={handleConfirmPayment}
          />
        </DetailOverlay>
      )}
    </div>
  );
}

function StaysPanel({ ownerId }: { ownerId?: string }) {
  const [stays, setStays] = useState<ShortStayBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>("All");
  const [selected, setSelected] = useState<ShortStayBooking | null>(null);

  function load() {
    if (!ownerId) return;
    setLoading(true);
    shortStayApi.byOwner(ownerId).then(setStays).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [ownerId]);

  const filtered = tab === "All" ? stays : stays.filter((s) => s.status === tab);
  const countFor = (s: string) => s === "All" ? stays.length : stays.filter((x) => x.status === s).length;

  return (
    <>
      <div className="flex items-center justify-end">
        <button onClick={load} className="btn-ghost border border-brand-200 flex items-center gap-1.5 text-sm">
          <IcoRefresh size={14} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {STAY_TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition border ${
              tab === t ? "bg-brand-teal text-white border-brand-teal" : "bg-white text-brand-600 border-brand-200 hover:border-brand-teal/50"
            }`}>
            {t === "PendingPayment" ? "Payment Pending" : t}
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === t ? "bg-white/20 text-white" : "bg-brand-100 text-brand-500"}`}>
              {countFor(t)}
            </span>
          </button>
        ))}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="flex justify-center py-20"><IcoLoader size={32} className="text-brand-teal" /></div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-16">
            <IcoKey size={40} className="mx-auto text-brand-300 mb-3" />
            <div className="font-semibold text-brand-700">No stays {tab !== "All" ? `with status "${tab}"` : "yet"}</div>
            <p className="text-sm text-brand-400 mt-1">Short-stay bookings for your listings appear here.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((s, index) => (
              <StayCard key={s.id} stay={s} index={index} onClick={() => setSelected(s)} />
            ))}
          </div>
        )}
      </div>

      {selected && (
        <DetailOverlay title="Stay Details" onClose={() => setSelected(null)}>
          <StayDetail stay={selected} />
        </DetailOverlay>
      )}
    </>
  );
}

function StayCard({ stay: s, index, onClick }: { stay: ShortStayBooking; index: number; onClick: () => void }) {
  const st = STAY_STATUS_STYLES[s.status] ?? STAY_STATUS_STYLES.PendingPayment;
  const inDate = new Date(s.checkInDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" });
  const outDate = new Date(s.checkOutDate).toLocaleDateString("en-KE", { day: "numeric", month: "short" });

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="card cursor-pointer hover:-translate-y-0.5 hover:shadow-card-hover transition"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-brand-teal">
          <IcoKey size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="font-semibold text-brand-900">{s.listingTitle ?? `Listing ${s.listingId.slice(0, 8)}`}</div>
              <div className="flex items-center gap-3 mt-0.5 text-sm text-brand-500 flex-wrap">
                <span className="flex items-center gap-1"><IcoCalendar size={12} /> {inDate} → {outDate}</span>
                <span className="flex items-center gap-1"><IcoUser size={12} /> {s.numberOfGuests} guest{s.numberOfGuests !== 1 ? "s" : ""}</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-sm text-brand-700">
                <IcoUser size={12} /> {s.guestName} <span className="text-brand-400">· {s.guestPhone}</span>
              </div>
            </div>
            <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${st.badge}`}>
              {s.status === "PendingPayment" ? "Payment Pending" : s.status}
            </span>
          </div>
        </div>
        <IcoChevRight size={16} className="text-brand-300 shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

function StayDetail({ stay }: { stay: ShortStayBooking }) {
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);
  const st = STAY_STATUS_STYLES[stay.status] ?? STAY_STATUS_STYLES.PendingPayment;
  const inDate = new Date(stay.checkInDate).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const outDate = new Date(stay.checkOutDate).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <div className="space-y-5">
        <InfoRow label="Listing" value={stay.listingTitle ?? stay.listingId} />
        <InfoRow label="Check-in" value={inDate} />
        <InfoRow label="Check-out" value={outDate} />
        <InfoRow label="Nights" value={String(stay.nights)} />
        <InfoRow label="Guests" value={String(stay.numberOfGuests)} />
        <InfoRow label="Status" value={<span className={`font-semibold ${st.text}`}>{stay.status === "PendingPayment" ? "Payment Pending" : stay.status}</span>} />
        <InfoRow label="Guest Name" value={stay.guestName} />
        <InfoRow label="Guest Phone" value={stay.guestPhone} />
        <InfoRow label="Guest Email" value={stay.guestEmail} />
        <InfoRow label="Booking Fee" value={`${stay.currency} ${stay.bookingFeeAmount.toLocaleString()}`} />
        {stay.specialRequests && <InfoRow label="Notes" value={<span className="italic text-brand-600">"{stay.specialRequests}"</span>} />}
        {stay.cancellationReason && <InfoRow label="Cancellation Reason" value={<span className="text-red-600">{stay.cancellationReason}</span>} />}

        <div className="pt-3 border-t border-brand-100">
          <h4 className="text-sm font-semibold text-brand-800 mb-2">ID Verification</h4>
          {stay.documents && stay.documents.length > 0 ? (
            <div className="space-y-2">
              {stay.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-brand-700">
                    <span className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-brand-teal shrink-0">
                      <IcoEye size={14} />
                    </span>
                    {doc.documentType.replace(/([A-Z])/g, " $1").trim()}
                  </div>
                  <button
                    onClick={() => setPreviewDoc({ url: doc.fileUrl, title: doc.documentType })}
                    className="text-xs text-brand-teal hover:underline font-semibold"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-brand-400 italic">
              {stay.status === "Confirmed" ? "Not submitted yet - the guest verifies ID after payment." : "Available once payment is confirmed."}
            </p>
          )}
        </div>

        {stay.payments && stay.payments.length > 0 && (
          <div className="pt-3 border-t border-brand-100">
            <h4 className="text-sm font-semibold text-brand-800 mb-2 flex items-center gap-1.5"><IcoWallet size={14} /> Payment</h4>
            {stay.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2.5 text-sm">
                <span className="text-brand-700">{p.method} · {p.status}</span>
                <span className="font-semibold text-brand-900">{p.currency} {p.amount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {previewDoc && (
        <DocumentPreviewModal url={previewDoc.url} title={previewDoc.title} onClose={() => setPreviewDoc(null)} />
      )}
    </>
  );
}

function StatTile({ icon: Icon, label, value, tint }: {
  icon: (p: { size?: number; className?: string }) => JSX.Element;
  label: string; value: number; tint: string;
}) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`h-10 w-10 shrink-0 rounded-xl flex items-center justify-center ${tint}`}>
        <Icon size={18} />
      </div>
      <div className="min-w-0">
        <div className="text-xl font-bold text-brand-900 leading-none">{value}</div>
        <div className="text-xs text-brand-500 mt-1 truncate">{label}</div>
      </div>
    </div>
  );
}

function AppCard({ app, index, onClick }: { app: TenantApplication; index: number; onClick: () => void }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;
  const Icon = cfg.icon;
  const date = new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });
  const pct = Math.min(100, Math.round((cfg.step / TOTAL_STEPS) * 100));

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: Math.min(index, 8) * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="relative card-hover cursor-pointer overflow-hidden"
    >
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.bar}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start gap-4">
          <div className={`h-12 w-12 shrink-0 rounded-full flex items-center justify-center font-bold text-sm text-white bg-gradient-to-br from-brand-800 to-brand-950 ring-4 ${cfg.ring}`}>
            {initials(app.customerName)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <div className="font-semibold text-brand-900">{app.customerName ?? "Applicant"}</div>
                <div className="text-sm text-brand-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <span className="flex items-center gap-1"><IcoHome size={11} className="text-brand-300" />
                    {app.listingTitle ?? (app.listingId ? `Listing ${app.listingId.slice(0, 8)}` : "Unknown listing")}
                  </span>
                  <span className="text-brand-300">·</span>
                  <span className="flex items-center gap-1"><IcoCalendar size={11} className="text-brand-300" /> Applied {date}</span>
                </div>
              </div>
              <span className={`flex items-center gap-1 shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                <Icon size={11} /> {cfg.label}
              </span>
            </div>

            <div className="progress-track mt-3">
              <div className={`progress-fill ${cfg.bar}`} style={{ width: `${pct}%` }} />
            </div>

            <div className="mt-2.5 flex items-center justify-between text-xs text-brand-400">
              <span className="flex items-center gap-1">
                <IcoDocument size={11} /> {app.documents?.length ?? 0} document{(app.documents?.length ?? 0) !== 1 ? "s" : ""} uploaded
              </span>
              <span className="flex items-center gap-1 text-brand-teal font-semibold">
                Details <IcoChevRight size={12} />
              </span>
            </div>
            {app.reviewedAt && <div className="mt-1.5 text-xs text-brand-400">Reviewed {new Date(app.reviewedAt).toLocaleDateString("en-KE")}</div>}
            {app.rejectionReason && (
              <div className="mt-2 text-xs text-red-600 italic bg-red-50 rounded-lg px-2.5 py-1.5">"{app.rejectionReason}"</div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function docIcon(t: string) {
  if (t === "Selfie") return IcoUser;
  if (t === "DigitalSignature") return IcoEdit;
  return IcoFileText;
}

function AppDetail({
  app, payments, rejectionReason, onRejectionChange, loading, onApprove, onReject, onConfirmPayment
}: {
  app: TenantApplication; payments: RentalPayment[];
  rejectionReason: string; onRejectionChange: (v: string) => void;
  loading: boolean; onApprove: () => void; onReject: () => void;
  onConfirmPayment: (id: string) => void;
}) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;
  const Icon = cfg.icon;
  const pct = Math.min(100, Math.round((cfg.step / TOTAL_STEPS) * 100));
  const [previewDoc, setPreviewDoc] = useState<{ url: string; title: string } | null>(null);

  return (
    <>
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className={`h-14 w-14 shrink-0 rounded-full flex items-center justify-center font-bold text-white bg-gradient-to-br from-brand-800 to-brand-950 ring-4 ${cfg.ring}`}>
          {initials(app.customerName)}
        </div>
        <div className="min-w-0">
          <div className="font-bold text-brand-900 truncate">{app.customerName ?? "Applicant"}</div>
          <span className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
            <Icon size={11} /> {cfg.label}
          </span>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[11px] font-bold text-brand-400 uppercase tracking-wide mb-1.5">
          <span>Application Progress</span>
          <span>Step {cfg.step}/{TOTAL_STEPS}</span>
        </div>
        <div className="progress-track">
          <div className={`progress-fill ${cfg.bar}`} style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="space-y-2 pt-1">
        {app.customerEmail && <InfoRow label="Email" value={app.customerEmail} />}
        {app.customerPhone && <InfoRow label="Phone" value={app.customerPhone} />}
        <InfoRow label="Listing" value={app.listingTitle ?? app.listingId} />
        <InfoRow label="Applied" value={new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })} />
        {app.reviewedAt && <InfoRow label="Reviewed" value={new Date(app.reviewedAt).toLocaleDateString("en-KE")} />}
        {app.reviewedBy && <InfoRow label="Reviewed By" value={app.reviewedBy} />}
        {app.termsAcceptedAt && <InfoRow label="Terms Accepted" value={new Date(app.termsAcceptedAt).toLocaleDateString("en-KE")} />}
      </div>

      {/* Documents */}
      <div className="pt-3 border-t border-brand-100">
        <h4 className="text-sm font-semibold text-brand-800 mb-2">Uploaded Documents</h4>
        {app.documents && app.documents.length > 0 ? (
          <div className="space-y-2">
            {app.documents.map((doc) => {
              const DocIcon = docIcon(doc.documentType);
              return (
                <div key={doc.id} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2.5">
                  <div className="flex items-center gap-2.5 text-sm text-brand-700">
                    <span className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-brand-teal shrink-0">
                      <DocIcon size={14} />
                    </span>
                    {formatDocType(doc.documentType)}
                  </div>
                  <button
                    onClick={() => setPreviewDoc({ url: doc.fileUrl, title: formatDocType(doc.documentType) })}
                    className="text-xs text-brand-teal hover:underline font-semibold"
                  >
                    View
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-brand-400 italic">No documents uploaded yet.</p>
        )}
      </div>

      {/* Payments */}
      <div className="pt-3 border-t border-brand-100">
        <h4 className="text-sm font-semibold text-brand-800 mb-2">Payments</h4>
        {payments.length > 0 ? (
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-brand-50 rounded-xl px-3 py-2.5">
                <div className="flex items-center gap-2.5 text-sm">
                  <span className="h-7 w-7 rounded-lg bg-white flex items-center justify-center text-brand-teal shrink-0">
                    <IcoWallet size={14} />
                  </span>
                  <div>
                    <div className="font-medium text-brand-800">{p.paymentType} — {p.method}</div>
                    <div className="text-xs text-brand-500">{p.currency} {p.amount?.toLocaleString()} · {p.status}</div>
                    {p.mpesaReceiptNumber && <div className="text-xs text-brand-400">Receipt: {p.mpesaReceiptNumber}</div>}
                  </div>
                </div>
                {p.status === "Pending" && (
                  <button onClick={() => onConfirmPayment(p.id)} disabled={loading}
                    className="btn-primary text-xs px-3 py-1.5 shrink-0">
                    {loading ? <IcoLoader size={12} /> : "Confirm"}
                  </button>
                )}
                {p.status === "Confirmed" && <span className="text-xs text-emerald-600 font-semibold shrink-0">✓ Confirmed</span>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-brand-400 italic">No payments recorded yet.</p>
        )}
      </div>

      {/* Pre-screen gate: approve or reject the applicant before any documents are requested */}
      {app.status === "PendingApproval" && (
        <div className="pt-3 border-t border-brand-100 space-y-3">
          <h4 className="text-sm font-semibold text-brand-800">Pre-Screening Decision</h4>
          <p className="text-xs text-brand-400">Approving moves them on to document upload - it isn't the final tenancy decision yet.</p>
          <div>
            <label className="field-label">Rejection reason <span className="text-brand-400">(required if rejecting)</span></label>
            <textarea rows={2} value={rejectionReason} onChange={(e) => onRejectionChange(e.target.value)}
              placeholder="e.g. Listing no longer available for this move-in date…"
              className="input resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={onApprove} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <IcoLoader size={14} /> : <><IcoCheck size={14} /> Approve Applicant</>}
            </button>
            <button onClick={onReject} disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? <IcoLoader size={14} /> : <><IcoX size={14} /> Reject</>}
            </button>
          </div>
        </div>
      )}

      {/* Document-review gate: approve or reject after documents have been submitted */}
      {app.status === "UnderReview" && (
        <div className="pt-3 border-t border-brand-100 space-y-3">
          <h4 className="text-sm font-semibold text-brand-800">Review Decision</h4>
          <div>
            <label className="field-label">Rejection reason <span className="text-brand-400">(required if rejecting)</span></label>
            <textarea rows={2} value={rejectionReason} onChange={(e) => onRejectionChange(e.target.value)}
              placeholder="e.g. Income does not meet minimum requirement…"
              className="input resize-none" />
          </div>
          <div className="flex gap-2">
            <button onClick={onApprove} disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? <IcoLoader size={14} /> : <><IcoCheck size={14} /> Approve</>}
            </button>
            <button onClick={onReject} disabled={loading} className="btn-danger flex-1 justify-center">
              {loading ? <IcoLoader size={14} /> : <><IcoX size={14} /> Reject</>}
            </button>
          </div>
        </div>
      )}

      {app.status === "Rejected" && (
        <div className="pt-3 border-t border-brand-100">
          <InfoRow label="Rejection Reason" value={<span className="text-red-600">{app.rejectionReason ?? "–"}</span>} />
        </div>
      )}
    </div>
    {previewDoc && (
      <DocumentPreviewModal url={previewDoc.url} title={previewDoc.title} onClose={() => setPreviewDoc(null)} />
    )}
    </>
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

function formatDocType(t: string) {
  const map: Record<string, string> = {
    IdFront: "ID Front", IdBack: "ID Back", Selfie: "Selfie", DigitalSignature: "Digital Signature",
  };
  return map[t] ?? t;
}

function DetailOverlay({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setShow(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/30 backdrop-blur-sm transition-opacity duration-300 ${show ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <div
        className={`fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl overflow-y-auto transition-transform duration-300 ease-out ${show ? "translate-x-0" : "translate-x-full"}`}
      >
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
