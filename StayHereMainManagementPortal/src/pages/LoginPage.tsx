import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, ApiError } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import { IcoLoader, IcoCheck, IcoKey, IcoMail, IcoPhone, IcoChevronRight } from "../components/icons";

type Step   = "identify" | "otp" | "done";
type Method = "email" | "phone";

export function LoginPage() {
  const { loginComplete, toast, isAuthenticated } = usePortal();
  const navigate = useNavigate();

  /* Redirect immediately if already authenticated */
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const [step,        setStep]        = useState<Step>("identify");
  const [method,      setMethod]      = useState<Method>("email");
  const [email,       setEmail]       = useState("");
  const [phone,       setPhone]       = useState("");
  const [otp,         setOtp]         = useState("");
  const [loading,     setLoading]     = useState(false);
  const [, setSessionData] = useState<Record<string, unknown>>({});
  const [error,       setError]       = useState("");

  /** Display string for the OTP screen */
  const identifier = method === "email" ? email.trim() : `+254${phone.trim()}`;

  /* ── Step 1: request OTP ────────────────────────────────── */
  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body =
        method === "email"
          ? { email: email.trim() }
          : { phoneNumber: `+254${phone.trim()}` };

      const res = await authApi.login(body);
      console.log("%c📬 Login (OTP request) response:", "color:#3b82f6;font-weight:bold", res);
      setSessionData(res);

      /* If the server returns a token immediately (dev/test mode) skip OTP */
      const token = extractToken(res);
      if (token) {
        loginComplete(token, extractUser((res.user ?? res) as Record<string, unknown>));
        setStep("done");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
        return;
      }

      console.log(
        `%c📟 OTP dispatched to ${identifier}. Enter it below. Full response is logged above.`,
        "color:#f59e0b;font-weight:bold"
      );
      toast(`OTP sent to ${identifier}. Enter the code below.`, "info");
      setStep("otp");
    } catch (err) {
      const msg = err instanceof ApiError ? `${err.status}: ${err.body}` : String(err);
      setError(msg);
      console.error("OTP request failed:", err);
    } finally {
      setLoading(false);
    }
  }

  /* ── Step 2: verify OTP → token ─────────────────────────── */
  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    /* Exact body shape the API expects:
       POST /verifyotp  { "PhoneNumber": "+254...", "otp": "123456" }
       POST /verifyotp  { "Email": "user@example.com", "otp": "123456" }      */
    const body =
      method === "email"
        ? { Email: email.trim(), otp: otp.trim() }
        : { PhoneNumber: `+254${phone.trim()}`, otp: otp.trim() };

    try {
      const res = await authApi.verifyOtp(body);
      console.log("%c✅ OTP verify response:", "color:#10b981;font-weight:bold", res);

      if (res.succeeded && res.token) {
        const user = extractUser(res.user ?? {});
        /* ── Role guard: only Admins may access this portal ── */
        const role = (res.user as Record<string, unknown> | undefined);
        const roles: string[] = Array.isArray(role?.roles) ? role!.roles as string[] : [String(role?.role ?? "")];
        if (!roles.some(r => r.toLowerCase() === "admin")) {
          setError(`Access denied. This portal is for Admins only. Your role: ${roles.join(", ")}. Please use the Property Owner Portal instead.`);
          console.warn("%c🚫 Role check failed — not an Admin:", "color:#ef4444;font-weight:bold", roles);
          setLoading(false);
          return;
        }
        loginComplete(res.token, user);
        toast("Login successful! Welcome, Admin.", "success");
        setStep("done");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      } else {
        const msg = res.message ?? "OTP verification failed. Please try again.";
        setError(String(msg));
        console.warn("OTP verify — succeeded=false or no token:", res);
      }
    } catch (err) {
      const msg = err instanceof ApiError ? `${err.status}: ${err.body}` : String(err);
      setError(msg);
      console.error("OTP verify failed:", err);
    } finally {
      setLoading(false);
    }
  }

  function extractToken(res: Record<string, unknown>): string | null {
    const t = res.token ?? res.accessToken ?? res.jwt ?? res.access_token;
    return typeof t === "string" && t.length > 10 ? t : null;
  }

  /** Map the user object from /verifyotp response:
   *  { id, email, fullName, roles: ["Admin"], userType, ... } */
  function extractUser(u: Record<string, unknown>) {
    const fallback = method === "email" ? email.trim().split("@")[0] : phone.trim();
    const roleRaw = u.roles;
    const role = Array.isArray(roleRaw) ? String(roleRaw[0] ?? "Admin") : String(u.role ?? "Admin");
    return {
      id:    u.id    ? String(u.id)       : undefined,
      email: u.email ? String(u.email)    : (method === "email" ? email.trim() : ""),
      name:  u.fullName ? String(u.fullName) : (u.name ? String(u.name) : fallback),
      role,
    };
  }

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen flex" style={{ background: "#0c1222" }}>

      {/* Left hero */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[460px] shrink-0 relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=900&q=80"
            alt="" className="w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0"
            style={{ background: "linear-gradient(180deg,rgba(12,18,34,.6) 0%,rgba(12,18,34,.95) 100%)" }} />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-display font-bold text-brand-950"
            style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>SH</div>
          <div>
            <div className="font-display text-2xl text-brand-goldlight">StayHere</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest">Admin Portal</div>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <blockquote className="text-white/65 text-sm leading-relaxed italic">
            "Kenya's premier real estate management platform — owners, listings, and renters in one place."
          </blockquote>
          <div className="space-y-2.5">
            {["Passwordless, secure OTP login","6 live Azure APIM services","AI-powered property search","Full KYC & customer management"].map(f => (
              <div key={f} className="flex items-center gap-2 text-xs text-white/55">
                <IcoCheck size={12} className="text-brand-gold shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-brand-950"
              style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>SH</div>
            <div className="font-display text-xl text-brand-goldlight">StayHere Admin</div>
          </div>

          <div className="rounded-3xl border border-white/10 overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)" }}>

            {/* ── Done ─────────────────────────────────────── */}
            {step === "done" && (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(16,185,129,0.15)" }}>
                  <IcoCheck size={32} className="text-emerald-400" />
                </div>
                <div className="font-display text-2xl text-white mb-1">Welcome!</div>
                <div className="text-white/45 text-sm">Taking you to the dashboard…</div>
              </div>
            )}

            {/* ── OTP entry ────────────────────────────────── */}
            {step === "otp" && (
              <div className="p-8">
                <div className="mb-7">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(201,162,39,0.15)" }}>
                    <IcoKey size={20} style={{ color: "#c9a227" }} />
                  </div>
                  <h1 className="font-display text-2xl text-white">Enter OTP</h1>
                  <p className="text-white/45 text-sm mt-1.5 leading-relaxed">
                    Code sent to{" "}
                    <span className="text-white/75 font-medium">{identifier}</span>.
                    Enter it below to continue.
                  </p>
                </div>

                {error && <ErrorBox msg={error} />}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">
                      OTP Code
                    </label>
                    <input
                      required
                      autoFocus
                      inputMode="numeric"
                      className="w-full rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] text-white border border-white/15 focus:outline-none focus:border-brand-gold/60 focus:ring-2 focus:ring-brand-gold/20 transition-all"
                      style={{ background: "rgba(255,255,255,0.07)" }}
                      placeholder="• • • • • •"
                      value={otp}
                      maxLength={8}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading || otp.length < 4}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-brand-950 disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}
                  >
                    {loading ? <IcoLoader size={17} /> : <IcoCheck size={17} />}
                    {loading ? "Verifying…" : "Verify & Sign In"}
                  </button>

                  <button
                    type="button"
                    onClick={() => { setStep("identify"); setOtp(""); setError(""); }}
                    className="w-full py-2.5 text-sm text-white/35 hover:text-white/65 transition-colors"
                  >
                    ← Use a different {method === "email" ? "email" : "number"}
                  </button>
                </form>
              </div>
            )}

            {/* ── Identify step ─────────────────────────────── */}
            {step === "identify" && (
              <div className="p-8">
                <div className="mb-6">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                    style={{ background: "rgba(201,162,39,0.15)" }}>
                    {method === "email"
                      ? <IcoMail  size={20} style={{ color: "#c9a227" }} />
                      : <IcoPhone size={20} style={{ color: "#c9a227" }} />}
                  </div>
                  <h1 className="font-display text-2xl text-white">Sign In</h1>
                  <p className="text-white/45 text-sm mt-1">
                    Enter your {method === "email" ? "email address" : "mobile number"} — we'll send you a one-time code.
                  </p>
                </div>

                {/* Method toggle */}
                <div className="flex gap-1 p-1 rounded-2xl mb-5"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  {(["email","phone"] as Method[]).map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMethod(m); setError(""); }}
                      className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={method === m
                        ? { background: "rgba(201,162,39,0.18)", color: "#e8d48b", boxShadow: "inset 0 0 0 1px rgba(201,162,39,0.3)" }
                        : { color: "rgba(255,255,255,0.3)" }}
                    >
                      {m === "email"
                        ? <><IcoMail  size={13} />Email</>
                        : <><IcoPhone size={13} />Mobile</>}
                    </button>
                  ))}
                </div>

                {error && <ErrorBox msg={error} />}

                <form onSubmit={handleRequestOtp} className="space-y-5">

                  {method === "email" ? (
                    <div>
                      <label className="block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">
                        Email Address
                      </label>
                      <input
                        required
                        type="email"
                        autoFocus
                        className="w-full rounded-xl px-4 py-3 text-sm text-white border border-white/15 focus:outline-none focus:border-brand-gold/60 focus:ring-2 focus:ring-brand-gold/20 transition-all placeholder:text-white/20"
                        style={{ background: "rgba(255,255,255,0.07)" }}
                        placeholder="admin@stayhere.co.ke"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none select-none">
                          <span className="text-sm leading-none">🇰🇪</span>
                          <span className="text-white/50 text-sm font-medium">+254</span>
                          <span className="text-white/20 ml-0.5">|</span>
                        </div>
                        <input
                          required
                          type="tel"
                          autoFocus
                          className="w-full rounded-xl pl-[88px] pr-4 py-3 text-sm text-white border border-white/15 focus:outline-none focus:border-brand-gold/60 focus:ring-2 focus:ring-brand-gold/20 transition-all placeholder:text-white/20"
                          style={{ background: "rgba(255,255,255,0.07)" }}
                          placeholder="712 345 678"
                          value={phone}
                          maxLength={9}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, "");
                            if (v.startsWith("254")) v = v.slice(3);
                            if (v.startsWith("0"))   v = v.slice(1);
                            setPhone(v);
                          }}
                        />
                      </div>
                      <p className="text-[10px] text-white/25 mt-1.5 leading-relaxed">
                        Digits only — +254 prefix is added automatically.
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (method === "email" ? !email.trim() : phone.length < 9)}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-brand-950 disabled:opacity-45 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}
                  >
                    {loading ? <IcoLoader size={17} /> : <IcoChevronRight size={17} />}
                    {loading ? "Sending OTP…" : "Send OTP"}
                  </button>
                </form>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="mb-4 px-4 py-3 rounded-xl text-xs text-red-300 border border-red-500/30 leading-relaxed break-words"
      style={{ background: "rgba(239,68,68,0.1)" }}>
      {msg}
    </div>
  );
}
