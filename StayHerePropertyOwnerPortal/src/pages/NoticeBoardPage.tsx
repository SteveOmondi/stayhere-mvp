import { useEffect, useState } from "react";
import { useOwner } from "../context/OwnerContext";
import { customersApi, ApiError } from "../lib/api";
import { IcoNotice, IcoPlus, IcoMail, IcoX, IcoCheck, IcoLoader, IcoSearch } from "../components/icons";

type Tenant = { id: string; firstName: string; lastName: string; email: string };

function mapTenant(x: unknown): Tenant | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return { id: String(r.id), firstName: String(r.firstName ?? ""), lastName: String(r.lastName ?? ""), email: String(r.email ?? "") };
}

type Notice = { id: string; subject: string; body: string; recipients: number; sentAt: string };

export function NoticeBoardPage() {
  const { owner, toast } = useOwner();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompose, setShowCompose] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({ subject: "", body: "", recipientIds: [] as string[], broadcastAll: true });

  useEffect(() => {
    if (!owner?.id) return;
    setLoading(true);
    customersApi.list()
      .then(data => {
        const arr = Array.isArray(data) ? data : ((data as Record<string, unknown>)?.items as unknown[] ?? []);
        setTenants(arr.map(mapTenant).filter(Boolean) as Tenant[]);
      })
      .catch((e: any) => toast(e instanceof ApiError ? e.message : "Failed to load tenants", "error"))
      .finally(() => setLoading(false));
    const stored = localStorage.getItem(`sh_notices_${owner.id}`);
    if (stored) { try { setNotices(JSON.parse(stored)); } catch { /* */ } }
  }, [owner?.id]);

  const filtered = tenants.filter(t =>
    `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  function toggleRecipient(id: string) {
    setForm(f => ({
      ...f,
      recipientIds: f.recipientIds.includes(id) ? f.recipientIds.filter(x => x !== id) : [...f.recipientIds, id],
    }));
  }

  async function handleSend() {
    if (!form.subject.trim()) { toast("Enter a subject.", "error"); return; }
    if (!form.body.trim()) { toast("Write your message.", "error"); return; }
    const count = form.broadcastAll ? tenants.length : form.recipientIds.length;
    if (count === 0) { toast("Select at least one recipient.", "error"); return; }
    setSending(true);
    await new Promise(r => setTimeout(r, 900));
    const notice: Notice = { id: Date.now().toString(), subject: form.subject, body: form.body, recipients: count, sentAt: new Date().toISOString() };
    const updated = [notice, ...notices];
    setNotices(updated);
    if (owner?.id) localStorage.setItem(`sh_notices_${owner.id}`, JSON.stringify(updated));
    toast(`Notice sent to ${count} tenant${count !== 1 ? "s" : ""}!`, "success");
    setShowCompose(false);
    setForm({ subject: "", body: "", recipientIds: [], broadcastAll: true });
    setSending(false);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl text-brand-950">Notice Board</h1>
          <p className="text-sm text-brand-500 mt-0.5">Broadcast messages to your tenants</p>
        </div>
        <button className="btn-teal gap-2" onClick={() => setShowCompose(true)}>
          <IcoPlus size={16} /> Compose Notice
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Tenants", value: tenants.length },
          { label: "Notices Sent", value: notices.length },
          { label: "Last Sent", value: notices[0] ? new Date(notices[0].sentAt).toLocaleDateString() : "—" },
        ].map(s => (
          <div key={s.label} className="stat-card animate-fade-in">
            <div className="text-xs text-brand-500 uppercase tracking-wider mb-1">{s.label}</div>
            <div className="text-2xl font-bold text-brand-950">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-black/[0.07] flex items-center gap-3">
          <IcoNotice size={18} className="text-teal-600" />
          <h2 className="font-semibold text-brand-900">Sent Notices</h2>
          <span className="ml-auto text-xs text-brand-400">{notices.length} total</span>
        </div>
        {loading ? (
          <div className="p-8 flex justify-center"><IcoLoader size={24} className="text-teal-500 animate-spin" /></div>
        ) : notices.length === 0 ? (
          <div className="p-12 text-center">
            <IcoNotice size={40} className="text-brand-300 mx-auto mb-3" />
            <p className="text-brand-500 font-medium">No notices sent yet</p>
            <p className="text-brand-400 text-sm mt-1">Compose a notice to broadcast to your tenants</p>
          </div>
        ) : (
          <div className="divide-y divide-black/[0.05]">
            {notices.map(n => (
              <div key={n.id} className="px-6 py-4 hover:bg-slate-50/70 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-brand-900 truncate">{n.subject}</div>
                    <p className="text-sm text-brand-600 mt-1 line-clamp-2">{n.body}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="badge badge-teal">{n.recipients} recipients</span>
                    <div className="text-xs text-brand-400 mt-1">{new Date(n.sentAt).toLocaleDateString()}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCompose && (
        <div className="modal-bg" onClick={e => e.target === e.currentTarget && setShowCompose(false)}>
          <div className="modal-box max-w-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.07]">
              <div className="flex items-center gap-3">
                <IcoMail size={18} className="text-teal-600" />
                <h3 className="font-display text-lg text-brand-900">Compose Notice</h3>
              </div>
              <button onClick={() => setShowCompose(false)} className="btn-icon"><IcoX size={18} /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="field">
                <label className="field-label">Subject *</label>
                <input className="input" placeholder="e.g. Rent reminder for December" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} />
              </div>
              <div className="field">
                <label className="field-label">Message *</label>
                <textarea className="input min-h-[120px]" placeholder="Write your message here…" value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} />
              </div>
              <div>
                <label className="field-label mb-2 block">Recipients</label>
                <label className="flex items-center gap-2 cursor-pointer mb-3">
                  <input type="checkbox" checked={form.broadcastAll} onChange={e => setForm(f => ({ ...f, broadcastAll: e.target.checked }))} className="w-4 h-4 accent-teal-600" />
                  <span className="text-sm font-medium text-brand-800">Broadcast to all {tenants.length} tenants</span>
                </label>
                {!form.broadcastAll && (
                  <div className="border border-black/10 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-50 border-b border-black/[0.07] flex items-center gap-2">
                      <IcoSearch size={14} className="text-brand-400" />
                      <input className="bg-transparent outline-none text-sm flex-1 placeholder:text-brand-400" placeholder="Search tenants…" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="max-h-48 overflow-y-auto divide-y divide-black/[0.05]">
                      {filtered.map(t => (
                        <label key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={form.recipientIds.includes(t.id)} onChange={() => toggleRecipient(t.id)} className="w-4 h-4 accent-teal-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-brand-800 truncate">{t.firstName} {t.lastName}</div>
                            <div className="text-xs text-brand-400 truncate">{t.email}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowCompose(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleSend} disabled={sending} className="btn-teal flex-1 disabled:opacity-50">
                  {sending ? <IcoLoader size={15} /> : <IcoCheck size={15} />}
                  {sending ? "Sending…" : "Send Notice"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
