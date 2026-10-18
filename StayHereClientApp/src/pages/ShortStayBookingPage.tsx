import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  listingsApi, termsApi, shortStayApi, paymentApi, authApi, uploadDocumentToR2,
  type Listing, type PropertyTerms, type ShortStayBooking, type PaymentInitiateResult, ApiError,
} from "../lib/api";
import { useApp } from "../context/AppContext";
import { loginUrlWithRedirect } from "../lib/authRedirect";
import { listingTitle, listingLocation, formatKes, primaryImage } from "../lib/format";
import { GradientBlobs } from "../components/ui";
import { AvailabilityCalendar } from "../components/AvailabilityCalendar";
import { DocUploadSlot, type DocState } from "../components/DocUploadSlot";
import { PhoneInput, isPhoneComplete } from "../components/PhoneInput";
import {
  IcoArrowRight, IcoCalendar, IcoCheck, IcoKey, IcoLoader, IcoLocation,
  IcoPhone, IcoUser, IcoWallet, IcoX,
} from "../components/icons";

const STEPS = [
  { id: 1, label: "Dates",   icon: <IcoCalendar size={16} /> },
  { id: 2, label: "Details", icon: <IcoUser size={16} /> },
  { id: 3, label: "Payment", icon: <IcoWallet size={16} /> },
  { id: 4, label: "Verify",  icon: <IcoKey size={16} /> },
];

const DOC_TYPES = [
  { key: "IdFront", label: "ID / Passport — Front", hint: "Clear photo of the front of your National ID or Passport" },
  { key: "IdBack",  label: "ID / Passport — Back",  hint: "Clear photo of the back of your National ID" },
  { key: "Selfie",  label: "Selfie",                hint: "A clear selfie of your face" },
];

function nightsBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / (24 * 60 * 60 * 1000));
}

export function ShortStayBookingPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { authUser, customerProfile, isAuthenticated, toast } = useApp();
  const listingId = params.get("listingId") ?? "";
  const resumeBookingId = params.get("bookingId");

  const [listing, setListing] = useState<Listing | null>(null);
  const [terms, setTerms] = useState<PropertyTerms | null>(null);
  const [blockedRanges, setBlockedRanges] = useState<{ checkInDate: string; checkOutDate: string }[]>([]);
  const [booking, setBooking] = useState<ShortStayBooking | null>(null);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — dates & guests
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [numberOfGuests, setNumberOfGuests] = useState(1);

  // Step 2 — minimal guest details (prefilled once we know who's signed in)
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  // Step 3 — payment
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [payResult, setPayResult] = useState<PaymentInitiateResult | null>(null);
  const [pollInterval, setPollInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  // Step 4 — ID verification (only reachable once payment is confirmed)
  const [docs, setDocs] = useState<Record<string, DocState>>({
    IdFront: { uploading: false }, IdBack: { uploading: false }, Selfie: { uploading: false },
  });

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate(loginUrlWithRedirect(`/book-stay?listingId=${listingId}`), { replace: true });
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!listingId) return;
    listingsApi.getById(listingId).then(setListing).catch(() => toast("Listing not found", "error"));
    termsApi.getByListing(listingId).then(setTerms).catch(() => {});
    shortStayApi.getAvailability(listingId).then((r) => setBlockedRanges(r.blockedRanges)).catch(() => {});
  }, [listingId]);

  // Prefill guest details once, from whoever's signed in - still fully editable. `customerProfile`
  // is NOT a reliable source here (nothing in the app ever populates it - it stays null forever),
  // so this fetches the one endpoint any signed-in user can call for their own name/phone.
  useEffect(() => {
    if (authUser?.email) setGuestEmail((e) => e || authUser.email!);
    if (!authUser?.id) return;
    authApi.getProfiles(authUser.id).then((profiles) => {
      const mine = profiles[0];
      if (!mine) return;
      if (mine.displayName) setGuestName((n) => n || mine.displayName);
      if (mine.phone) setGuestPhone((p) => p || mine.phone!);
    }).catch(() => {});
  }, [authUser]);

  // Resume an in-progress booking (e.g. after the login redirect round-trip, or returning later
  // to finish ID verification) - the booking's own status is the single source of truth for which
  // step to land on, never anything stashed client-side.
  useEffect(() => {
    if (!resumeBookingId) return;
    shortStayApi.getById(resumeBookingId).then((b) => {
      setBooking(b);
      setCheckIn(b.checkInDate); setCheckOut(b.checkOutDate); setNumberOfGuests(b.numberOfGuests);
      setGuestName(b.guestName); setGuestPhone(b.guestPhone); setGuestEmail(b.guestEmail);
      setSpecialRequests(b.specialRequests ?? "");
      if (b.status === "PendingPayment") setStep(3);
      else if (b.status === "Confirmed") setStep(4);
    }).catch(() => toast("Could not load your booking.", "error"));
  }, [resumeBookingId]);

  useEffect(() => () => { if (pollInterval) clearInterval(pollInterval); }, [pollInterval]);

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const nightlyRate = listing?.price ?? listing?.rentPrice ?? 0;
  const subtotal = nights * nightlyRate;
  const bookingFee = booking?.bookingFeeAmount ?? Math.round((nightlyRate / 2) * 100) / 100;

  function handleContinueFromDates() {
    if (!checkIn || !checkOut) { toast("Please select your check-in and check-out dates", "error"); return; }
    if (numberOfGuests < 1) { toast("At least 1 guest is required", "error"); return; }
    setStep(2);
  }

  async function handleSubmitDetails() {
    if (!customerId || !checkIn || !checkOut) return;
    if (!guestName.trim() || !guestEmail.trim()) {
      toast("Name and email are required", "error"); return;
    }
    if (!isPhoneComplete(guestPhone)) {
      toast("Enter a valid phone number", "error"); return;
    }
    setLoading(true);
    try {
      const created = await shortStayApi.create({
        listingId, customerId, checkInDate: checkIn, checkOutDate: checkOut,
        guestName: guestName.trim(), guestPhone: guestPhone.trim(), guestEmail: guestEmail.trim(),
        numberOfGuests, specialRequests: specialRequests.trim() || undefined,
      });
      setBooking(created);
      setMpesaPhone((p) => p || guestPhone);
      setStep(3);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast("Those dates were just taken - please pick different dates.", "error");
        const r = await shortStayApi.getAvailability(listingId).catch(() => null);
        if (r) setBlockedRanges(r.blockedRanges);
        setCheckIn(null); setCheckOut(null);
        setStep(1);
      } else {
        toast("Could not create your booking. Please try again.", "error");
      }
    } finally { setLoading(false); }
  }

  async function handlePayment() {
    if (!booking) return;
    if (!isPhoneComplete(mpesaPhone)) { toast("Enter a valid M-Pesa phone number", "error"); return; }
    setLoading(true);
    try {
      const result = await paymentApi.initiateForBooking(booking.id, { phoneNumber: mpesaPhone });
      setPayResult(result);
      if (result.checkoutRequestId) {
        const checkoutId = result.checkoutRequestId;
        const iv = setInterval(async () => {
          // Actively ask Safaricom via queryStkStatus (not just re-read our own DB row) - the
          // STK callback is not reliable enough to be the only way this ever flips to Confirmed.
          await paymentApi.queryStkStatus(checkoutId).catch(() => null);
          const updated = await shortStayApi.getById(booking.id).catch(() => null);
          if (updated?.status === "Confirmed") {
            clearInterval(iv);
            setPollInterval(null);
            setBooking(updated);
            setPayResult(null);
            setStep(4);
          }
        }, 4000);
        setPollInterval(iv);
      }
    } catch { toast("Payment initiation failed. Please try again.", "error"); }
    finally { setLoading(false); }
  }

  async function handleDocUpload(docType: string, file: File) {
    setDocs((d) => ({ ...d, [docType]: { uploading: true } }));
    try {
      const publicUrl = await uploadDocumentToR2(file, "short-stay-bookings/documents");
      setDocs((d) => ({ ...d, [docType]: { file, url: publicUrl, uploading: false } }));
    } catch {
      setDocs((d) => ({ ...d, [docType]: { uploading: false, error: "Upload failed" } }));
      toast("Document upload failed", "error");
    }
  }

  async function handleSubmitDocuments() {
    if (!booking) return;
    const missing = DOC_TYPES.filter((t) => !docs[t.key]?.url);
    if (missing.length) { toast(`Please upload: ${missing.map((m) => m.label).join(", ")}`, "error"); return; }
    setLoading(true);
    try {
      for (const dt of DOC_TYPES) {
        const d = docs[dt.key];
        if (d?.url) await shortStayApi.addDocument(booking.id, { documentType: dt.key, fileUrl: d.url, fileName: d.file?.name });
      }
      const updated = await shortStayApi.getById(booking.id);
      setBooking(updated);
      toast("Verification submitted!", "success");
    } catch { toast("Could not submit your documents.", "error"); }
    finally { setLoading(false); }
  }

  if (!listing) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <IcoLoader size={32} className="text-brand-gold animate-spin" />
      </div>
    );
  }

  const isDone = booking?.status === "Confirmed" && !!booking.documentsSubmittedAt;

  return (
    <div className="min-h-screen pb-20 gradient-hero relative overflow-hidden">
      <GradientBlobs />

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
                  <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all ${step > s.id ? "bg-emerald-500/60" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* STEP 1 — Dates & Guests */}
            {step === 1 && (
              <StepCard title="Pick Your Dates" subtitle="Booked nights are shown unavailable - pick a check-in and check-out.">
                <AvailabilityCalendar
                  checkIn={checkIn} checkOut={checkOut} blockedRanges={blockedRanges}
                  onChange={(next) => { setCheckIn(next.checkIn); setCheckOut(next.checkOut); }}
                />

                <div className="mt-5">
                  <label className="label">Number of Guests</label>
                  <div className="flex items-center gap-3">
                    <button onClick={() => setNumberOfGuests((n) => Math.max(1, n - 1))} className="btn-ghost h-9 w-9 justify-center p-0">−</button>
                    <span className="w-8 text-center text-white font-semibold">{numberOfGuests}</span>
                    <button onClick={() => setNumberOfGuests((n) => n + 1)} className="btn-ghost h-9 w-9 justify-center p-0">+</button>
                  </div>
                </div>

                {nights > 0 && (
                  <div className="mt-5 glass rounded-2xl p-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-brand-muted">{nights} night{nights !== 1 ? "s" : ""} × {formatKes(nightlyRate)}</span><span className="text-white">{formatKes(subtotal)}</span></div>
                    <div className="border-t border-white/10 pt-2 flex justify-between">
                      <span className="font-medium text-white">Booking fee due now</span>
                      <span className="font-bold text-brand-gold">{formatKes(bookingFee)}</span>
                    </div>
                    <p className="text-xs text-brand-muted pt-1">Half of one night's rate, paid now to secure these dates. The remaining balance is settled at check-in.</p>
                  </div>
                )}

                <button onClick={handleContinueFromDates} disabled={!checkIn || !checkOut} className="btn-gold w-full justify-center mt-5 disabled:opacity-40">
                  Continue <IcoArrowRight size={16} />
                </button>
              </StepCard>
            )}

            {/* STEP 2 — Guest details */}
            {step === 2 && (
              <StepCard title="Your Details" subtitle="Just the essentials - no documents needed yet.">
                <div className="space-y-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input value={guestName} onChange={(e) => setGuestName(e.target.value)} className="input-dark" placeholder="Jane Doe" />
                  </div>
                  <div>
                    <label className="label">Phone Number</label>
                    <PhoneInput value={guestPhone} onChange={setGuestPhone} />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} className="input-dark" placeholder="jane@email.com" />
                  </div>
                  <div>
                    <label className="label">Anything we should know? (optional)</label>
                    <textarea rows={3} value={specialRequests} onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="e.g. Late arrival around 9pm" className="input-dark resize-none" />
                  </div>
                </div>
                <button onClick={handleSubmitDetails} disabled={loading} className="btn-gold w-full justify-center mt-5">
                  {loading ? <IcoLoader size={18} /> : <>Continue to Payment <IcoArrowRight size={16} /></>}
                </button>
              </StepCard>
            )}

            {/* STEP 3 — Payment */}
            {step === 3 && booking && (
              <StepCard title="Secure Your Dates" subtitle="Pay the booking fee via M-Pesa to confirm your reservation.">
                {!payResult ? (
                  <>
                    <div className="mb-5 glass rounded-2xl p-5 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-brand-muted">Dates</span><span className="text-white">{booking.checkInDate} → {booking.checkOutDate}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-brand-muted">Guests</span><span className="text-white">{booking.numberOfGuests}</span></div>
                      <div className="border-t border-white/10 pt-2 flex justify-between">
                        <span className="font-medium text-white">Booking Fee Due</span>
                        <span className="font-bold text-brand-gold">{formatKes(booking.bookingFeeAmount)}</span>
                      </div>
                    </div>
                    <label className="label">M-Pesa Phone Number</label>
                    <PhoneInput value={mpesaPhone} onChange={setMpesaPhone} />
                    <p className="text-xs text-brand-muted mt-1">Enter the Safaricom number to receive the STK Push prompt.</p>
                    <button onClick={handlePayment} disabled={loading} className="btn-gold w-full justify-center mt-5">
                      {loading ? <IcoLoader size={18} /> : <><IcoWallet size={16} /> Send STK Push</>}
                    </button>
                  </>
                ) : (
                  <StkWaiting payResult={payResult} onCheck={async () => {
                    // Ask Safaricom directly via queryStkStatus first - it self-heals our DB row
                    // if the STK callback never arrived, then re-read the booking for the result.
                    if (payResult.checkoutRequestId) {
                      await paymentApi.queryStkStatus(payResult.checkoutRequestId).catch(() => null);
                    }
                    const updated = await shortStayApi.getById(booking.id).catch(() => null);
                    if (updated?.status !== "Confirmed") return false;
                    setBooking(updated);
                    setPayResult(null);
                    setStep(4);
                    return true;
                  }} />
                )}
              </StepCard>
            )}

            {/* STEP 4 — ID verification, then confirmation */}
            {step === 4 && booking && !isDone && (
              <StepCard title="Verify Your ID" subtitle="Your dates are secured! Just upload a quick ID check before check-in.">
                <div className="space-y-4">
                  {DOC_TYPES.map((dt) => (
                    <DocUploadSlot key={dt.key} docKey={dt.key} label={dt.label} hint={dt.hint}
                      state={docs[dt.key]} onChange={handleDocUpload} />
                  ))}
                </div>
                <button onClick={handleSubmitDocuments} disabled={loading} className="btn-gold w-full justify-center mt-6">
                  {loading ? <IcoLoader size={18} /> : <><IcoCheck size={16} /> Submit Verification</>}
                </button>
                <p className="mt-3 text-center text-xs text-brand-muted">Your booking is already confirmed - this just helps the host verify it's really you at check-in.</p>
              </StepCard>
            )}

            {step === 4 && booking && isDone && (
              <ConfirmationScreen listing={listing} booking={booking} terms={terms} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="glass-strong rounded-3xl p-7 shadow-2xl">
      <h2 className="font-display text-2xl font-bold text-white">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-brand-muted">{subtitle}</p>}
      <div className="mt-6">{children}</div>
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

function ConfirmationScreen({ listing, booking, terms }: { listing: Listing; booking: ShortStayBooking; terms: PropertyTerms | null }) {
  const navigate = useNavigate();
  return (
    <div className="glass-strong rounded-3xl p-8 text-center shadow-2xl">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 350, damping: 22 }}
        className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-full bg-brand-gold/15">
        <span className="text-5xl">🎉</span>
      </motion.div>
      <h2 className="font-display text-3xl font-bold text-white">You're All Set!</h2>
      <p className="mt-2 text-brand-muted">
        Your stay at {listingTitle(listing)} from {booking.checkInDate} to {booking.checkOutDate} is confirmed.
      </p>

      <div className="mt-7 space-y-4 text-left">
        {terms?.accessInstructions && (
          <InfoBlock icon="🔑" title="How to Access the Premises" content={terms.accessInstructions} />
        )}
        {terms?.itemsToCarry && (
          <InfoBlock icon="🎒" title="What to Bring" content={terms.itemsToCarry} />
        )}
        <InfoBlock icon="💳" title="Remaining Balance" content={`The remaining balance for your stay is settled with your host at check-in.`} />
      </div>

      <div className="mt-8 flex flex-col gap-3">
        <button onClick={() => navigate("/my-applications?section=stays")} className="btn-gold w-full justify-center">
          View My Stays <IcoArrowRight size={16} />
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
