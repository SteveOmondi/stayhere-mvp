import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";
import { Link } from "react-router-dom";
import { authApi, ApiError } from "../lib/api";
import { IcoArrowRight, IcoCheck, IcoLoader, IcoUser, IcoX } from "../components/icons";
import { GradientBlobs, Logo } from "../components/ui";

type Step = "form" | "success";

export function SignUpPage() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ fullName: "", email: "", phoneNumber: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await authApi.signup({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
      });
      setStep("success");
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
        <div className="glass-strong rounded-3xl p-8 shadow-elevated">
          <div className="mb-8 text-center">
            <Logo />
            <div className="mt-6 flex justify-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "rgba(13,148,136,0.12)" }}>
                <IcoUser size={26} className="text-brand-teallight" />
              </div>
            </div>
            <h1 className="mt-4 font-display text-2xl font-bold text-white">Create Account</h1>
            <p className="mt-2 text-sm text-brand-muted">Join thousands finding their dream home</p>
          </div>

          <AnimatePresence mode="wait">
            {step === "form" ? (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {error && (
                  <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    <IcoX size={15} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Full Name *</label>
                    <input required autoFocus value={form.fullName} onChange={set("fullName")} placeholder="Jane Wambui" className="input-dark" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Email *</label>
                    <input required type="email" value={form.email} onChange={set("email")} placeholder="jane@example.com" className="input-dark" />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-muted">Phone (optional)</label>
                    <input type="tel" value={form.phoneNumber} onChange={set("phoneNumber")} placeholder="+254 700 000 000" className="input-dark" />
                  </div>
                  <button type="submit" disabled={loading} className="btn-gold w-full justify-center mt-2 disabled:opacity-50">
                    {loading ? <IcoLoader size={18} /> : <><span>Create Account</span><IcoArrowRight size={17} /></>}
                  </button>
                  <p className="text-center text-sm text-brand-muted">
                    Already have an account?{" "}
                    <Link to="/login" className="text-brand-gold hover:underline">Sign in</Link>
                  </p>
                </form>
              </motion.div>
            ) : (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-5 py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
                >
                  <IcoCheck size={38} />
                </motion.div>
                <div>
                  <h2 className="font-display text-xl font-bold text-white">Account Created!</h2>
                  <p className="mt-2 text-sm text-brand-muted leading-relaxed">
                    Welcome to StayHere, <span className="text-white font-medium">{form.fullName}</span>! Your account is ready.
                  </p>
                </div>
                <Link to="/login" className="btn-gold w-full justify-center">
                  <IcoArrowRight size={17} /> Continue to Sign In
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
