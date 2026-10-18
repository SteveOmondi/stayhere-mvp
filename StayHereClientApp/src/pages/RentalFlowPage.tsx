import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  listingsApi, bookingApi, applicationApi, termsApi, paymentApi, authApi,
  uploadDocumentToR2,
  type Listing, type ViewingBooking, type TenantApplication, type PropertyTerms, type PaymentInitiateResult,
} from "../lib/api";
import { useApp } from "../context/AppContext";
import { loginUrlWithRedirect } from "../lib/authRedirect";
import { listingTitle, listingLocation, formatKes, primaryImage } from "../lib/format";
import { GradientBlobs } from "../components/ui";
import { DocUploadSlot, type DocState } from "../components/DocUploadSlot";
import { PhoneInput, isPhoneComplete } from "../components/PhoneInput";
import {
  IcoArrowRight, IcoCalendar, IcoCheck,
  IcoKey, IcoLoader, IcoLocation, IcoPhone, IcoSparkle,
  IcoUser, IcoWallet, IcoX, IcoEye, IcoShare,
} from "../components/icons";

/* ── Step definitions ─────────────────────────────────────────────────────
 * Booking a viewing is a separate, optional action now (see the toggle inside Step 1) - it's no
 * longer a numbered step you have to pass through before applying. */
const STEPS = [
  { id: 1, label: "Apply",         icon: <IcoUser size={18} /> },
  { id: 2, label: "Documents",     icon: <IcoShare size={18} /> },
  { id: 3, label: "Terms",         icon: <IcoKey size={18} /> },
  { id: 4, label: "Payment",       icon: <IcoWallet size={18} /> },
  { id: 5, label: "Welcome!",      icon: <IcoSparkle size={18} /> },
];

const TIMES = ["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00"];
const DOC_TYPES = [
  { key: "IdFront",   label: "ID / Passport — Front",  hint: "Clear photo of the front of your National ID or Passport" },
  { key: "IdBack",    label: "ID / Passport — Back",   hint: "Clear photo of the back of your National ID" },
  { key: "Selfie",    label: "Selfie",                 hint: "A clear selfie of your face" },
];


/** Everything entered before an application exists server-side - lost on remount today (e.g. the
 * redirect-to-login-and-back round trip, or an accidental refresh) since it only ever lived in
 * component state. Persisted to sessionStorage (not localStorage - this is a draft for the
 * current visit, not something that should resurface weeks later) keyed per-listing so starting
 * the flow for a different listing never shows another listing's half-finished draft. Only the
 * document `url`s are kept, never the `File` objects themselves (those aren't serializable, and
 * once uploaded the url is all handleSubmitDocs actually needs). */
type RentalFlowDraft = {
  pathChoice: "viewing" | "apply" | null;
  bookDate: string; bookTime: string; bookType: string; bookNotes: string; bookPhone: string;
  docUrls: Record<string, string>;
  sigPad: string;
  payMethod: "Mpesa" | "BankTransfer";
  mpesaPhone: string;
};

function draftKey(listingId: string) { return `sh_rental_flow_draft_${listingId}`; }

function loadDraft(listingId: string): RentalFlowDraft | null {
  try {
    const raw = sessionStorage.getItem(draftKey(listingId));
    return raw ? (JSON.parse(raw) as RentalFlowDraft) : null;
  } catch { return null; }
}

function clearDraft(listingId: string) {
  try { sessionStorage.removeItem(draftKey(listingId)); } catch { /* ignore */ }
}

/** Converts a canvas `toDataURL()` output (`data:image/png;base64,...`) into a real `File`, so the
 * signature can go through the same R2 upload path as every other document instead of being sent
 * to the API as a multi-KB inline string. */
function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/png";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new File([bytes], filename, { type: mime });
}

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

  // Step 1 — the customer explicitly chooses their own path: book a viewing first, or apply
  // directly. Neither is the "default" - both are first-class, equally-weighted options, EXCEPT
  // when arriving via a direct shortcut link (?path=apply|viewing - see the listing page's "Start
  // Tenancy Application" button) that already states the user's intent, in which case skip
  // straight past the choice screen instead of asking a question they already answered.
  const pathHint = params.get("path");
  const [pathChoice, setPathChoice] = useState<"viewing" | "apply" | null>(
    pathHint === "viewing" || pathHint === "apply" ? pathHint : null
  );
  const [bookDate, setBookDate] = useState("");
  const [bookTime, setBookTime] = useState("10:00");
  const [bookType, setBookType] = useState("Physical");
  const [bookNotes, setBookNotes] = useState("");
  const [bookPhone, setBookPhone] = useState("");

  // Step 3 — Documents
  const [docs, setDocs] = useState<Record<string, DocState>>({
    IdFront: { uploading: false }, IdBack: { uploading: false }, Selfie: { uploading: false },
  });
  const [sigPad, setSigPad] = useState<string>(""); // Data URL from canvas - preview only, never sent to the API
  // The actual R2 public URL for the uploaded signature image - this is what ever gets persisted
  // server-side. `digital_signature_url` (and application_documents.file_url) are both
  // varchar(500) columns; a canvas toDataURL() PNG is routinely tens of KB of base64 text, which
  // blows past that limit and fails with a DbUpdateException. Uploading it like every other
  // document (same presigned-URL flow as the ID/selfie photos) keeps what's stored a short URL.
  const [sigPadUrl, setSigPadUrl] = useState<string>("");

  // Step 5 — Payment
  const [payMethod, setPayMethod] = useState<"Mpesa" | "BankTransfer">("Mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;

  /* Redirect if not authenticated - RequireAuth in App.tsx normally catches this before the page
   * even mounts, but this stays as a safety net for the case where a token expires mid-flow.
   * Save whatever's been entered so far BEFORE navigating away, so it's there to restore once
   * the user signs in and lands back on this exact page. */
  useEffect(() => {
    if (!isAuthenticated) {
      if (listingId) {
        sessionStorage.setItem(draftKey(listingId), JSON.stringify({
          pathChoice, bookDate, bookTime, bookType, bookNotes, bookPhone,
          docUrls: Object.fromEntries(Object.entries(docs).map(([k, d]) => [k, d.url ?? ""]).filter(([, u]) => u)),
          sigPad, payMethod, mpesaPhone,
        } satisfies RentalFlowDraft));
      }
      navigate(loginUrlWithRedirect(`/rental-flow?listingId=${listingId}`), { replace: true });
    }
  }, [isAuthenticated]);

  /* Restore a draft left behind by the effect above (or by an accidental refresh) - runs once
   * per listing, and only before anything has actually been chosen yet so it never clobbers a
   * fresh in-progress session with a stale one. */
  useEffect(() => {
    if (!listingId || pathChoice !== null) return;
    const draft = loadDraft(listingId);
    if (!draft) return;
    setPathChoice(draft.pathChoice);
    setBookDate(draft.bookDate); setBookTime(draft.bookTime); setBookType(draft.bookType);
    setBookNotes(draft.bookNotes); setBookPhone(draft.bookPhone);
    setDocs((d) => {
      const next = { ...d };
      for (const [key, url] of Object.entries(draft.docUrls)) {
        if (url) next[key] = { ...next[key], url, uploading: false };
      }
      return next;
    });
    setSigPad(draft.sigPad);
    setPayMethod(draft.payMethod);
    setMpesaPhone(draft.mpesaPhone);
  }, [listingId]);

  /* Load listing + terms */
  useEffect(() => {
    if (!listingId) return;
    listingsApi.getById(listingId).then(setListing).catch(() => toast("Listing not found", "error"));
    termsApi.getByListing(listingId).then(setTerms).catch(() => {});
  }, [listingId]);

  /* Prefill the optional contact-phone field from whoever's signed in - still fully editable, and
   * never overwrites a value the draft-restore effect above already set. `customerProfile` is NOT
   * a reliable source (nothing in the app ever populates it) - this is the one endpoint any
   * signed-in user can call for their own phone, keyed correctly by the JWT user id. */
  useEffect(() => {
    if (!authUser?.id) return;
    authApi.getProfiles(authUser.id).then((profiles) => {
      const phone = profiles[0]?.phone;
      if (phone) { setBookPhone((p) => p || phone); setMpesaPhone((p) => p || phone); }
    }).catch(() => {});
  }, [authUser]);

  /* Resume mid-flow — e.g. a link from Sage ("continue to payment") for an application the user
   * already started. Without this the page always restarts at Step 1 regardless of real progress. */
  const resumeApplicationId = params.get("applicationId");
  useEffect(() => {
    if (!resumeApplicationId) return;
    applicationApi.getById(resumeApplicationId).then((app) => {
      setApplication(app);
      const stepForStatus: Record<string, number> = {
        PendingApproval: 2,
        DocumentsPending: 2,
        UnderReview: 3,
        Approved: 3,
        TermsAccepted: 4,
        PaymentPending: 4,
        Active: 5,
      };
      setStep(stepForStatus[app.status] ?? 1);
      if (app.status === "Active") {
        paymentApi.getOnboarding(app.id).then(setOnboarding).catch(() => {});
      }
    }).catch(() => toast("Could not load your application.", "error"));
  }, [resumeApplicationId]);

  useEffect(() => () => { if (pollInterval) clearInterval(pollInterval); }, [pollInterval]);

  /* ── Optional: book a viewing (separate from applying - doesn't advance the step) ────── */
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
      toast("Viewing request sent!", "success");
    } catch { toast("Could not book viewing. Please try again.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 1: Start application (the entry point - viewing is optional, see above) ────── */
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
      setStep(2);
      clearDraft(listingId);
    } catch { toast("Could not start application. Please try again.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 3: Upload documents ─────────────────────────────────────────── */
  async function handleDocUpload(docType: string, file: File) {
    setDocs((d) => ({ ...d, [docType]: { uploading: true } }));
    try {
      const publicUrl = await uploadDocumentToR2(file, "applications/documents");
      setDocs((d) => ({ ...d, [docType]: { file, url: publicUrl, uploading: false } }));
    } catch {
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
      // Save digital signature if drawn - upload the canvas PNG to R2 first (see sigPadUrl above)
      // rather than ever sending the raw data: URL to the API.
      if (sigPad) {
        const signatureFile = dataUrlToFile(sigPad, "signature.png");
        const signaturePublicUrl = await uploadDocumentToR2(signatureFile, "applications/documents");
        setSigPadUrl(signaturePublicUrl);
        await applicationApi.addDocument(application.id, {
          documentType: "DigitalSignature", fileUrl: signaturePublicUrl, fileName: "signature.png",
        });
      }
      const updated = await applicationApi.submit(application.id);
      setApplication(updated);
      setStep(3);
    } catch { toast("Could not submit documents.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 3: Accept terms ─────────────────────────────────────────────── */
  async function handleAcceptTerms() {
    if (!application) return;
    setLoading(true);
    try {
      // sigPadUrl is the R2 public URL uploaded back in handleSubmitDocs - never send the raw
      // canvas data: URL here either (digital_signature_url is also a varchar(500) column).
      const updated = await applicationApi.acceptTerms(application.id, sigPadUrl || undefined);
      setApplication(updated);
      setStep(4);
    } catch { toast("Could not record acceptance.", "error"); }
    finally { setLoading(false); }
  }

  /* ── Step 4: Payment ──────────────────────────────────────────────────── */
  async function handlePayment() {
    if (!application) return;
    if (payMethod === "Mpesa" && !isPhoneComplete(mpesaPhone)) { toast("Enter a valid M-Pesa phone number", "error"); return; }
    setLoading(true);
    try {
      const totalAmount = (terms?.securityDeposit ?? 0) + (terms?.adminFee ?? 0);
      const result = await paymentApi.initiate(application.id, {
        phoneNumber: mpesaPhone,
        paymentType: "SecurityDeposit",
        amount: totalAmount,
      });
      setPayResult(result);

      if (payMethod === "Mpesa" && result.checkoutRequestId) {
        const checkoutId = result.checkoutRequestId;
        // Poll for confirmation
        const iv = setInterval(async () => {
          // Actively ask Safaricom via queryStkStatus (not just re-read our own DB row) - the
          // STK callback is not reliable enough to be the only way this ever flips to Confirmed.
          await paymentApi.queryStkStatus(checkoutId).catch(() => null);
          const statuses = await paymentApi.getStatus(application.id).catch(() => []);
          const confirmed = statuses.find((p) => p.status === "Confirmed");
          if (confirmed) {
            clearInterval(iv);
            setPollInterval(null);
            const ob = await paymentApi.getOnboarding(application.id).catch(() => null);
            setOnboarding(ob);
            setStep(5);
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
    setStep(5);
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
            {/* STEP 1a — the choice: book a viewing first, or apply directly. Equal weight, no default. */}
            {step === 1 && pathChoice === null && (
              <div>
                <div className="text-center mb-7">
                  <h2 className="font-display text-2xl sm:text-3xl font-bold text-white">How would you like to start?</h2>
                  <p className="mt-2 text-sm text-brand-muted">Both paths lead to the same tenancy — pick whichever feels right for you.</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-5">
                  <PathCard
                    accent="teal"
                    icon={<IcoEye size={26} />}
                    title="Book a Viewing First"
                    tagline="See it before you commit"
                    bullets={[
                      "Visit in person or take a virtual tour",
                      "Ask the agent questions on the spot",
                      "No commitment — apply whenever you're ready",
                    ]}
                    ctaLabel="Schedule a Viewing"
                    onClick={() => setPathChoice("viewing")}
                  />
                  <PathCard
                    accent="gold"
                    icon={<IcoKey size={26} />}
                    title="Apply for Tenancy"
                    tagline="Ready to move forward"
                    bullets={[
                      "Skip straight to the paperwork",
                      "Fastest path to securing the unit",
                      "You can still book a viewing afterward",
                    ]}
                    ctaLabel="Start My Application"
                    onClick={() => setPathChoice("apply")}
                  />
                </div>
              </div>
            )}

            {/* STEP 1b — chose to book a viewing */}
            {step === 1 && pathChoice === "viewing" && (
              <StepCard title="Book a Viewing" subtitle="Pick a time that works for you — this doesn't commit you to anything.">
                <button onClick={() => setPathChoice(null)} className="text-xs text-brand-muted hover:text-white flex items-center gap-1 mb-5 -mt-1">
                  <IcoArrowRight size={11} className="rotate-180" /> Choose a different path
                </button>

                {booking ? (
                  <div className="space-y-5">
                    <BookingConfirmed booking={booking} />
                    <div className="glass rounded-2xl p-5 text-center space-y-3">
                      <p className="text-sm text-brand-muted">Ready to secure the unit already? You don't have to wait for the viewing.</p>
                      <button onClick={handleApply} disabled={loading} className="btn-gold w-full justify-center">
                        {loading ? <IcoLoader size={18} /> : <><IcoArrowRight size={16} /> Apply for Tenancy Now</>}
                      </button>
                      <Link to={`/listing/${listingId}`} className="block text-xs text-brand-muted hover:text-white">Maybe later — back to listing</Link>
                    </div>
                  </div>
                ) : (
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
                      <PhoneInput value={bookPhone} onChange={setBookPhone} />
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
                )}
              </StepCard>
            )}

            {/* STEP 1c — chose to apply directly */}
            {step === 1 && pathChoice === "apply" && (
              <StepCard title="Apply for Tenancy" subtitle="Here's what to expect once you start.">
                <button onClick={() => setPathChoice(null)} className="text-xs text-brand-muted hover:text-white flex items-center gap-1 mb-5 -mt-1">
                  <IcoArrowRight size={11} className="rotate-180" /> Choose a different path
                </button>

                <div className="glass rounded-2xl p-5 space-y-3">
                  <h4 className="font-display text-base font-semibold text-white">What happens next</h4>
                  {[
                    "The property owner does a quick initial review of your application",
                    "Once approved, upload your ID and a selfie for verification",
                    "Digitally sign the application form",
                    "Review the property terms and make the required payment to secure the unit",
                  ].map((s, i) => (
                    <div key={i} className="flex items-start gap-3 text-sm text-brand-muted">
                      <span className="flex h-5 w-5 shrink-0 mt-0.5 items-center justify-center rounded-full bg-brand-gold/20 text-brand-gold text-[10px] font-bold">{i + 1}</span>
                      {s}
                    </div>
                  ))}
                </div>

                <button onClick={handleApply} disabled={loading} className="btn-gold w-full justify-center mt-5">
                  {loading ? <IcoLoader size={18} /> : <><IcoArrowRight size={16} /> Start Application</>}
                </button>
                <p className="mt-3 text-center text-xs text-brand-muted">Prefer to see it first? Go back and choose "Book a Viewing" instead — you can always apply right after.</p>
              </StepCard>
            )}

            {/* STEP 2 — Pending approval, then Documents (once the owner pre-screens the applicant) */}
            {step === 2 && application?.status === "PendingApproval" && (
              <StepCard title="Application Submitted" subtitle="The property owner reviews new applicants before documents are requested.">
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/15 text-purple-400">
                    <IcoLoader size={28} className="animate-spin" />
                  </div>
                  <h3 className="font-display text-lg font-semibold text-white">Pending Owner Approval</h3>
                  <p className="text-brand-muted text-sm">We'll let you know as soon as the owner approves your application so you can upload your documents.</p>
                  <button onClick={async () => {
                    const updated = await applicationApi.getById(application!.id);
                    setApplication(updated);
                    toast("Status refreshed", "info");
                  }} className="btn-ghost text-sm">Refresh Status</button>
                </div>
              </StepCard>
            )}

            {step === 2 && application?.status === "Rejected" && (
              <StepCard title="Application Not Approved" subtitle="">
                <div className="flex flex-col items-center gap-4 py-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-400"><IcoX size={28} /></div>
                  <p className="text-brand-muted text-sm">{application.rejectionReason ?? "The owner was unable to approve your application at this time."}</p>
                  <Link to="/explore" className="btn-ghost text-sm">Browse Other Listings</Link>
                </div>
              </StepCard>
            )}

            {step === 2 && application && !["PendingApproval", "Rejected"].includes(application.status) && (
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
                  <button onClick={handleSubmitDocs} disabled={loading} className="btn-gold flex-1 justify-center">
                    {loading ? <IcoLoader size={18} /> : <><IcoCheck size={16} /> Submit Documents</>}
                  </button>
                </div>
                <p className="mt-3 text-center text-xs text-brand-muted">
                  The property owner will review your documents within 24–48 hours.
                </p>
              </StepCard>
            )}

            {/* STEP 3 — Terms */}
            {step === 3 && (
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
                      <button onClick={handleAcceptTerms} disabled={loading} className="btn-gold flex-1 justify-center">
                        {loading ? <IcoLoader size={18} /> : <><IcoCheck size={16} /> I Accept All Terms</>}
                      </button>
                    </div>
                  </>
                )}
              </StepCard>
            )}

            {/* STEP 4 — Payment */}
            {step === 4 && (
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
                          <PhoneInput value={mpesaPhone} onChange={setMpesaPhone} />
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
                  <StkWaiting payResult={payResult} onCheck={async () => {
                    if (!application) return false;
                    // Ask Safaricom directly via queryStkStatus first - it self-heals the
                    // application/payment status if the STK callback never arrived.
                    if (payResult.checkoutRequestId) {
                      await paymentApi.queryStkStatus(payResult.checkoutRequestId).catch(() => null);
                    }
                    // Re-fetch the application itself rather than trusting the STK response alone -
                    // the callback only promotes it to Active once Safaricom actually confirms the
                    // payment, so this is the real check, not an optimistic "assume it worked".
                    const updated = await applicationApi.getById(application.id).catch(() => null);
                    if (updated?.status !== "Active") return false;
                    setApplication(updated);
                    const ob = await paymentApi.getOnboarding(application.id).catch(() => null);
                    setOnboarding(ob);
                    setStep(5);
                    return true;
                  }} />
                )}
              </StepCard>
            )}

            {/* STEP 5 — Welcome / Onboarding */}
            {step === 5 && (
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

function PathCard({ accent, icon, title, tagline, bullets, ctaLabel, onClick }: {
  accent: "teal" | "gold";
  icon: React.ReactNode;
  title: string;
  tagline: string;
  bullets: string[];
  ctaLabel: string;
  onClick: () => void;
}) {
  const theme = accent === "teal"
    ? { glow: "hover:shadow-[0_0_0_1px_rgba(45,212,191,0.4),0_20px_40px_-15px_rgba(45,212,191,0.35)]", iconBg: "bg-brand-teal/15 text-brand-teallight", ring: "group-hover:border-brand-teal/40", btn: "border border-brand-teal/40 text-brand-teallight hover:bg-brand-teal/10" }
    : { glow: "hover:shadow-[0_0_0_1px_rgba(201,162,39,0.45),0_20px_40px_-15px_rgba(201,162,39,0.4)]", iconBg: "bg-brand-gold/15 text-brand-gold", ring: "group-hover:border-brand-gold/40", btn: "btn-gold justify-center" };

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      className={`group text-left glass-strong rounded-3xl p-6 border border-white/10 transition-shadow duration-300 ${theme.glow} ${theme.ring}`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${theme.iconBg}`}>{icon}</div>
      <h3 className="mt-4 font-display text-xl font-bold text-white">{title}</h3>
      <p className="text-xs uppercase tracking-wider text-brand-muted mt-1">{tagline}</p>
      <div className="mt-4 space-y-2">
        {bullets.map((b, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-brand-muted">
            <IcoCheck size={14} className="shrink-0 mt-0.5 text-emerald-400" />
            {b}
          </div>
        ))}
      </div>
      <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold w-full ${theme.btn}`}>
        {ctaLabel} <IcoArrowRight size={14} />
      </div>
    </motion.button>
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
    // Mouse only - touch scrolling during a signature stroke is already blocked by the canvas's
    // own `touch-none` CSS (touch-action: none), and React registers touchmove listeners as
    // passive by default, so calling preventDefault() on the touch path does nothing except log
    // "Unable to preventDefault inside passive event listener invocation" on every single move.
    if (!("touches" in e)) e.preventDefault();
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

function StkWaiting({ payResult, onCheck }: { payResult: PaymentInitiateResult; onCheck: () => Promise<boolean> }) {
  const [checking, setChecking] = useState(false);
  const [notYetConfirmed, setNotYetConfirmed] = useState(false);

  async function handleClick() {
    setChecking(true);
    setNotYetConfirmed(false);
    try {
      const confirmed = await onCheck();
      if (!confirmed) setNotYetConfirmed(true);
    } finally {
      setChecking(false);
    }
  }

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
        <div className="flex justify-between"><span className="text-brand-muted">Checkout ID</span><span className="text-white/60 text-xs">{payResult.checkoutRequestId}</span></div>
      </div>
      {notYetConfirmed && (
        <p className="text-xs text-amber-400">
          We haven't received your payment confirmation yet. If you've already entered your PIN, please wait a few seconds and try again.
        </p>
      )}
      <button onClick={handleClick} disabled={checking} className="btn-ghost text-sm">
        {checking ? <IcoLoader size={14} className="animate-spin" /> : "I've already paid — Check Status"}
      </button>
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
