import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authApi, ApiError } from "../lib/api";
import { useApp } from "../context/AppContext";
import { IcoArrowRight, IcoCheck, IcoKey, IcoLoader, IcoX } from "../components/icons";
import { GradientBlobs, Logo } from "../components/ui";

type Step = "identify" | "otp" | "done";

export function LoginPage() {
  const { isAuthenticated, loginComplete, toast } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("identify");
  const [identifier, setIdentifier] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      await authApi.login(isEmail ? { email: identifier } : { phoneNumber: identifier });
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.body : String(err));
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const isEmail = identifier.includes("@");
      const res = await authApi.verifyOtp(
        isEmail ? { otp, Email: identifier } : { otp, PhoneNumber: identifier }
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
      setTimeout(() => navigate("/dashboard", { replace: true }), 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.body : String(err));
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
                ? "Redirecting to your dashboard…"
                : "Enter your email or phone number to receive a one-time code."}
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

          {step === "identify" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-brand-muted uppercase tracking-wider">
                  Email or Phone
                </label>
                <input
                  autoFocus
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="you@email.com or +254…"
                  className="input-dark"
                />
              </div>
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
                onClick={() => { setStep("identify"); setOtp(""); setError(""); }}
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
