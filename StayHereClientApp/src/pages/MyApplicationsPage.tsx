import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { applicationApi, type TenantApplication } from "../lib/api";
import { useApp } from "../context/AppContext";
import { GradientBlobs, SectionHeading } from "../components/ui";
import { IcoArrowRight, IcoCalendar, IcoCheck, IcoChevRight, IcoKey, IcoLoader, IcoX } from "../components/icons";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; step: number }> = {
  DocumentsPending: { label: "Documents Pending",  color: "text-yellow-400",  bg: "bg-yellow-400/15",  step: 1 },
  UnderReview:      { label: "Under Review",        color: "text-blue-400",    bg: "bg-blue-400/15",    step: 2 },
  Approved:         { label: "Approved",            color: "text-emerald-400", bg: "bg-emerald-400/15", step: 3 },
  Rejected:         { label: "Not Approved",        color: "text-red-400",     bg: "bg-red-400/15",     step: 3 },
  TermsAccepted:    { label: "Terms Accepted",      color: "text-teal-400",    bg: "bg-teal-400/15",    step: 4 },
  PaymentPending:   { label: "Payment Pending",     color: "text-orange-400",  bg: "bg-orange-400/15",  step: 5 },
  Active:           { label: "Active Tenancy",      color: "text-green-400",   bg: "bg-green-400/15",   step: 6 },
  Cancelled:        { label: "Cancelled",           color: "text-gray-400",    bg: "bg-gray-400/15",    step: 0 },
};

const TIMELINE = [
  "Documents Pending",
  "Under Review",
  "Approved",
  "Terms Accepted",
  "Payment Pending",
  "Active",
];

export function MyApplicationsPage() {
  const { customerProfile, isAuthenticated } = useApp();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<TenantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<TenantApplication | null>(null);

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? "";

  useEffect(() => {
    if (!isAuthenticated) { navigate("/login?redirect=/my-applications", { replace: true }); return; }
    if (!customerId) return;
    applicationApi.getByCustomer(customerId)
      .then(setApplications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isAuthenticated, customerId]);

  const activeApps = applications.filter((a) => !["Cancelled"].includes(a.status));
  const pastApps = applications.filter((a) => a.status === "Cancelled");

  return (
    <div className="min-h-screen pb-24 gradient-hero relative overflow-hidden">
      <GradientBlobs />
      <div className="mx-auto max-w-4xl px-4 py-12">
        <SectionHeading
          title="My Applications"
          subtitle="Track all your rental applications and their progress"
        />

        {loading ? (
          <div className="flex justify-center py-20"><IcoLoader size={36} className="text-brand-gold animate-spin" /></div>
        ) : applications.length === 0 ? (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
            <div className="text-5xl mb-4">🏠</div>
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
                    <AppCard key={app.id} app={app} index={i} onClick={() => setSelected(app)} />
                  ))}
                </div>
              </section>
            )}
            {pastApps.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-brand-muted mb-3">Past Applications</h3>
                <div className="space-y-4 opacity-60">
                  {pastApps.map((app, i) => (
                    <AppCard key={app.id} app={app} index={i} onClick={() => setSelected(app)} />
                  ))}
                </div>
              </section>
            )}
          </div>
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
              <AppDetail app={selected} onClose={() => setSelected(null)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function AppCard({ app, index, onClick }: { app: TenantApplication; index: number; onClick: () => void }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;
  const createdDate = new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" });

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      onClick={onClick}
      className="glass rounded-2xl p-5 cursor-pointer hover:bg-white/[0.06] transition group"
    >
      <div className="flex items-start gap-4">
        <div className="h-14 w-14 shrink-0 rounded-xl bg-white/10 flex items-center justify-center text-2xl">
          🏠
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-white truncate">Application #{app.id.slice(0, 8).toUpperCase()}</span>
            <span className={`shrink-0 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-brand-muted">
            <span className="flex items-center gap-1"><IcoCalendar size={11} /> {createdDate}</span>
            {app.documents && <span>{app.documents.length} doc{app.documents.length !== 1 ? "s" : ""} uploaded</span>}
          </div>
          <ProgressBar status={app.status} />
        </div>
        <IcoChevRight size={16} className="text-brand-muted group-hover:text-white transition shrink-0 mt-1" />
      </div>
    </motion.div>
  );
}

function ProgressBar({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg || cfg.step === 0) return null;
  const pct = Math.round((cfg.step / 6) * 100);
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full rounded-full bg-white/10">
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-full rounded-full ${status === "Active" ? "bg-green-400" : status === "Rejected" ? "bg-red-400" : "bg-brand-gold"}`} />
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-white/25 uppercase tracking-wider">
        {TIMELINE.map((l, i) => (
          <span key={i} className={cfg.step > i ? "text-white/50" : ""}>{l.split(" ")[0]}</span>
        ))}
      </div>
    </div>
  );
}

function AppDetail({ app, onClose }: { app: TenantApplication; onClose: () => void }) {
  const cfg = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.DocumentsPending;

  const steps = [
    { label: "Viewing Booked",       done: true },
    { label: "Application Submitted", done: true },
    { label: "Documents Uploaded",   done: (app.documents?.length ?? 0) > 0 },
    { label: "Under Review",         done: ["UnderReview","Approved","TermsAccepted","PaymentPending","Active"].includes(app.status) },
    { label: "Approved",             done: ["Approved","TermsAccepted","PaymentPending","Active"].includes(app.status) },
    { label: "Terms Accepted",       done: ["TermsAccepted","PaymentPending","Active"].includes(app.status) },
    { label: "Payment Made",         done: app.status === "Active" },
    { label: "Move-In Ready",        done: app.status === "Active" },
  ];

  const isContinuable = ["DocumentsPending","Approved","TermsAccepted","PaymentPending"].includes(app.status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold text-white">Application Details</h2>
        <button onClick={onClose} className="text-brand-muted hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition">
          <IcoX size={18} />
        </button>
      </div>

      {/* Status badge */}
      <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 ${cfg.bg}`}>
        <span className={`text-lg font-bold ${cfg.color}`}>{cfg.label}</span>
      </div>

      {app.rejectionReason && (
        <div className="glass rounded-xl p-4 border border-red-500/20">
          <div className="text-sm font-semibold text-red-400 mb-1">Reason for Rejection</div>
          <p className="text-sm text-brand-muted">{app.rejectionReason}</p>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-0">
        <h3 className="text-xs uppercase tracking-wider text-brand-muted mb-3">Progress Timeline</h3>
        {steps.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold mt-0.5 ${s.done ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30"}`}>
                {s.done ? <IcoCheck size={11} /> : i + 1}
              </div>
              {i < steps.length - 1 && <div className={`w-0.5 h-6 mt-0.5 ${s.done ? "bg-emerald-500/40" : "bg-white/10"}`} />}
            </div>
            <div className="pb-2 pt-0.5">
              <span className={`text-sm ${s.done ? "text-white" : "text-white/30"}`}>{s.label}</span>
              {s.done && i === 0 && app.createdAt && (
                <div className="text-[11px] text-brand-muted mt-0.5">
                  {new Date(app.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short" })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Documents */}
      {app.documents && app.documents.length > 0 && (
        <div>
          <h3 className="text-xs uppercase tracking-wider text-brand-muted mb-3">Uploaded Documents</h3>
          <div className="space-y-2">
            {app.documents.map((doc) => (
              <div key={doc.id} className="glass rounded-xl px-4 py-2.5 flex items-center justify-between">
                <span className="text-sm text-white">{formatDocType(doc.documentType)}</span>
                <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-brand-teallight hover:underline">View</a>
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
    </div>
  );
}

function formatDocType(t: string): string {
  return t.replace(/([A-Z])/g, " $1").trim();
}
