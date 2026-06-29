import { useEffect, useState } from "react";
import { staticApi, ApiError, RoleDefinitionDto, UserTypeDefinitionDto } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import { IcoPlus, IcoX, IcoCheck, IcoLoader, IcoDatabase } from "../components/icons";

const DEF_EMPTY = { name: "", description: "" };

type Tab = "roles" | "userTypes";
type DefModal = "role" | "userType" | null;

export function ReferenceDataPage() {
  const { toast } = usePortal();
  const [tab, setTab]           = useState<Tab>("roles");
  const [roles, setRoles]       = useState<RoleDefinitionDto[]>([]);
  const [userTypes, setUserTypes] = useState<UserTypeDefinitionDto[]>([]);
  const [loading, setLoading]   = useState(false);

  const [defModal, setDefModal] = useState<DefModal>(null);
  const [defForm, setDefForm]   = useState(DEF_EMPTY);
  const [defSaving, setDefSaving] = useState(false);

  async function loadData(which: Tab) {
    setLoading(true);
    try {
      if (which === "roles") {
        const data = await staticApi.userRoles();
        setRoles(Array.isArray(data) ? data : []);
      }
      if (which === "userTypes") {
        const data = await staticApi.userTypes();
        setUserTypes(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed to load reference data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(tab); }, [tab]);

  function openDefCreate(type: "role" | "userType") { setDefForm(DEF_EMPTY); setDefModal(type); }

  async function handleSaveDef(e: React.FormEvent) {
    e.preventDefault();
    setDefSaving(true);
    try {
      const body = { name: defForm.name.trim(), description: defForm.description.trim() || undefined };
      if (defModal === "role") {
        await staticApi.createUserRole(body);
        toast("Role created.", "success");
        void loadData("roles");
      } else {
        await staticApi.createUserType(body);
        toast("User type created.", "success");
        void loadData("userTypes");
      }
      setDefModal(null);
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Save failed", "error");
    } finally {
      setDefSaving(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "roles",     label: "User Roles" },
    { id: "userTypes", label: "User Types" },
  ];

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#c9a22718" }}>
              <IcoDatabase size={17} style={{ color: "#c9a227" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Reference Data</h2>
          </div>
          <p className="text-sm text-brand-500">Manage platform roles and user types</p>
        </div>
        {tab === "roles" && (
          <button onClick={() => openDefCreate("role")} className="btn-primary">
            <IcoPlus size={15} /> New Role
          </button>
        )}
        {tab === "userTypes" && (
          <button onClick={() => openDefCreate("userType")} className="btn-primary">
            <IcoPlus size={15} /> New User Type
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-brand-800/10 pb-0">
        {tabs.map(t => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={`px-5 py-2.5 text-sm font-medium rounded-t-lg transition border-b-2 ${
              tab === t.id
                ? "border-brand-gold text-brand-gold bg-brand-gold/5"
                : "border-transparent text-brand-600 hover:text-brand-900 hover:bg-brand-950/[0.03]"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Roles tab ─────────────────────────────────────────────── */}
      {tab === "roles" && (
        <div className="portal-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">Platform Roles</h3>
              <p className="text-xs text-brand-500">
                System roles are built-in. Custom roles can be created here to extend the platform.
              </p>
            </div>
            <span className="badge badge-neutral shrink-0">{roles.length} total</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((r, i) => (
                <div key={r.isSystem ? r.name : r.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.07] bg-white/60">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: r.isSystem ? `hsl(${i * 50 + 200}, 65%, 50%)` : "#c9a227" }}>
                    {r.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-brand-900 text-sm truncate">{r.name}</div>
                    <div className="text-[10px] text-brand-400">
                      {r.isSystem
                        ? <span className="text-brand-teal font-medium">system</span>
                        : <span className="text-brand-gold font-medium">custom</span>}
                      {r.description && <span className="ml-1">· {r.description}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-black/[0.06] text-xs text-brand-400">
            System roles are defined as a C# enum — changes require redeployment.
            Custom roles are stored in the database and available immediately.
          </div>
        </div>
      )}

      {/* ── User Types tab ────────────────────────────────────────── */}
      {tab === "userTypes" && (
        <div className="portal-card p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold text-brand-900 mb-1">User Types</h3>
              <p className="text-xs text-brand-500">
                System types classify accounts (Individual, Business). Custom types can extend these.
              </p>
            </div>
            <span className="badge badge-neutral shrink-0">{userTypes.length} total</span>
          </div>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-10 w-full rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {userTypes.map((t, i) => (
                <div key={t.isSystem ? t.name : t.id}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.07] bg-white/60 min-w-[160px]">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                    style={{ background: t.isSystem ? (i === 0 ? "#0d9488" : "#8b5cf6") : "#c9a227" }}>
                    {t.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-brand-900 text-sm truncate">{t.name}</div>
                    <div className="text-[10px] text-brand-400">
                      {t.isSystem
                        ? <span className="text-brand-teal font-medium">system</span>
                        : <span className="text-brand-gold font-medium">custom</span>}
                      {t.description && <span className="ml-1">· {t.description}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-black/[0.06] text-xs text-brand-400">
            System user types are defined as a C# enum — changes require redeployment.
            Custom types are stored in the database and available immediately.
          </div>
        </div>
      )}

      {/* ── Role / UserType Create Modal ─────────────────────────── */}
      {defModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setDefModal(null); }}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <h3 className="font-display text-xl text-brand-900">
                {defModal === "role" ? "New Custom Role" : "New Custom User Type"}
              </h3>
              <button onClick={() => setDefModal(null)} className="btn-icon"><IcoX size={16} /></button>
            </div>
            <form onSubmit={handleSaveDef} className="p-6 space-y-4">
              <div className="px-4 py-3 rounded-xl text-xs text-brand-600 border border-brand-gold/20 bg-brand-gold/5 leading-relaxed">
                Custom {defModal === "role" ? "roles" : "user types"} are stored in the database.
                System {defModal === "role" ? "roles" : "user types"} (e.g. Admin, PropertyOwner) remain defined in code.
              </div>
              <div className="portal-field">
                <label className="portal-label">Name <span className="text-red-500">*</span></label>
                <input required className="portal-input"
                  placeholder={defModal === "role" ? "e.g. PropertyInspector" : "e.g. Corporate"}
                  value={defForm.name} onChange={e => setDefForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="portal-field">
                <label className="portal-label">Description</label>
                <textarea rows={2} className="portal-input resize-none" placeholder="Optional description"
                  value={defForm.description} onChange={e => setDefForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setDefModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={defSaving} className="btn-primary flex-1 disabled:opacity-50">
                  {defSaving ? <IcoLoader size={15} /> : <IcoCheck size={15} />}
                  {defSaving ? "Creating…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
