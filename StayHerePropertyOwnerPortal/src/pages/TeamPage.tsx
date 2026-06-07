import { useEffect, useState } from "react";
import { ownerApi, authApi, ApiError } from "../lib/api";
import { useOwner } from "../context/OwnerContext";
import { IcoTeam, IcoPlus, IcoPhone, IcoMail, IcoX, IcoCheck, IcoLoader, IcoSearch, IcoRefresh } from "../components/icons";

type Member = { id: string; fullName: string; phone: string; email: string; kind: "Agent" | "Caretaker" };

function mapMember(x: unknown, kind: "Agent" | "Caretaker"): Member | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return { id: String(r.id), fullName: String(r.fullName ?? ""), phone: String(r.phone ?? ""), email: String(r.email ?? ""), kind };
}

const ROLE_OPTIONS = [
  { value: "PropertyManager", label: "Agent (Property Manager)" },
  { value: "CareTaker",       label: "Caretaker" },
];

const EMPTY = { fullName: "", phone: "", email: "", role: "PropertyManager" };

export function TeamPage() {
  const { owner, toast, reloadKey } = useOwner();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState("");
  const [modal, setModal]     = useState(false);
  const [form, setForm]       = useState(EMPTY);
  const [saving, setSaving]   = useState(false);

  const load = async () => {
    if (!owner?.id) return;
    setLoading(true);
    try {
      const [ag, ct] = await Promise.allSettled([ownerApi.agents(owner.id), ownerApi.caretakers(owner.id)]);
      const agents     = ag.status === "fulfilled" && Array.isArray(ag.value) ? ag.value.map(x => mapMember(x, "Agent")).filter(Boolean) as Member[] : [];
      const caretakers = ct.status === "fulfilled" && Array.isArray(ct.value) ? ct.value.map(x => mapMember(x, "Caretaker")).filter(Boolean) as Member[] : [];
      setMembers([...agents, ...caretakers]);
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed to load team", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reloadKey, owner?.id]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!owner?.id) return;
    setSaving(true);
    try {
      /* Step 1: Register a new user account (no role yet — admin completes onboarding) */
      const signupResult = await authApi.signup({
        email: form.email.trim(),
        phoneNumber: form.phone.trim() || undefined,
        fullName: form.fullName.trim(),
        userType: "Individual",
      });
      const newUserId = String((signupResult as Record<string, unknown>)?.id ?? "");

      /* Step 2: Link the new user to this owner via the owner-service
         (creates the agent/caretaker record under this property owner) */
      const body = { fullName: form.fullName.trim(), phone: form.phone.trim(), email: form.email.trim(), userId: newUserId || undefined };
      if (form.role === "CareTaker") {
        await ownerApi.createCaretaker(owner.id, body);
      } else {
        await ownerApi.createAgent(owner.id, body);
      }

      const roleLabel = ROLE_OPTIONS.find(r => r.value === form.role)?.label ?? form.role;
      toast(`${roleLabel} added. Account created — an admin will complete onboarding.`, "success");
      setModal(false);
      setForm(EMPTY);
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Create failed", "error");
    } finally {
      setSaving(false);
    }
  }

  const filtered = members.filter(m =>
    !search || [m.fullName, m.phone, m.email].some(v => v.toLowerCase().includes(search.toLowerCase()))
  );
  const agents     = filtered.filter(m => m.kind === "Agent");
  const caretakers = filtered.filter(m => m.kind === "Caretaker");

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl text-brand-900">My Team</h2>
          <p className="text-sm text-brand-500 mt-1">{members.filter(m=>m.kind==="Agent").length} agents · {members.filter(m=>m.kind==="Caretaker").length} caretakers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm"><IcoRefresh size={14}/></button>
          <button onClick={() => { setModal(true); setForm(EMPTY); }} className="btn-teal text-sm"><IcoPlus size={14}/>Add Team Member</button>
        </div>
      </div>

      {/* Info banner about maker-checker */}
      <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-3"
        style={{ background: "rgba(13,148,136,0.08)", border: "1px solid rgba(13,148,136,0.2)" }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth={2} strokeLinecap="round" className="mt-0.5 shrink-0">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span className="text-brand-700">
          You can register new agents and caretakers here. For security, a StayHere admin will review and complete their onboarding before they can log in.
        </span>
      </div>

      <div className="relative">
        <IcoSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400"/>
        <input className="input pl-10" placeholder="Search team members…" value={search} onChange={e => setSearch(e.target.value)}/>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">{Array.from({length:4}).map((_,i)=><div key={i} className="card p-4 space-y-2"><div className="skeleton h-5 w-1/2"/><div className="skeleton h-3 w-2/3"/></div>)}</div>
      ) : (
        <div className="space-y-6">
          {[
            { label: "Agents", items: agents, color: "#c9a227", kind: "Agent" as const },
            { label: "Caretakers", items: caretakers, color: "#0d9488", kind: "Caretaker" as const },
          ].map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-semibold text-brand-900">{group.label}</h3>
                <span className="badge badge-neutral text-[10px]">{group.items.length}</span>
              </div>
              {group.items.length === 0 ? (
                <div className="card p-8 text-center border-dashed border-2 border-brand-200">
                  <IcoTeam size={28} className="mx-auto mb-2 text-brand-200"/>
                  <div className="text-sm text-brand-400">No {group.label.toLowerCase()} yet</div>
                  <button onClick={() => { setModal(true); setForm({ ...EMPTY, role: group.kind === "Agent" ? "PropertyManager" : "CareTaker" }); }} className="btn-teal text-xs mt-3"><IcoPlus size={12}/>Add {group.label.slice(0,-1)}</button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
                  {group.items.map((m, i) => (
                    <div key={m.id} className="card-hover p-5 animate-slide-up" style={{ animationDelay: `${i*0.05}s` }}>
                      <div className="flex items-start gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
                          style={{ background: `linear-gradient(135deg, ${group.color}88, ${group.color})` }}>
                          {m.fullName.charAt(0) || "?"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-brand-900 truncate">{m.fullName}</div>
                          <span className={`badge text-[10px] mt-0.5 ${m.kind === "Agent" ? "badge-gold" : "badge-teal"}`}>{m.kind}</span>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        {m.phone && <div className="flex items-center gap-2 text-xs text-brand-600"><IcoPhone size={11} className="text-brand-400"/>{m.phone}</div>}
                        {m.email && <div className="flex items-center gap-2 text-xs text-brand-600 truncate"><IcoMail size={11} className="text-brand-400"/>{m.email}</div>}
                      </div>
                      <div className="mt-3 pt-3 border-t border-black/[0.05]">
                        <div className="text-[10px] text-brand-400 font-mono truncate">{m.id.slice(0,20)}…</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)setModal(false);}}>
          <div className="modal-box max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div>
                <h3 className="font-display text-xl text-brand-900">Add Team Member</h3>
                <p className="text-xs text-brand-400 mt-0.5">An admin will complete their onboarding</p>
              </div>
              <button onClick={() => setModal(false)} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="field">
                <label className="field-label">Role *</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
                >
                  {ROLE_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Full Name *</label>
                <input required className="input" placeholder="e.g. John Kamau"
                  value={form.fullName} onChange={e=>setForm(f=>({...f,fullName:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field">
                  <label className="field-label">Phone</label>
                  <input className="input" placeholder="+254 700 000000"
                    value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))}/>
                </div>
                <div className="field">
                  <label className="field-label">Email *</label>
                  <input required type="email" className="input"
                    value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-teal flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
                  {saving ? "Registering…" : "Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
