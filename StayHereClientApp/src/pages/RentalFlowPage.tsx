import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  listingsApi, bookingApi, applicationApi, termsApi, paymentApi,
  uploadFileToR2,
  type Listing, type ViewingBooking, type TenantApplication, type PropertyTerms, type PaymentInitiateResult,
} from "../lib/api";
import { useApp } from "../context/AppContext";
import { listingTitle, listingLocation, formatKes, primaryImage } from "../lib/format";
import { GradientBlobs } from "../components/ui";
import {
  IcoArrowRight, IcoCalendar, IcoCheck,
  IcoKey, IcoLoader, IcoLocation, IcoPhone, IcoSparkle,
  IcoUser, IcoWallet, IcoX, IcoEye, IcoShare,
} from "../components/icons";

/* ── Step definitions ────────────────────────────────────────────────────── */
const STEPS = [
  { id: 1, label: "Book Viewing",  icon: <IcoEye size={18} /> },
  { id: 2, label: "Apply",         icon: <IcoUser size={18} /> },
  { id: 3, label: "Documents",     icon: <IcoShare size={18} /> },
  { id: 4, label: "Terms",         icon: <IcoKey size={18} /> },
  { id: 5, label: "Payment",       icon: <IcoWallet size={18} /> },
  { id: 6, label: "Welcome!",      icon: <IcoSparkle size={18} /> },
];

const TIMES = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const DOC_TYPES = [
  { key: "IdFront",   label: "ID / Passport — Front",  hint: "Clear photo of the front of your National ID or Passport" },
  { key: "IdBack",    label: "ID / Passport — Back",   hint: "Clear photo of the back of your National ID" },
  { key: "Selfie",    label: "Selfie",                 hint: "A clear selfie of your face" },
];

type DocState = { file?: File; url?: string; uploading: boolean; error?: string };

export function RentalFlowPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { authUser, customerProfile, isAuthenticated, toast } = useApp();
  const listingId = params.get("listingId") ?? "";

  const [step, setStep] = useState(1);
  const [listing, setListing] = useState<Listing | null>(null);
  const [terms, setTerms] = useState<PropertyTerms | null>(null);
  const [booking, setBooking] = useState<ViewingBooking | null>(null);
  const [application, setApplication] = useState<TenantApplication | null>(null);
  const [payResult, setPayResult] = useState<PaymentInitiateResult | null>(null);
  const [onboarding, setOnboarding] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  // Step 1 — Booking
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("10:00");
  const [bookType, setBookType] = useState("Physical");
  const [bookNotes, setBookNotes] = useState("");
  const [bookPhone, setBookPhone] = useState("");

  // Step 3 — Documents
  const [docs, setDocs] = useState<Record<string, DocState>>({
    IdFront: { uploading: false }, IdBack: { uploading: false }, Selfie: { uploading: false },
  });
  const [sigPad, setSigPad] = useState<string>(""); // Data URL from canvas

  // Step 5 — Payment
  const [payMethod, setPayMethod] = useState<"Mpesa" | "BankTransfer">("Mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;

  /* Redirect if not authenticated */
  useEffect(() => {
    if (!isAuthenticated) navigate("/login?redirect=/rental-flow?listingId=" + listingId, { replace: true });
  }, [isAuthenticated]);

  /* Load listing + terms */
  useEffect(() => {
    if (!listingId) return;
    listingsApi.getById(listingId).then(setListing).catch(() => toast("Listing not found", "error"));
    termsApi.getByListing(listingId).then(setTerms).catch(() => {});
  }, [listingId]);

  useEffect(() => () => { if (pollInterval) clearInterval(pollInterval); }, [pollInterval]);

  /* ── Step 1: Book viewing ─────────────────────────────────────────────── */
  async function handleBooking() {
    if (!bookDate) { toast("Please select a preferred date", "error"); return; }
    if (!customerId) { toast("Could not identify your account. Please sign in again.", "error"); return; }
    setLoading(true);
    try {
      const b = await bookingApi.create({
        listingId,
        customerId,
        viewingDate: (() => { const [y,m,d] = bookDate.split("-").map(Number); return new Date(y, m-1, d, 12, 0, 0).toISOString(); })(),
        viewingTime: bookTime,
        viewingType: bookType,
        notes: bookNotes || undefined,
        contactPhone: bookPhone || undefined,
      });
      setBooking(b);
      setStep(2);
    } catch { toast("Could not book viewing. Please try again.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 2: Start application ────────────────────────────────────────── */
  async function handleApply() {
    if (!customerId) { toast("Could not identify your account. Please sign in again.", "error"); return; }
    setLoading(true);
    try {
      const app = await applicationApi.create({
        listingId,
        customerId,
        viewingBookingId: booking?.id,
      });
      setApplication(app);
      setStep(3);
    } catch { toast("Could not start application. Please try again.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 3: Upload documents ─────────────────────────────────────────── */
  async function handleDocUpload(docType: string, file: File) {
    setDocs((d) => ({ ...d, [docType]: { uploading: true } }));
    try {
      // Request presigned PUT URL from property service
      const uploadRes = await fetch(`/api/property/upload/presigned-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("sh_client_auth_token")}` },
        body: JSON.stringify({ folder: "applications/documents", fileName: file.name, contentType: file.type }),
      });
      if (!uploadRes.ok) throw new Error("Could not get upload URL");
      const { uploadUrl, publicUrl, contentType } = await uploadRes.json() as { uploadUrl: string; publicUrl: string; contentType: string };
      await uploadFileToR2(uploadUrl, file, contentType);
      setDocs((d) => ({ ...d, [docType]: { file, url: publicUrl, uploading: false } }));
    } catch (err) {
      setDocs((d) => ({ ...d, [docType]: { uploading: false, error: "Upload failed" } }));
      toast("Document upload failed", "error");
    }
  }

  async function handleSubmitDocs() {
    if (!application) return;
    const missing = DOC_TYPES.filter((t) => !docs[t.key]?.url);
    if (missing.length) { toast(`Please upload: ${missing.map((m) => m.label).join(", ")}`, "error"); return; }
    setLoading(true);
    try {
      for (const dt of DOC_TYPES) {
        const d = docs[dt.key];
        if (d?.url) {
          await applicationApi.addDocument(application.id, {
            documentType: dt.key, fileUrl: d.url, fileName: d.file?.name,
          });
        }
      }
      // Save digital signature if drawn
      if (sigPad) {
        await applicationApi.addDocument(application.id, {
          documentType: "DigitalSignature", fileUrl: sigPad, fileName: "signature.png",
        });
      }
      const updated = await applicationApi.submit(application.id);
      setApplication(updated);
      setStep(4);
    } catch { toast("Could not submit documents.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 4: Accept terms ─────────────────────────────────────────────── */
  async function handleAcceptTerms() {
    if (!application) return;
    setLoading(true);
    try {
      const updated = await applicationApi.acceptTerms(application.id, sigPad || undefined);
      setApplication(updated);
      setStep(5);
    } catch { toast("Could not record acceptance.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 5: Payment ──────────────────────────────────────────────────── */
  async function handlePayment() {
    if (!application) return;
    if (payMethod === "Mpesa" && !mpesaPhone) { toast("Enter M-Pesa phone number", "error"); return; }
    setLoading(true);
    try {
      const totalAmount = (terms?.securityDeposit ?? 0) + (terms?.adminFee ?? 0);
      const result = await paymentApi.initiate(application.id, {
        method: payMethod,
        phoneNumber: mpesaPhone,
        paymentType: "SecurityDeposit",
        amount: totalAmount,
      });
      setPayResult(result);

      if (payMethod === "Mpesa" && result.mpesaCheckoutRequestId) {
        // Poll for confirmation
        const iv = setInterval(async () => {
          const statuses = await paymentApi.getStatus(application.id).catch(() => []);
          const confirmed = statuses.find((p) => p.status === "Confirmed");
          if (confirmed) {
            clearInterval(iv);
            setPollInterval(null);
            const ob = await paymentApi.getOnboarding(application.id).catch(() => null);
            setOnboarding(ob);
            setStep(6);
          }
        }, 4000);
        setPollInterval(iv);
      }
    } catch { toast("Payment initiation failed. Please try again.", "error"); }
    finally { setLoading(false); }
  }

  /* After bank transfer: manual proceed */
  async function handleBankTransferDone() {
    if (!application) return;
    // Customer claims payment done; owner will confirm manually
    const ob = await paymentApi.getOnboarding(application.id).catch(() => ({
      message: "Your payment has been registered. The property manager will confirm it shortly.",
      onboardingInstructions: terms?.onboardingInstructions,
      accessInstructions: terms?.accessInstructions,
      itemsToCarry: terms?.itemsToCarry,
    }));
    setOnboarding(ob);
    setStep(6);
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <IcoLoader size={32} className="text-brand-gold animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 gradient-hero relative overflow-hidden">
      <GradientBlobs />

      {/* ── Progress Header ──────────────────────────────────────────────── */}
      <div className="sticky top-16 z-20 bg-brand-dark/90 backdrop-blur-xl border-b border-white/5 px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl">
                <img src={primaryImage(listing)} alt="" className="h-full w-full object-cover" />
              </div>
              <div>
                <div className="font-semibold text-white text-sm truncate max-w-48">{listingTitle(listing)}</div>
                <div className="text-xs text-brand-muted flex items-center gap-1">
                  <IcoLocation size={11} className="text-brand-teal" />{listingLocation(listing)}
                </div>
              </div>
            </div>
            <button onClick={() => navigate(-1)} className="text-brand-muted hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition">
              <IcoX size={18} />
            </button>
          </div>

          {/* Step pills */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => (
              <div key={s.id} className="flex items-center gap-0 flex-1 min-w-0">
                <div className="flex flex-col items-center min-w-0 flex-1">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-all ${
                    step > s.id ? "bg-emerald-500 text-white" :
                    step === s.id ? "bg-brand-gold text-brand-dark ring-2 ring-brand-gold/30" :
                    "bg-white/10 text-white/30"
                  }`}>
                    {step > s.id ? <IcoCheck size={13} /> : s.id}
                  </div>
                  <span className={`text-[9px] mt-0.5 uppercase tracking-wider whitespace-nowrap hidden sm:block ${step === s.id ? "text-brand-gold" : "text-white/30"}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all ${step > s.id + 1 ? "bg-emerald-500/60" : step > s.id ? "bg-brand-gold/60" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Step Content ─────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-3xl px-4 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* STEP 1 — Book Viewing */}
            {step === 1 && (
              <StepCard title="Book a Viewing" subtitle="Schedule a time to visit the property before committing.">
                <div className="space-y-5">
                  <div>
                    <label className="label">Preferred Date</label>
                    <input type="date" value={bookDate} min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setBookDate(e.target.value)} className="input-dark" />
                  </div>
                  <div>
                    <label className="label">Preferred Time</label>
                    <div className="flex flex-wrap gap-2">
                      {TIMES.map((t) => (
                        <button key={t} onClick={() => setBookTime(t)}
                          className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${bookTime === t ? "border-brand-gold bg-brand-gold/15 text-brand-gold" : "border-white/10 text-brand-muted hover:text-white"}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Viewing Type</label>
                    <div className="flex gap-3">
                      {["Physical", "Virtual"].map((t) => (
                        <button key={t} onClick={() => setBookType(t)}
                          className={`flex-1 rounded-2xl border py-3 text-sm font-medium transition ${bookType === t ? "border-brand-gold bg-brand-gold/15 text-brand-gold" : "border-white/10 text-brand-muted hover:text-white"}`}>
                          {t === "Physical" ? "🏠 Physical Visit" : "📱 Virtual Tour"}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="label">Contact Phone (optional)</label>
                    <input type="tel" value={bookPhone} onChange={(e) => setBookPhone(e.target.value)}
                      placeholder="+254 700 000 000" className="input-dark" />
                  </div>
                  <div>
                    <label className="label">Any notes for the agent?</label>
                    <textarea rows={3} value={bookNotes} onChange={(e) => setBookNotes(e.target.value)}
                      placeholder="e.g. I'm interested in the 3rd floor unit, available weekends only…"
                      className="input-dark resize-none" />
                  </div>
                  <button onClick={handleBooking} disabled={loading} className="btn-gold w-full justify-center mt-2">
                    {loading ? <IcoLoader size={18} /> : <><IcoCalendar size={16} /> Confirm Booking Request</>}
                  </button>
                </div>
              </StepCard>
            )}

            {/* STEP 2 — Apply */}
            {step === 2 && (
              <StepCard title="Your Viewing is Booked!" subtitle="The property owner has been notified. Ready to proceed with a formal application?">
                <BookingConfirmed booking={booking} />
                <div className="mt-6 glass rounded-2xl p-5 space-y-3">
                  <h4 className="font-display text-base font-semibold text-white">Application Process</h4>
                  {[
                    "Upload your ID and a selfie for verification",
                    "Digitally sign the application form",
                    "Review the property terms and conditions",
                    "Make the required payment to secure the unit",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-brand-muted">
                      <span className="flex h-5 w-5 shrink-0 mt-0.5 items-center justify-center rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold">{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setStep(1)} className="btn-ghost flex-1 justify-center text-sm">← Back</button>
                  <button onClick={handleApply} disabled={loading} className="btn-gold flex-1 justify-center">
                    {loading ? <IcoLoader size={18} /> : <><IcoArrowRight size={16} /> Start Application</>}
                  </button>
                </div>
              </StepCard>
            )}

            {/* STEP 3 — Documents */}
            {step === 3 && (
              <StepCard title="Upload Your Documents" subtitle="We need to verify your identity. All documents are stored securely.">
                <div className="space-y-4">
                  {DOC_TYPES.map((dt) => (
                    <DocUploadSlot key={dt.key} docKey={dt.key} label={dt.label} hint={dt.hint}
                      state={docs[dt.key]} onChange={handleDocUpload} />
                  ))}

                  <div className="rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-4">
                    <div className="text-sm font-medium text-white mb-2">Digital Signature</div>
                    <SignaturePad value={sigPad} onChange={setSigPad} />
                  </div>
                </div>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setStep(2)} className="btn-ghost text-sm py-2.5 px-4">← Back</button>
                  <button onClick={handleSubmitDocs} disabled={loading} className="btn-gold flex-1 justify-center">
                    {loading ? <IcoLoader size={18} /> : <><IcoCheck size={16} /> Submit Documents</>}
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-brand-muted">
                  The property owner will review your documents within 24–48 hours.
                </p>
              </StepCard>
            )}

            {/* STEP 4 — Terms */}
            {step === 4 && (
              <StepCard title="Review & Accept Terms" subtitle="Please read through all terms carefully before accepting.">
                {application?.status === "UnderReview" ? (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-500/15 text-yellow-400">
                      <IcoLoader size={28} className="animate-spin" />
                    </div>
                    <h3 className="font-display text-lg font-semibold text-white">Documents Under Review</h3>
                    <p className="text-brand-muted text-sm">The property owner is reviewing your documents. You'll be notified once approved.</p>
                    <button onClick={async () => {
                      const updated = await applicationApi.getById(application!.id);
                      setApplication(updated);
                      toast("Status refreshed", "info");
                    }} className="btn-ghost text-sm">Refresh Status</button>
                  </div>
                ) : application?.status === "Rejected" ? (
                  <div className="flex flex-col items-center gap-4 py-8 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400"><IcoX size={28} /></div>
                    <h3 className="font-display text-lg font-semibold text-white">Application Not Approved</h3>
                    <p className="text-brand-muted text-sm">{application.rejectionReason ?? "The owner was unable to approve your application at this time."}</p>
                    <Link to="/explore" className="btn-ghost text-sm">Browse Other Listings</Link>
                  </div>
                ) : (
                  <>
                    {terms ? <TermsDisplay terms={terms} /> : (
                      <div className="glass rounded-2xl p-5 text-center text-brand-muted text-sm">
                        No specific terms set for this property. Standard tenancy terms apply.
                      </div>
                    )}
                    <div className="mt-6 flex gap-3">
                      <button onClick={() => setStep(3)} className="btn-ghost text-sm py-2.5 px-4">← Back</button>
                      <button onClick={handleAcceptTerms} disabled={loading} className="btn-gold flex-1 justify-center">
                        {loading ? <IcoLoader size={18} /> : <><IcoCheck size={16} /> I Accept All Terms</>}
                      </button>
                    </div>
                  </>
                )}
              </StepCard>
            )}

            {/* STEP 5 — Payment */}
            {step === 5 && (
              <StepCard title="Complete Payment" subtitle="Secure your tenancy by making the required payment.">
                {!payResult ? (
                  <>
                    {/* Payment summary */}
                    {terms && (
                      <div className="mb-5 glass rounded-2xl p-5 space-y-3">
                        <h4 className="text-sm font-semibold text-white">Payment Summary</h4>
                        {terms.securityDeposit ? (
                          <div className="flex justify-between text-sm"><span className="text-brand-muted">Security Deposit</span><span className="font-semibold text-white">{formatKes(terms.securityDeposit)}</span></div>
                        ) : null}
                        {terms.adminFee ? (
                          <div className="flex justify-between text-sm"><span className="text-brand-muted">Administration Fee</span><span className="font-semibold text-white">{formatKes(terms.adminFee)}</span></div>
                        ) : null}
                        <div className="border-t border-white/10 pt-2 flex justify-between">
                          <span className="font-medium text-white">Total Due</span>
                          <span className="font-bold text-brand-gold">{formatKes((terms.securityDeposit ?? 0) + (terms.adminFee ?? 0))}</span>
                        </div>
                      </div>
                    )}

                    {/* Method select */}
                    <div className="mb-5 flex gap-3">
                      {(["Mpesa", "BankTransfer"] as const).map((m) => (
                        <button key={m} onClick={() => setPayMethod(m)}
                          className={`flex-1 rounded-2xl border py-3 text-sm font-medium transition ${payMethod === m ? "border-brand-gold bg-brand-gold/15 text-brand-gold" : "border-white/10 text-brand-muted hover:text-white"}`}>
                          {m === "Mpesa" ? "📱 M-Pesa" : "🏦 Bank Transfer"}
                        </button>
                      ))}
                    </div>

                    {payMethod === "Mpesa" ? (
                      <div className="space-y-4">
                        <div>
                          <label className="label">M-Pesa Phone Number</label>
                          <input type="tel" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)}
                            placeholder="0700 000 000" className="input-dark" />
                          <p className="text-xs text-brand-muted mt-1">Enter the Safaricom number to receive the STK Push prompt.</p>
                        </div>
                        {terms?.mpesaPaybill && (
                          <div className="glass rounded-xl p-3 text-sm space-y-1">
                            <div className="text-xs text-brand-muted uppercase tracking-wider mb-1">Alternative: Pay via Paybill</div>
                            {terms.mpesaPaybill && <div><span className="text-brand-muted">Paybill:</span> <span className="text-white font-semibold">{terms.mpesaPaybill}</span></div>}
                            {terms.mpesaAccountNumber && <div><span className="text-brand-muted">Account:</span> <span className="text-white font-semibold">{terms.mpesaAccountNumber}</span></div>}
                          </div>
                        )}
                      </div>
                    ) : (
                      <BankTransferInstructions terms={terms} applicationId={application?.id ?? ""} />
                    )}

                    <div className="mt-6 flex gap-3">
                      <button onClick={() => setStep(4)} className="btn-ghost text-sm py-2.5 px-4">← Back</button>
                      {payMethod === "Mpesa" ? (
                        <button onClick={handlePayment} disabled={loading} className="btn-gold flex-1 justify-center">
                          {loading ? <IcoLoader size={18} /> : <><IcoWallet size={16} /> Send STK Push</>}
                        </button>
                      ) : (
                        <button onClick={handleBankTransferDone} className="btn-gold flex-1 justify-center">
                          I've Made the Payment <IcoArrowRight size={16} />
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <StkWaiting payResult={payResult} onPaid={async () => {
                    if (!application) return;
                    const ob = await paymentApi.getOnboarding(application.id).catch(() => null);
                    setOnboarding(ob);
                    setStep(6);
                  }} />
                )}
              </StepCard>
            )}

            {/* STEP 6 — Welcome / Onboarding */}
            {step === 6 && (
              <OnboardingStep listing={listing} onboarding={onboarding} terms={terms} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Sub-components ──────────────────────────────────────────────────────── */

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-3xl p-7 shadow-2xl">
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
    </div>
  );
}

function BookingConfirmed({ booking }: { booking: ViewingBooking | null }) {
  if (!booking) return null;
  return (
    <div className="glass rounded-2xl p-5 flex items-start gap-4">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-400">
        <IcoCheck size={24} />
      </div>
      <div>
        <div className="font-semibold text-white">Viewing Request Sent</div>
        <div className="text-sm text-brand-muted mt-0.5">
          {new Date(booking.preferredDate).toLocaleDateString("en-KE", { weekday: "long", day: "numeric", month: "long" })} at {booking.preferredTime}
          {" · "}{booking.viewingType}
        </div>
        <div className="mt-1 text-xs text-brand-muted">Status: <span className={`font-medium ${booking.status === "Confirmed" ? "text-emerald-400" : "text-yellow-400"}`}>{booking.status}</span></div>
      </div>
    </div>
  );
}

function DocUploadSlot({ docKey, label, hint, state, onChange }: {
  docKey: string; label: string; hint: string;
  state: DocState;
  onChange: (key: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`glass rounded-2xl p-4 border transition ${state.url ? "border-emerald-500/30" : state.error ? "border-red-500/30" : "border-white/10"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{label}</span>
        {state.url && <span className="flex items-center gap-1 text-xs text-emerald-400"><IcoCheck size={12} /> Uploaded</span>}
        {state.error && <span className="text-xs text-red-400">{state.error}</span>}
      </div>
      <p className="text-xs text-brand-muted mb-3">{hint}</p>
      {state.url ? (
        <div className="flex items-center gap-3">
          <img src={state.url} alt="Preview" className="h-12 w-16 object-cover rounded-lg" />
          <button onClick={() => inputRef.current?.click()} className="text-xs text-brand-teallight hover:underline">Replace</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={state.uploading}
          className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-sm text-brand-muted hover:border-brand-gold/40 hover:text-white transition w-full justify-center">
          {state.uploading ? <IcoLoader size={16} className="animate-spin" /> : "📎 Choose File"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(docKey, f); }} />
    </div>
  );
}

function SignaturePad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const src = "touches" in e ? e.touches[0] : e;
    return { x: src.clientX - rect.left, y: src.clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    drawing.current = true;
    const { x, y } = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.beginPath(); ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = getPos(e.nativeEvent as MouseEvent | TouchEvent);
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.strokeStyle = "#c9a227";
    ctx.lineTo(x, y); ctx.stroke();
  }

  function stopDraw() {
    drawing.current = false;
    onChange(canvasRef.current?.toDataURL() ?? "");
  }

  function clear() {
    const ctx = canvasRef.current!.getContext("2d")!;
    ctx.clearRect(0, 0, 400, 120);
    onChange("");
  }

  return (
    <div>
      <canvas ref={canvasRef} width={400} height={120}
        className="w-full rounded-xl bg-white/5 border border-white/15 cursor-crosshair touch-none"
        style={{ maxHeight: 120 }}
        onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw}
        onTouchStart={startDraw} onTouchMove={draw} onTouchEnd={stopDraw}
      />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-brand-muted">Sign above with your mouse or finger</span>
        <button onClick={clear} className="text-xs text-brand-muted hover:text-white">Clear</button>
      </div>
      {value && <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1"><IcoCheck size={11} /> Signature captured</p>}
    </div>
  );
}

function TermsDisplay({ terms }: { terms: PropertyTerms }) {
  return (
    <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
      {terms.termsContent && (
        <div className="glass rounded-xl p-4">
          <h4 className="text-sm font-semibold text-white mb-2">{terms.title}</h4>
          <p className="text-sm text-brand-muted whitespace-pre-line leading-relaxed">{terms.termsContent}</p>
        </div>
      )}
      {terms.houseRules && <TermSection title="House Rules" content={terms.houseRules} />}
      {terms.paymentTerms && <TermSection title="Payment Terms" content={terms.paymentTerms} />}
      {terms.noticePeriod && (
        <div className="flex justify-between text-sm glass rounded-xl px-4 py-3">
          <span className="text-brand-muted">Notice Period</span>
          <span className="text-white font-medium">{terms.noticePeriod}</span>
        </div>
      )}
      {terms.petPolicy && <TermSection title="Pet Policy" content={terms.petPolicy} />}
      {terms.securityDepositTerms && <TermSection title="Security Deposit" content={terms.securityDepositTerms} />}
      {(terms.securityDeposit || terms.adminFee) && (
        <div className="glass rounded-xl p-4 space-y-2">
          <h4 className="text-sm font-semibold text-white mb-1">Fees</h4>
          {terms.securityDeposit && <div className="flex justify-between text-sm"><span className="text-brand-muted">Security Deposit</span><span className="text-white">{formatKes(terms.securityDeposit)}</span></div>}
          {terms.adminFee && <div className="flex justify-between text-sm"><span className="text-brand-muted">Admin Fee</span><span className="text-white">{formatKes(terms.adminFee)}</span></div>}
        </div>
      )}
    </div>
  );
}

function TermSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <h4 className="text-sm font-semibold text-white mb-1">{title}</h4>
      <p className="text-sm text-brand-muted whitespace-pre-line leading-relaxed">{content}</p>
    </div>
  );
}

function BankTransferInstructions({ terms, applicationId }: { terms: PropertyTerms | null; applicationId: string }) {
  return (
    <div className="glass rounded-2xl p-5 space-y-3">
      <h4 className="text-sm font-semibold text-white">Bank Transfer Details</h4>
      {terms?.bankName && <Row label="Bank" value={terms.bankName} />}
      {terms?.bankAccountName && <Row label="Account Name" value={terms.bankAccountName} />}
      {terms?.bankAccountNumber && <Row label="Account No." value={terms.bankAccountNumber} />}
      {terms?.bankBranch && <Row label="Branch" value={terms.bankBranch} />}
      <Row label="Reference" value={`APP-${applicationId.slice(0, 8).toUpperCase()}`} copy />
      {terms?.paymentInstructions && (
        <div className="border-t border-white/10 pt-3 text-sm text-brand-muted">{terms.paymentInstructions}</div>
      )}
      <p className="text-xs text-yellow-400 pt-1">After payment, click "I've Made the Payment" and the owner will confirm it.</p>
    </div>
  );
}

function Row({ label, value, copy }: { label: string; value: string; copy?: boolean }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-brand-muted">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-white">{value}</span>
        {copy && (
          <button onClick={() => navigator.clipboard.writeText(value)} className="text-[10px] text-brand-teallight hover:underline">Copy</button>
        )}
      </div>
    </div>
  );
}

function StkWaiting({ payResult, onPaid }: { payResult: PaymentInitiateResult; onPaid: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 py-6 text-center">
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="flex h-20 w-20 items-center justify-center rounded-full bg-brand-gold/15"
      >
        <IcoPhone size={34} className="text-brand-gold" />
      </motion.div>
      <div>
        <h3 className="font-display text-xl font-bold text-white">Check Your Phone</h3>
        <p className="mt-2 text-sm text-brand-muted">
          An M-Pesa STK Push has been sent to <span className="text-white">{payResult.phoneNumber}</span>.
          Enter your PIN to complete the payment.
        </p>
      </div>
      <div className="glass rounded-2xl p-4 w-full text-left space-y-1.5 text-sm">
        <div className="flex justify-between"><span className="text-brand-muted">Amount</span><span className="font-bold text-brand-gold">{payResult.currency} {payResult.amount?.toLocaleString()}</span></div>
        <div className="flex justify-between"><span className="text-brand-muted">Checkout ID</span><span className="text-white/60 text-xs">{payResult.mpesaCheckoutRequestId}</span></div>
      </div>
      <button onClick={onPaid} className="btn-ghost text-sm">I've already paid — Continue</button>
    </div>
  );
}

function OnboardingStep({ listing, onboarding, terms }: {
  listing: Listing;
  onboarding: Record<string, unknown> | null;
  terms: PropertyTerms | null;
}) {
  const navigate = useNavigate();
  return (
    <div className="glass-strong rounded-3xl p-8 text-center shadow-2xl">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-brand-gold/15">
        <span className="text-5xl">🏠</span>
      </motion.div>
      <h2 className="font-display text-3xl font-bold text-white">Congratulations!</h2>
      <p className="mt-2 text-brand-muted">
        {(onboarding?.message as string) ?? "Your tenancy has been confirmed. Welcome to your new home!"}
      </p>

      <div className="mt-7 space-y-4 text-left">
        {(onboarding?.onboardingInstructions ?? terms?.onboardingInstructions) && (
          <InfoBlock icon="📋" title="Move-in Steps" content={String(onboarding?.onboardingInstructions ?? terms?.onboardingInstructions)} />
        )}
        {(onboarding?.accessInstructions ?? terms?.accessInstructions) && (
          <InfoBlock icon="🔑" title="How to Access the Premises" content={String(onboarding?.accessInstructions ?? terms?.accessInstructions)} />
        )}
        {(onboarding?.itemsToCarry ?? terms?.itemsToCarry) && (
          <InfoBlock icon="🎒" title="What to Bring on Day 1" content={String(onboarding?.itemsToCarry ?? terms?.itemsToCarry)} />
        )}
        {onboarding?.payment != null && (
          <div className="glass rounded-2xl p-4 text-sm space-y-1.5">
            <div className="text-xs uppercase tracking-wider text-brand-muted mb-1">Payment Confirmed</div>
            {(() => {
              const pmt = onboarding.payment as Record<string, unknown>;
              return (<>
                {pmt.mpesaReceiptNumber ? <Row label="M-Pesa Receipt" value={String(pmt.mpesaReceiptNumber)} /> : null}
                {pmt.reference ? <Row label="Reference" value={String(pmt.reference)} /> : null}
              </>);
            })()}
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button onClick={() => navigate("/dashboard")} className="btn-gold w-full justify-center">
          Go to My Properties <IcoArrowRight size={16} />
        </button>
        <Link to={`/listing/${listing.id}`} className="btn-ghost w-full justify-center text-sm">
          View Listing Details
        </Link>
      </div>
    </div>
  );
}

function InfoBlock({ icon, title, content }: { icon: string; title: string; content: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <h4 className="font-semibold text-white text-sm">{title}</h4>
      </div>
      <p className="text-sm text-brand-muted whitespace-pre-line leading-relaxed">{content}</p>
    </div>
  );
}
