import { useEffect, useState } from "react";
import { authApi, staticApi, ApiError } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import {
  IcoPlus, IcoX, IcoCheck, IcoLoader, IcoSearch, IcoRefresh, IcoChevronRight,
} from "../components/icons";

type UserRow = {
  id: string; email: string; fullName: string; phone: string;
  roles: string[]; userType: string; isOnboarded: boolean; createdAt: string;
};

function mapUser(x: unknown): UserRow | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return {
    id:          String(r.id ?? ""),
    email:       String(r.email ?? ""),
    fullName:    String(r.fullName ?? ""),
    phone:       String((r.phoneNumber ?? r.phone) ?? ""),
    roles:       Array.isArray(r.roles) ? r.roles.map(String) : [],
    userType:    String(r.userType ?? "Individual"),
    isOnboarded: Boolean(r.isOnboarded),
    createdAt:   String(r.createdAt ?? ""),
  };
}

const PAGE_SIZE = 20;

type ModalMode = "signup" | "onboard" | null;

const SIGNUP_EMPTY = { email: "", phone: "", fullName: "", userType: "Individual" };
const ONBOARD_EMPTY = { userId: "", role: "", fullName: "", phone: "", email: "" };

export function UserManagementPage() {
  const { toast, reloadKey } = usePortal();

  const [users, setUsers]         = useState<UserRow[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState<ModalMode>(null);
  const [saving, setSaving]       = useState(false);
  const [roles, setRoles]         = useState<string[]>([]);

  const [signupForm, setSignupForm]   = useState(SIGNUP_EMPTY);
  const [onboardForm, setOnboardForm] = useState(ONBOARD_EMPTY);

  useEffect(() => {
    void (async () => {
      try { setRoles((await staticApi.userRoles()).map(r => r.name)); } catch { /* non-critical */ }
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await authApi.getUsers(page, PAGE_SIZE);
        if (cancelled) return;
        setUsers((data.items ?? []).map(mapUser).filter(Boolean) as UserRow[]);
        setTotal(data.totalCount ?? 0);
      } catch (e) {
        if (!cancelled) toast(e instanceof ApiError ? e.message : "Failed to load users", "error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [page, reloadKey, toast]);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.signup({
        email: signupForm.email.trim(),
        phoneNumber: signupForm.phone.trim() || undefined,
        fullName: signupForm.fullName.trim(),
        userType: signupForm.userType,
      });
      toast("User account created successfully.", "success");
      setModal(null);
      setSignupForm(SIGNUP_EMPTY);
      setPage(1);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Signup failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleOnboard(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await authApi.onboard({
        userId:   onboardForm.userId.trim(),
        role:     onboardForm.role,
        fullName: onboardForm.fullName.trim(),
        phone:    onboardForm.phone.trim(),
        email:    onboardForm.email.trim(),
      });
      toast("User onboarded and role assigned successfully.", "success");
      setModal(null);
      setOnboardForm(ONBOARD_EMPTY);
      setPage(1);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Onboarding failed", "error");
    } finally {
      setSaving(false);
    }
  }

  function openOnboardFor(u: UserRow) {
    setOnboardForm({
      userId:   u.id,
      role:     roles[0] ?? "",
      fullName: u.fullName,
      phone:    u.phone,
      email:    u.email,
    });
    setModal("onboard");
  }

  const filtered = search
    ? users.filter(u => [u.email, u.fullName, u.phone].some(v => v.toLowerCase().includes(search.toLowerCase())))
    : users;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(99,102,241,0.12)" }}>
              <svg width={17} height={17} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h2 className="font-display text-3xl text-brand-900">User Management</h2>
          </div>
          <p className="text-sm text-brand-500">
            Register and onboard platform users · <strong>{total}</strong> total
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setOnboardForm(ONBOARD_EMPTY); setModal("onboard"); }} className="btn-secondary text-sm">
            <IcoCheck size={14}/> Onboard User
          </button>
          <button onClick={() => { setSignupForm(SIGNUP_EMPTY); setModal("signup"); }} className="btn-primary text-sm">
            <IcoPlus size={14}/> New User
          </button>
        </div>
      </div>

      {/* Maker-checker info */}
      <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
        style={{ background: "rgba(99,102,241,0.06)", border: "1px solid rgba(99,102,241,0.18)" }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth={2} strokeLinecap="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="text-brand-600">
          <strong>Maker-checker:</strong> Property owners can register agents/caretakers, but role assignment (onboarding) must be completed here by an admin.
        </span>
      </div>

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <IcoSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400"/>
          <input className="portal-input pl-10" placeholder="Search by name, email or phone…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <button onClick={() => setPage(1)} className="btn-secondary px-3">
          <IcoRefresh size={14}/>
        </button>
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden">
        <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
          <h3 className="font-semibold text-brand-900">All Users</h3>
          <span className="badge badge-neutral">{total} registered</span>
        </div>
        <div className="overflow-x-auto">
          <table className="portal-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Phone</th>
                <th>Roles</th>
                <th>Type</th>
                <th>Status</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length: 6}).map((_, i) => (
                  <tr key={i}>{Array.from({length: 7}).map((_, j) => (
                    <td key={j}><div className="skeleton h-4 w-full"/></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-brand-400">
                    <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" className="mx-auto mb-2 text-brand-200">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                    {search ? "No users match your search" : "No users found"}
                  </td>
                </tr>
              ) : filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 text-white"
                        style={{ background: "linear-gradient(135deg, #6366f1, #818cf8)" }}>
                        {(u.fullName || u.email).charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-brand-900">{u.fullName || "—"}</div>
                        <div className="text-[11px] text-brand-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-brand-700">{u.phone || "—"}</td>
                  <td>
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0
                        ? <span className="badge badge-neutral text-[10px]">No role</span>
                        : u.roles.map(r => <span key={r} className="badge badge-gold text-[10px]">{r}</span>)
                      }
                    </div>
                  </td>
                  <td className="text-brand-600 text-xs">{u.userType}</td>
                  <td>
                    {u.isOnboarded || u.roles.length > 0
                      ? <span className="badge badge-success text-[10px]">Onboarded</span>
                      : <span className="badge badge-neutral text-[10px] text-amber-600 bg-amber-50 border-amber-200">Pending</span>
                    }
                  </td>
                  <td className="text-xs text-brand-400">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </td>
                  <td>
                    {(!u.isOnboarded && u.roles.length === 0) && (
                      <button
                        onClick={() => openOnboardFor(u)}
                        className="btn-ghost text-xs text-indigo-600 gap-1"
                      >
                        Onboard <IcoChevronRight size={11}/>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {total > PAGE_SIZE && (
          <div className="px-5 py-4 border-t border-black/[0.06] flex items-center justify-between">
            <div className="text-xs text-brand-500">
              Showing {(page-1)*PAGE_SIZE+1}–{Math.min(page*PAGE_SIZE, total)} of {total}
            </div>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p=>p-1)}
                className="btn-secondary text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Previous</button>
              <span className="text-xs text-brand-700 font-medium">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p=>p+1)}
                className="btn-secondary text-xs px-3 py-1.5 rounded-lg disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Signup Modal ─────────────────────────────────────────── */}
      {modal === "signup" && (
        <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div>
                <h3 className="font-display text-xl text-brand-900">Register New User</h3>
                <p className="text-xs text-brand-400 mt-0.5">Creates account — no role assigned yet</p>
              </div>
              <button onClick={()=>setModal(null)} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleSignup} className="p-6 space-y-4">
              <div className="portal-field">
                <label className="portal-label">Full Name <span className="text-red-500">*</span></label>
                <input required className="portal-input" placeholder="e.g. Jane Wanjiku"
                  value={signupForm.fullName} onChange={e=>setSignupForm(f=>({...f,fullName:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="portal-field">
                  <label className="portal-label">Email <span className="text-red-500">*</span></label>
                  <input required type="email" className="portal-input" placeholder="user@email.com"
                    value={signupForm.email} onChange={e=>setSignupForm(f=>({...f,email:e.target.value}))}/>
                </div>
                <div className="portal-field">
                  <label className="portal-label">Phone</label>
                  <input className="portal-input" placeholder="+254 700 000000"
                    value={signupForm.phone} onChange={e=>setSignupForm(f=>({...f,phone:e.target.value}))}/>
                </div>
              </div>
              <div className="portal-field">
                <label className="portal-label">User Type</label>
                <select className="portal-input" value={signupForm.userType}
                  onChange={e=>setSignupForm(f=>({...f,userType:e.target.value}))}>
                  <option value="Individual">Individual</option>
                  <option value="Business">Business</option>
                </select>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15}/> : <IcoPlus size={15}/>}
                  {saving ? "Creating…" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Onboard Modal ─────────────────────────────────────────── */}
      {modal === "onboard" && (
        <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setModal(null);}}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div>
                <h3 className="font-display text-xl text-brand-900">Onboard User</h3>
                <p className="text-xs text-brand-400 mt-0.5">Assign a role to activate the account</p>
              </div>
              <button onClick={()=>setModal(null)} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleOnboard} className="p-6 space-y-4">
              <div className="portal-field">
                <label className="portal-label">User ID <span className="text-red-500">*</span></label>
                <input required className="portal-input font-mono text-xs" placeholder="User GUID"
                  value={onboardForm.userId} onChange={e=>setOnboardForm(f=>({...f,userId:e.target.value}))}/>
                <div className="text-[10px] text-brand-400 mt-1">From the users table above — click "Onboard" on a pending user to pre-fill</div>
              </div>
              <div className="portal-field">
                <label className="portal-label">Role <span className="text-red-500">*</span></label>
                <select required className="portal-input" value={onboardForm.role}
                  onChange={e=>setOnboardForm(f=>({...f,role:e.target.value}))}>
                  <option value="">Select role…</option>
                  {roles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="portal-field">
                <label className="portal-label">Full Name <span className="text-red-500">*</span></label>
                <input required className="portal-input" placeholder="Full name"
                  value={onboardForm.fullName} onChange={e=>setOnboardForm(f=>({...f,fullName:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="portal-field">
                  <label className="portal-label">Email <span className="text-red-500">*</span></label>
                  <input required type="email" className="portal-input" placeholder="user@email.com"
                    value={onboardForm.email} onChange={e=>setOnboardForm(f=>({...f,email:e.target.value}))}/>
                </div>
                <div className="portal-field">
                  <label className="portal-label">Phone <span className="text-red-500">*</span></label>
                  <input required className="portal-input" placeholder="+254 700 000000"
                    value={onboardForm.phone} onChange={e=>setOnboardForm(f=>({...f,phone:e.target.value}))}/>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
                  {saving ? "Onboarding…" : "Onboard User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
