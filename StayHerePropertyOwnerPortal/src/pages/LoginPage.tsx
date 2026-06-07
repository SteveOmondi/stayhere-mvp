import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authApi, ApiError } from "../lib/api";
import { useOwner } from "../context/OwnerContext";
import { IcoLoader, IcoCheck, IcoKey, IcoMail, IcoPhone, IcoChevRight } from "../components/icons";
import type { AuthUser } from "../context/OwnerContext";

type Step   = "identify" | "otp" | "done";
type Method = "email" | "phone";

export function LoginPage() {
  const { loginComplete, toast, isAuthenticated } = useOwner();
  const navigate = useNavigate();

  /* Redirect immediately if already authenticated */
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  const [step,     setStep]     = useState<Step>("identify");
  const [method,   setMethod]   = useState<Method>("phone");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState("");
  const [otp,      setOtp]      = useState("");
  const [loading,  setLoading]  = useState(false);
  const [, setSesData]          = useState<Record<string, unknown>>({});
  const [error,    setError]    = useState("");

  const identifier = method === "email" ? email.trim() : `+254${phone.trim()}`;

  async function handleRequestOtp(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const body = method === "email"
        ? { email: email.trim() }
        : { phoneNumber: `+254${phone.trim()}` };
      const res = await authApi.login(body);
      console.log("%c📬 Owner login response:", "color:#0d9488;font-weight:bold", res);
      setSesData(res);
      const token = extractToken(res);
      if (token) {
        const user = buildUser(res, token);
        if (!isPropertyOwner(user, res)) return;
        await loginComplete(token, user);
        setStep("done");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
        return;
      }
      console.log(`%c📟 OTP sent to ${identifier}`, "color:#f59e0b;font-weight:bold");
      toast(`OTP sent to ${identifier}. Enter the code below.`, "info");
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status}: ${err.body}` : String(err));
    } finally { setLoading(false); }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const body = method === "email"
      ? { Email: email.trim(), otp: otp.trim() }
      : { PhoneNumber: `+254${phone.trim()}`, otp: otp.trim() };
    try {
      const res = await authApi.verifyOtp(body);
      console.log("%c✅ Owner OTP verify:", "color:#0d9488;font-weight:bold", res);
      if (res.succeeded && res.token) {
        const user = buildUser(res, res.token);
        if (!isPropertyOwner(user, res)) { setLoading(false); return; }
        await loginComplete(res.token, user);
        toast("Welcome to your Owner Portal!", "success");
        setStep("done");
        setTimeout(() => navigate("/dashboard", { replace: true }), 800);
      } else {
        setError(res.message ?? "OTP verification failed. Please try again.");
      }
    } catch (err) {
      setError(err instanceof ApiError ? `${err.status}: ${err.body}` : String(err));
    } finally { setLoading(false); }
  }

  function isPropertyOwner(user: AuthUser, res: Record<string, unknown> | { succeeded?: boolean; token?: string; user?: Record<string, unknown> }): boolean {
    const u = (res as Record<string, unknown>).user as Record<string, unknown> | undefined;
    const roles: string[] = Array.isArray(u?.roles) ? (u!.roles as string[]) : [user.role];
    const ok = roles.some(r => r.toLowerCase() === "propertyowner" || r.toLowerCase() === "owner" || r.toLowerCase() === "property_owner");
    if (!ok) {
      setError(`Access denied. This portal is for Property Owners only. Your role: ${roles.join(", ")}. Please use the Admin Portal instead.`);
      console.warn("%c🚫 Role check failed — not a PropertyOwner:", "color:#ef4444;font-weight:bold", roles);
    }
    return ok;
  }

  function extractToken(res: Record<string, unknown>): string | null {
    const t = res.token ?? res.accessToken ?? res.jwt;
    return typeof t === "string" && t.length > 10 ? t : null;
  }

  function buildUser(res: Record<string, unknown> | { succeeded?: boolean; token?: string; user?: Record<string, unknown> }, _token: string): AuthUser {
    const u = ((res as Record<string, unknown>).user ?? {}) as Record<string, unknown>;
    const roles: string[] = Array.isArray(u.roles) ? (u.roles as string[]) : [];
    return {
      email: String(u.email ?? (method === "email" ? email : "")),
      name:  String(u.fullName ?? u.name ?? (method === "email" ? email.split("@")[0] : phone)),
      role:  roles[0] ?? "PropertyOwner",
      userId: String(u.id ?? u.userId ?? ""),
    };
  }

  const inputCls = "w-full rounded-xl px-4 py-3 text-sm text-white border border-white/15 focus:outline-none focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20 transition-all placeholder:text-white/20";
  const inputBg  = { background: "rgba(255,255,255,0.07)" } as const;

  return (
    <div className="min-h-screen flex" style={{ background: "#0c1222" }}>

      {/* Left hero */}
      <div className="hidden lg:flex flex-col justify-between p-12 w-[460px] shrink-0 relative overflow-hidden">
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80"
            alt="" className="w-full h-full object-cover opacity-25" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,rgba(12,18,34,0.7) 0%,rgba(12,18,34,0.96) 100%)" }} />
          <div className="absolute inset-0 opacity-10" style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(13,148,136,0.8), transparent 65%)" }} />
        </div>
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center font-display font-bold text-sm text-brand-950 animate-float"
            style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>SH</div>
          <div>
            <div className="font-display text-2xl text-brand-teallight">StayHere</div>
            <div className="text-[10px] text-white/30 uppercase tracking-widest">Owner Portal</div>
          </div>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="font-display text-3xl text-white leading-tight">Manage your<br /><span className="text-brand-teallight">entire portfolio</span><br />in one place.</h2>
          </div>
          <div className="space-y-3">
            {["Real-time property analytics","Tenant management & KYC","AI-powered listing search","Broadcast notices to tenants","One-click agent & caretaker assignment"].map(f => (
              <div key={f} className="flex items-center gap-2.5 text-xs text-white/55">
                <IcoCheck size={12} className="text-brand-teal shrink-0" />{f}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-bold text-brand-950"
              style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>SH</div>
            <div className="font-display text-xl text-brand-teallight">StayHere Owner</div>
          </div>

          <div className="rounded-3xl border border-white/10 overflow-hidden" style={{ background: "rgba(255,255,255,0.04)" }}>

            {step === "done" && (
              <div className="p-10 text-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                  style={{ background: "rgba(13,148,136,0.18)" }}>
                  <IcoCheck size={32} className="text-teal-400" />
                </div>
                <div className="font-display text-2xl text-white mb-1">Welcome!</div>
                <div className="text-white/45 text-sm">Loading your portfolio…</div>
              </div>
            )}

            {step === "otp" && (
              <div className="p-8">
                <div className="mb-7">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(13,148,136,0.15)" }}>
                    <IcoKey size={20} className="text-brand-teal" />
                  </div>
                  <h1 className="font-display text-2xl text-white">Enter OTP</h1>
                  <p className="text-white/45 text-sm mt-1.5 leading-relaxed">
                    Code sent to <span className="text-white/75 font-medium">{identifier}</span>.
                    Enter it below to continue.
                  </p>
                </div>
                {error && <div className="mb-4 px-4 py-3 rounded-xl text-xs text-red-300 border border-red-500/30 leading-relaxed break-words" style={{ background: "rgba(239,68,68,0.1)" }}>{error}</div>}
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">OTP Code</label>
                    <input required autoFocus inputMode="numeric"
                      className="w-full rounded-xl px-4 py-3.5 text-center text-2xl font-mono tracking-[0.5em] text-white border border-white/15 focus:outline-none focus:border-brand-teal/60 focus:ring-2 focus:ring-brand-teal/20 transition-all"
                      style={inputBg} placeholder="• • • • • •" value={otp} maxLength={8}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ""))} />
                  </div>
                  <button type="submit" disabled={loading || otp.length < 4}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                    {loading ? <IcoLoader size={17} /> : <IcoCheck size={17} />}
                    {loading ? "Verifying…" : "Verify & Enter Portal"}
                  </button>
                  <button type="button" onClick={() => { setStep("identify"); setOtp(""); setError(""); }}
                    className="w-full py-2.5 text-sm text-white/35 hover:text-white/65 transition-colors">
                    ← Use a different {method === "email" ? "email" : "number"}
                  </button>
                </form>
              </div>
            )}

            {step === "identify" && (
              <div className="p-8">
                <div className="mb-6">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4" style={{ background: "rgba(13,148,136,0.15)" }}>
                    {method === "email" ? <IcoMail size={20} className="text-brand-teal" /> : <IcoPhone size={20} className="text-brand-teal" />}
                  </div>
                  <h1 className="font-display text-2xl text-white">Owner Sign In</h1>
                  <p className="text-white/45 text-sm mt-1">Enter your {method === "email" ? "email" : "mobile number"} to receive a one-time code.</p>
                </div>

                {/* Method toggle */}
                <div className="flex gap-1 p-1 rounded-2xl mb-5" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {(["email","phone"] as Method[]).map(m => (
                    <button key={m} type="button" onClick={() => { setMethod(m); setError(""); }}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
                      style={method === m ? { background: "rgba(13,148,136,0.2)", color: "#5eead4", boxShadow: "inset 0 0 0 1px rgba(13,148,136,0.3)" } : { color: "rgba(255,255,255,0.3)" }}>
                      {m === "email" ? <><IcoMail size={13}/>Email</> : <><IcoPhone size={13}/>Mobile</>}
                    </button>
                  ))}
                </div>

                {error && <div className="mb-4 px-4 py-3 rounded-xl text-xs text-red-300 border border-red-500/30 leading-relaxed break-words" style={{ background: "rgba(239,68,68,0.1)" }}>{error}</div>}

                <form onSubmit={handleRequestOtp} className="space-y-5">
                  {method === "email" ? (
                    <div>
                      <label className="block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">Email Address</label>
                      <input required type="email" autoFocus className={inputCls} style={inputBg}
                        placeholder="owner@stayhere.co.ke" value={email} onChange={e => setEmail(e.target.value)} />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-bold text-white/35 uppercase tracking-widest mb-2">Mobile Number</label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none select-none">
                          <span className="text-sm leading-none">🇰🇪</span>
                          <span className="text-white/50 text-sm font-medium">+254</span>
                          <span className="text-white/20 ml-0.5">|</span>
                        </div>
                        <input required type="tel" autoFocus className={`${inputCls} pl-[88px]`} style={inputBg}
                          placeholder="712 345 678" value={phone} maxLength={9}
                          onChange={e => {
                            let v = e.target.value.replace(/\D/g, "");
                            if (v.startsWith("254")) v = v.slice(3);
                            if (v.startsWith("0")) v = v.slice(1);
                            setPhone(v);
                          }} />
                      </div>
                      <p className="text-[10px] text-white/25 mt-1.5">Digits only — +254 added automatically.</p>
                    </div>
                  )}
                  <button type="submit" disabled={loading || (method === "email" ? !email.trim() : phone.length < 9)}
                    className="w-full py-3 rounded-xl font-semibold text-sm text-white disabled:opacity-45 flex items-center justify-center gap-2 transition-all hover:brightness-110 active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                    {loading ? <IcoLoader size={17} /> : <IcoChevRight size={17} />}
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
