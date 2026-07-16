import { useEffect, useState } from "react";
import { applicationApi, paymentApi, type TenantApplication, type RentalPayment } from "../lib/api";
// paymentApi.confirm is used for manual payment confirmation
import { useOwner } from "../context/OwnerContext";
import {
  IcoCheck, IcoChevRight, IcoClipboard, IcoDocument, IcoLoader,
  IcoRefresh, IcoUser, IcoX,
} from "../components/icons";

const STATUS_CONFIG: Record<string, { label: string; badge: string; step: number }> = {
  DocumentsPending: { label: "Docs Pending",    badge: "bg-yellow-50 text-yellow-700 border-yellow-200", step: 1 },
  UnderReview:      { label: "Under Review",    badge: "bg-blue-50 text-blue-700 border-blue-200",       step: 2 },
  Approved:         { label: "Approved",        badge: "bg-teal-50 text-teal-700 border-teal-200",       step: 3 },
  Rejected:         { label: "Rejected",        badge: "bg-red-50 text-red-600 border-red-200",          step: 3 },
  TermsAccepted:    { label: "Terms Accepted",  badge: "bg-indigo-50 text-indigo-700 border-indigo-200", step: 4 },
  PaymentPending:   { label: "Pmt Pending",     badge: "bg-orange-50 text-orange-700 border-orange-200", step: 5 },
  Active:           { label: "Active",          badge: "bg-green-50 text-green-700 border-green-200",    step: 6 },
  Cancelled:        { label: "Cancelled",       badge: "bg-gray-50 text-gray-500 border-gray-200",       step: 0 },
};

const TABS = ["All", "UnderReview", "Approved", "Rejected", "Active", "Cancelled"] as const;
const LABEL_MAP: Record<string, string> = { UnderReview: "Under Review", Approved: "Approved", Rejected: "Rejected", Active: "Active", Cancelled: "Cancelled", All: "All" };

export function ApplicationsPage() {
  const { owner, toast } = useOwner();
  const ownerId = owner?.id ?? "";
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

  async function handleApprove() {
    if (!selected) return;
    setActionLoading(true);
    try {
      const updated = await applicationApi.review(selected.id, {
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
      const updated = await applicationApi.review(selected.id, {
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
          <h1 className="text-2xl font-bold text-brand-900">Tenant Applications</h1>
          <p className="text-sm text-brand-500 mt-0.5">Review documents, approve or reject applicants, and confirm payments</p>
        </div>
        <button onClick={load} className="btn-ghost border border-brand-200 flex items-center gap-1.5 text-sm">
          <IcoRefresh size={14} /> Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition border ${
              tab === t ? "bg-brand-teal text-white border-brand-teal" : "bg-white text-brand-600 border-brand-200 hover:border-brand-teal/50"
            }`}>
            {LABEL_MAP[t] ?? t}
            <span className={`rounded-full px-1.5 text-[10px] font-bold ${tab === t ? "bg-white/20 text-white" : "bg-brand-100 text-brand-500"}`}>
              {countFor(t)}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><IcoLoader size={32} className="text-brand-teal" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-16">
          <IcoClipboard size={40} className="mx-auto text-brand-300 mb-3" />
          <div className="font-semibold text-brand-700">No applications{tab !== "All" ? ` with status "${LABEL_MAP[tab] ?? tab}"` : " yet"}</div>
          <p className="text-sm text-brand-400 mt-1">Applications from prospective tenants appear here after booking a viewing.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((app) => (
            <AppCard key={app.id} app={app} onClick={() => selectApp(app)} />
          ))}
        </div>
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

function AppCard({ app, onClick }: { app: TenantApplication; onClick: () => void }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;
  const date = new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div onClick={onClick} className="card cursor-pointer hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4">
        <div className="h-11 w-11 shrink-0 rounded-xl bg-indigo-50 flex items-center justify-center">
          <IcoUser size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <div className="font-semibold text-brand-900">{app.customerName ?? "Applicant"}</div>
              <div className="text-sm text-brand-500 mt-0.5">
                {app.listingTitle ?? (app.listingId ? `Listing ${app.listingId.slice(0, 8)}` : "Unknown listing")}
                {" · "}Applied {date}
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>{cfg.label}</span>
          </div>
          <div className="mt-2 flex items-center gap-3 text-xs text-brand-400">
            <span className="flex items-center gap-1">
              <IcoDocument size={11} /> {app.documents?.length ?? 0} document{(app.documents?.length ?? 0) !== 1 ? "s" : ""} uploaded
            </span>
            {app.reviewedAt && <span>Reviewed {new Date(app.reviewedAt).toLocaleDateString("en-KE")}</span>}
          </div>
          {app.rejectionReason && (
            <div className="mt-2 text-xs text-red-600 italic">"{app.rejectionReason}"</div>
          )}
        </div>
        <IcoChevRight size={16} className="text-brand-300 shrink-0 mt-1" />
      </div>
    </div>
  );
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

  return (
    <div className="space-y-5">
      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cfg.badge}`}>
        {cfg.label}
      </div>

      <InfoRow label="Applicant" value={app.customerName ?? "–"} />
      {app.customerEmail && <InfoRow label="Email" value={app.customerEmail} />}
      {app.customerPhone && <InfoRow label="Phone" value={app.customerPhone} />}
      <InfoRow label="Listing" value={app.listingTitle ?? app.listingId} />
      <InfoRow label="Applied" value={new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "long", year: "numeric" })} />
      {app.reviewedAt && <InfoRow label="Reviewed" value={new Date(app.reviewedAt).toLocaleDateString("en-KE")} />}
      {app.reviewedBy && <InfoRow label="Reviewed By" value={app.reviewedBy} />}
      {app.termsAcceptedAt && <InfoRow label="Terms Accepted" value={new Date(app.termsAcceptedAt).toLocaleDateString("en-KE")} />}

      {/* Documents */}
      {app.documents && app.documents.length > 0 && (
        <div className="pt-3 border-t border-brand-100">
          <h4 className="text-sm font-semibold text-brand-800 mb-2">Uploaded Documents</h4>
          <div className="space-y-2">
            {app.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between bg-brand-50 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-brand-700">
                  <IcoDocument size={14} className="text-brand-teal" />
                  {formatDocType(doc.documentType)}
                </div>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-brand-teal hover:underline font-medium">View</a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payments */}
      {payments.length > 0 && (
        <div className="pt-3 border-t border-brand-100">
          <h4 className="text-sm font-semibold text-brand-800 mb-2">Payments</h4>
          <div className="space-y-2">
            {payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-brand-50 rounded-lg px-3 py-2">
                <div className="text-sm">
                  <div className="font-medium text-brand-800">{p.paymentType} — {p.method}</div>
                  <div className="text-xs text-brand-500">{p.currency} {p.amount?.toLocaleString()} · {p.status}</div>
                  {p.mpesaReceiptNumber && <div className="text-xs text-brand-400">Receipt: {p.mpesaReceiptNumber}</div>}
                </div>
                {p.status === "Pending" && (
                  <button onClick={() => onConfirmPayment(p.id)} disabled={loading}
                    className="btn-primary text-xs px-3 py-1.5">
                    {loading ? <IcoLoader size={12} /> : "Confirm"}
                  </button>
                )}
                {p.status === "Confirmed" && <span className="text-xs text-green-600 font-semibold">✓ Confirmed</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions for UnderReview */}
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
