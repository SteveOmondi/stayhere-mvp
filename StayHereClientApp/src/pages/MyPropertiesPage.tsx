import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { customerApi } from "../lib/api";
import { formatKes, primaryImage, resolveLocation } from "../lib/format";
import { useApp } from "../context/AppContext";
import { GradientBlobs, CardSkeleton } from "../components/ui";
import {
  IcoArrowRight, IcoBell, IcoBed, IcoBath, IcoBuilding, IcoCalendar,
  IcoCheck, IcoKey, IcoLoader, IcoLocation, IcoWallet, IcoX,
} from "../components/icons";

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

function RentStepsBanner() {
  const steps = [
    { icon: <IcoKey size={20} className="text-brand-gold" />, title: "1. Browse & Save", desc: "Explore listings and save favourites" },
    { icon: <IcoCalendar size={20} className="text-brand-teallight" />, title: "2. Book a Viewing", desc: "Schedule a physical or virtual tour" },
    { icon: <IcoCheck size={20} className="text-emerald-400" />, title: "3. Sign Lease", desc: "Digital agreement, no paperwork" },
    { icon: <IcoWallet size={20} className="text-brand-gold" />, title: "4. Pay & Move In", desc: "Secure payment, instant confirmation" },
  ];
  return (
    <div className="mb-10 overflow-hidden rounded-3xl glass-strong p-6">
      <h3 className="font-display text-lg font-semibold text-white mb-4 text-center">How It Works</h3>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {steps.map((s, i) => (
          <motion.div
            key={s.title}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="flex flex-col items-center gap-2 text-center"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/5">{s.icon}</div>
            <span className="text-xs font-semibold text-white">{s.title}</span>
            <span className="text-xs text-brand-muted leading-snug">{s.desc}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
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

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;

  useEffect(() => {
    if (!customerId) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      customerApi.getProperties(customerId).catch(() => []),
      customerApi.getDocuments(customerId).catch(() => []),
    ]).then(([props, docList]) => {
      setProperties((props as TenantProperty[]) ?? []);
      setDocs((docList as { name: string; url: string }[]) ?? []);
    }).catch(() => toast("Failed to load property data", "error")).finally(() => setLoading(false));
  }, [customerId]);

  function openPay(p: TenantProperty) {
    setPayModal({ open: true, property: p, amount: String(p.rentAmount ?? 0), paying: false });
  }

  const active = properties.filter((p) => (p.status ?? "active").toLowerCase() === "active");
  const history = properties.filter((p) => (p.status ?? "active").toLowerCase() !== "active");

  return (
    <div className="pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden gradient-hero px-4 py-16 text-center">
        <GradientBlobs />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <span className="mb-3 inline-block rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-brand-gold">
            My Dashboard
          </span>
          <h1 className="font-display text-3xl font-bold text-white sm:text-4xl">
            Welcome back, {customerProfile?.fullName?.split(" ")[0] ?? authUser?.name?.split(" ")[0] ?? "Tenant"}
          </h1>
          <p className="mt-3 text-brand-muted">Manage your rentals, payments, and documents.</p>
        </motion.div>
      </section>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <RentStepsBanner />

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-2xl bg-white/5 p-1 max-w-sm">
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
            <div className="grid gap-6 sm:grid-cols-2">
              <AnimatePresence>
                {active.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                    className="card-dark overflow-hidden"
                  >
                    {/* Image */}
                    <div className="h-44 w-full overflow-hidden relative cursor-pointer" onClick={() => p.listingId && navigate(`/listing/${p.listingId}`)}>
                      <img src={primaryImage(p as never)} alt={p.title ?? "Property"} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                      <div className="absolute top-3 left-3">
                        <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-3 py-1 text-xs text-emerald-300 font-semibold backdrop-blur-sm">
                          Active
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-lg font-semibold text-white truncate">{p.title ?? "Your Property"}</h3>
                      <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-1">
                        <IcoLocation size={13} className="text-brand-teal shrink-0" />
                        {(() => { const l = resolveLocation(p as never); return [l.suburb, l.city].filter(Boolean).join(", ") || "Kenya"; })()}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-3 text-sm text-white/70">
                        {p.bedrooms != null && <span className="flex items-center gap-1"><IcoBed size={13} className="text-brand-muted" /> {p.bedrooms} BR</span>}
                        {p.bathrooms != null && <span className="flex items-center gap-1"><IcoBath size={13} className="text-brand-muted" /> {p.bathrooms} BA</span>}
                      </div>

                      {/* Lease + rent */}
                      <div className="mt-4 rounded-xl bg-white/5 p-3 space-y-1.5 text-sm">
                        <div className="flex justify-between">
                          <span className="text-brand-muted">Monthly Rent</span>
                          <span className="font-semibold text-brand-gold">{formatKes(p.rentAmount)}</span>
                        </div>
                        {p.nextDueDate && (
                          <div className="flex justify-between">
                            <span className="text-brand-muted">Next Due</span>
                            <span className="text-white">{new Date(p.nextDueDate).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}</span>
                          </div>
                        )}
                        {p.leaseStartDate && (
                          <div className="flex justify-between">
                            <span className="text-brand-muted">Lease</span>
                            <span className="text-white text-xs">
                              {new Date(p.leaseStartDate).toLocaleDateString("en-KE", { month: "short", year: "numeric" })}
                              {" – "}
                              {p.leaseEndDate ? new Date(p.leaseEndDate).toLocaleDateString("en-KE", { month: "short", year: "numeric" }) : "Ongoing"}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button onClick={() => openPay(p)} className="btn-gold flex-1 justify-center text-sm py-2.5">
                          <IcoWallet size={15} /> Pay Rent
                        </button>
                        {p.listingId && (
                          <button onClick={() => navigate(`/listing/${p.listingId}`)} className="btn-ghost text-sm py-2.5 px-3">
                            <IcoArrowRight size={15} />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )
        ) : tab === "history" ? (
          history.length === 0 ? (
            <div className="py-16 text-center text-brand-muted">No past tenancies found.</div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {history.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="card-dark p-5 flex gap-4">
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
          /* Documents */
          docs.length === 0 ? (
            <div className="py-16 text-center text-brand-muted">No documents available yet.</div>
          ) : (
            <div className="space-y-3">
              {docs.map((doc, i) => (
                <motion.a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-dark flex items-center gap-4 p-4 hover:border-brand-gold/30 transition"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10">
                    <IcoBell size={18} className="text-brand-gold" />
                  </div>
                  <span className="flex-1 text-sm text-white">{doc.name}</span>
                  <IcoArrowRight size={16} className="text-brand-muted shrink-0" />
                </motion.a>
              ))}
            </div>
          )
        )}
      </div>

      <AnimatePresence>
        {payModal.open && <PayModal modal={payModal} onClose={() => setPayModal((m) => ({ ...m, open: false }))} />}
      </AnimatePresence>
    </div>
  );
}
