import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { authApi, ApiError } from "../lib/api";
import { useApp } from "../context/AppContext";
import { readLoginRedirect } from "../lib/authRedirect";
import { PhoneInput, isPhoneComplete } from "../components/PhoneInput";
import { IcoArrowRight, IcoCheck, IcoKey, IcoLoader, IcoX, IcoEmail, IcoPhone } from "../components/icons";
import { GradientBlobs, Logo } from "../components/ui";

type Step = "identify" | "otp" | "done";
type Method = "email" | "phone";

/** ApiError.userMessage already covers 403/401/empty-body cases with clear text - this just adds
 * a sign-in-flow-specific wording for the "can't reach the service at all" case. */
function describeError(err: unknown): string {
  if (err instanceof ApiError) {
    if (!err.body || err.body === "(no response body)") {
      return "Can't reach the sign-in service right now. Please check your connection and try again.";
    }
    return err.userMessage;
  }
  return String(err);
}

export function LoginPage() {
  const { isAuthenticated, loginComplete, toast } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  // Whatever page redirected here (a route guard, or an in-page "please sign in" gate) - go back
  // there after a successful login instead of always landing on /dashboard.
  const returnTo = readLoginRedirect(location.search);
  const [step, setStep] = useState<Step>("identify");
  const [method, setMethod] = useState<Method>("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [devOtp, setDevOtp] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true });
  }, [isAuthenticated, navigate, returnTo]);

  const identifier = method === "email" ? email.trim() : phone;

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setDevOtp(null);

    if (method === "phone" && !isPhoneComplete(phone)) {
      setError("Enter a valid phone number.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.login(method === "email" ? { email: identifier } : { phoneNumber: identifier });
      if (!res || res.succeeded === false) {
        setError(res?.message ?? "Couldn't send a verification code right now. Please try again.");
        return;
      }
      if (res.otp) setDevOtp(res.otp); // only ever populated in local/test mode
      setStep("otp");
    } catch (err) {
      setError(describeError(err));
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await authApi.verifyOtp(
        method === "email" ? { otp, Email: identifier } : { otp, PhoneNumber: identifier }
      );
      if (!res.succeeded || !res.token) {
        setError(res.message ?? "OTP verification failed. Please try again.");
        return;
      }
      const user = loginComplete(res.token, res.user ?? {});
      const roles = user.roles;
      if (roles.includes("admin") || roles.includes("propertyowner") || roles.includes("propertymanager")) {
        setError("This portal is for tenants only. Please use the owner or admin portal.");
        return;
      }
      setStep("done");
      toast("Welcome back!", "success");
      setTimeout(() => navigate(returnTo, { replace: true }), 800);
    } catch (err) {
      setError(describeError(err));
    } finally { setLoading(false); }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-64px)] items-center justify-center px-4 py-16 gradient-hero overflow-hidden">
      <GradientBlobs />

      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        {/* Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-elevated">
          <div className="mb-8 text-center">
            <Logo />
            <div className="mt-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(201,162,39,0.12)" }}>
                <IcoKey size={26} className="text-brand-gold" />
              </div>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">
              {step === "otp" ? "Enter OTP" : step === "done" ? "Welcome Back!" : "Sign In"}
            </h1>
            <p className="mt-2 text-sm text-brand-muted">
              {step === "otp"
                ? <>Code sent to <span className="text-white font-medium">{identifier}</span>. Enter it below to continue.</>
                : step === "done"
                ? "Taking you back to where you left off…"
                : "Choose how you'd like to receive your one-time code."}
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
            >
              <IcoX size={15} className="mt-0.5 shrink-0" />
              {error}
            </motion.div>
          )}

          {devOtp && step === "otp" && (
            <div className="mb-5 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 text-sm text-amber-300">
              Dev mode — verification code: <span className="font-mono font-semibold tracking-widest">{devOtp}</span>
            </div>
          )}

          {step === "identify" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              {/* Email / Phone method toggle */}
              <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
                {(["email", "phone"] as Method[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setMethod(m); setError(""); }}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-sm font-medium transition ${
                      method === m ? "bg-brand-gold/20 text-brand-gold ring-1 ring-inset ring-brand-gold/40" : "text-brand-muted hover:text-white"
                    }`}
                  >
                    {m === "email" ? <IcoEmail size={15} /> : <IcoPhone size={15} />}
                    {m === "email" ? "Email" : "Mobile"}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {method === "email" ? (
                  <motion.div
                    key="email"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <label className="mb-1.5 block text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Email address
                    </label>
                    <input
                      autoFocus
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      className="input-dark"
                    />
                  </motion.div>
                ) : (
                  <motion.div
                    key="phone"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                  >
                    <label className="mb-1.5 block text-xs font-medium text-brand-muted uppercase tracking-wider">
                      Mobile number
                    </label>
                    <PhoneInput value={phone} onChange={setPhone} autoFocus />
                  </motion.div>
                )}
              </AnimatePresence>

              <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-50">
                {loading ? <IcoLoader size={18} /> : <><span>Send OTP</span><IcoArrowRight size={17} /></>}
              </button>
              <p className="text-center text-sm text-brand-muted">
                New here?{" "}
                <Link to="/signup" className="text-brand-gold hover:underline">Create account</Link>
              </p>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-brand-muted uppercase tracking-wider">
                  One-Time Code
                </label>
                <input
                  autoFocus
                  required
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={8}
                  className="input-dark text-center text-2xl tracking-[0.5em] font-mono"
                />
              </div>
              <button type="submit" disabled={loading} className="btn-gold w-full justify-center disabled:opacity-50">
                {loading ? <IcoLoader size={18} /> : <><IcoCheck size={17} /><span>Verify & Sign In</span></>}
              </button>
              <button
                type="button"
                onClick={() => { setStep("identify"); setOtp(""); setError(""); setDevOtp(null); }}
                className="w-full text-center text-sm text-brand-muted hover:text-white transition"
              >
                ← Use different identifier
              </button>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center gap-4 py-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400"
              >
                <IcoCheck size={32} />
              </motion.div>
              <IcoLoader size={20} className="text-brand-gold" />
            </div>
          )}
        </div>

        {/* Steps */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {(["identify", "otp", "done"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-3">
              <div className={`h-2 w-2 rounded-full transition-all ${step === s ? "bg-brand-gold w-6" : step === "done" || (step === "otp" && i === 0) ? "bg-brand-teal" : "bg-white/20"}`} />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
