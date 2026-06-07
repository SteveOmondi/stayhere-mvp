import { useEffect, useState } from "react";
import { staticApi, ApiError, RoleDefinitionDto, UserTypeDefinitionDto } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import { IcoPlus, IcoX, IcoCheck, IcoLoader, IcoCategory } from "../components/icons";

type CategoryRow = {
  id: string; name: string; description: string; slug: string; isActive: boolean;
};

function mapCategory(x: unknown): CategoryRow | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return {
    id:          String(r.id ?? ""),
    name:        String(r.name ?? ""),
    description: String(r.description ?? ""),
    slug:        String(r.slug ?? ""),
    isActive:    Boolean(r.isActive ?? true),
  };
}

const CAT_EMPTY = { name: "", description: "", slug: "" };
const DEF_EMPTY = { name: "", description: "" };

type Tab = "roles" | "userTypes" | "categories";
type DefModal = "role" | "userType" | null;

export function ReferenceDataPage() {
  const { toast } = usePortal();
  const [tab, setTab]                     = useState<Tab>("categories");
  const [roles, setRoles]                 = useState<RoleDefinitionDto[]>([]);
  const [userTypes, setUserTypes]         = useState<UserTypeDefinitionDto[]>([]);
  const [categories, setCategories]       = useState<CategoryRow[]>([]);
  const [loading, setLoading]             = useState(false);

  // Category modal
  const [catModal, setCatModal]           = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget]       = useState<CategoryRow | null>(null);
  const [catForm, setCatForm]             = useState(CAT_EMPTY);
  const [catSaving, setCatSaving]         = useState(false);
  const [deleting, setDeleting]           = useState<string | null>(null);

  // Role / UserType create modal
  const [defModal, setDefModal]           = useState<DefModal>(null);
  const [defForm, setDefForm]             = useState(DEF_EMPTY);
  const [defSaving, setDefSaving]         = useState(false);

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
      if (which === "categories") {
        const cats = await staticApi.categoriesAll();
        setCategories(cats.map(mapCategory).filter(Boolean) as CategoryRow[]);
      }
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Failed to load reference data", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadData(tab); }, [tab]);

  // ── Category CRUD ────────────────────────────────────────────
  function openCatCreate() { setEditTarget(null); setCatForm(CAT_EMPTY); setCatModal("create"); }
  function openCatEdit(cat: CategoryRow) {
    setEditTarget(cat);
    setCatForm({ name: cat.name, description: cat.description, slug: cat.slug });
    setCatModal("edit");
  }

  async function handleSaveCategory(e: React.FormEvent) {
    e.preventDefault();
    setCatSaving(true);
    try {
      const body = {
        name:        catForm.name.trim(),
        description: catForm.description.trim() || undefined,
        slug:        catForm.slug.trim() || catForm.name.toLowerCase().replace(/\s+/g, "-"),
      };
      if (catModal === "edit" && editTarget) {
        await staticApi.updateCategory(editTarget.id, body);
        toast("Category updated.", "success");
      } else {
        await staticApi.createCategory(body);
        toast("Category created.", "success");
      }
      setCatModal(null);
      void loadData("categories");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Save failed", "error");
    } finally {
      setCatSaving(false);
    }
  }

  async function handleDeleteCategory(id: string) {
    if (!confirm("Delete this category?")) return;
    setDeleting(id);
    try {
      await staticApi.deleteCategory(id);
      toast("Category deleted.", "success");
      void loadData("categories");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }

  // ── Role / UserType create ───────────────────────────────────
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
    { id: "categories", label: "Categories" },
    { id: "roles",      label: "User Roles" },
    { id: "userTypes",  label: "User Types" },
  ];

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#c9a22718" }}>
              <IcoCategory size={17} style={{ color: "#c9a227" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Reference Data</h2>
          </div>
          <p className="text-sm text-brand-500">Manage categories, roles and user types</p>
        </div>
        {tab === "categories" && (
          <button onClick={openCatCreate} className="btn-primary">
            <IcoPlus size={15}/> New Category
          </button>
        )}
        {tab === "roles" && (
          <button onClick={() => openDefCreate("role")} className="btn-primary">
            <IcoPlus size={15}/> New Role
          </button>
        )}
        {tab === "userTypes" && (
          <button onClick={() => openDefCreate("userType")} className="btn-primary">
            <IcoPlus size={15}/> New User Type
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
            <div className="space-y-2">{Array.from({length:5}).map((_,i)=><div key={i} className="skeleton h-10 w-full rounded-lg"/>)}</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {roles.map((r, i) => (
                <div key={r.isSystem ? r.name : r.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.07] bg-white/60">
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
            <div className="space-y-2">{Array.from({length:3}).map((_,i)=><div key={i} className="skeleton h-10 w-full rounded-lg"/>)}</div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {userTypes.map((t, i) => (
                <div key={t.isSystem ? t.name : t.id} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-black/[0.07] bg-white/60 min-w-[160px]">
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

      {/* ── Categories tab ────────────────────────────────────────── */}
      {tab === "categories" && (
        <div className="portal-card overflow-hidden">
          <div className="p-5 border-b border-black/[0.06] flex items-center justify-between">
            <h3 className="font-semibold text-brand-900">Property Categories</h3>
            <span className="badge badge-neutral">{categories.length} total</span>
          </div>
          <div className="overflow-x-auto">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Description</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({length:5}).map((_,i)=>(
                    <tr key={i}>{Array.from({length:5}).map((_,j)=>(
                      <td key={j}><div className="skeleton h-4 w-full"/></td>
                    ))}</tr>
                  ))
                ) : categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-brand-400">
                      <IcoCategory size={32} className="mx-auto mb-2 text-brand-200"/>
                      No categories yet. Create one to get started.
                    </td>
                  </tr>
                ) : categories.map(cat => (
                  <tr key={cat.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: "linear-gradient(135deg, #c9a227, #e8d48b)" }}>
                          {cat.name.charAt(0)}
                        </div>
                        <span className="font-semibold text-brand-900">{cat.name}</span>
                      </div>
                    </td>
                    <td className="font-mono text-xs text-brand-500">{cat.slug || "—"}</td>
                    <td className="text-brand-600 text-xs max-w-[200px] truncate">{cat.description || "—"}</td>
                    <td>
                      <span className={`badge text-[10px] ${cat.isActive ? "badge-success" : "badge-neutral"}`}>
                        {cat.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openCatEdit(cat)}
                          className="text-xs font-semibold text-brand-gold hover:underline">Edit</button>
                        <button
                          onClick={() => void handleDeleteCategory(cat.id)}
                          disabled={deleting === cat.id}
                          className="text-xs font-semibold text-red-400 hover:underline disabled:opacity-40">
                          {deleting === cat.id ? "…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Category Modal ────────────────────────────────────────── */}
      {(catModal === "create" || catModal === "edit") && (
        <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setCatModal(null);}}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <h3 className="font-display text-xl text-brand-900">
                {catModal === "edit" ? "Edit Category" : "New Category"}
              </h3>
              <button onClick={()=>setCatModal(null)} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleSaveCategory} className="p-6 space-y-4">
              <div className="portal-field">
                <label className="portal-label">Name <span className="text-red-500">*</span></label>
                <input required className="portal-input" placeholder="e.g. Apartment"
                  value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div className="portal-field">
                <label className="portal-label">Slug</label>
                <input className="portal-input font-mono text-xs" placeholder="auto-generated if empty"
                  value={catForm.slug} onChange={e=>setCatForm(f=>({...f,slug:e.target.value}))}/>
              </div>
              <div className="portal-field">
                <label className="portal-label">Description</label>
                <textarea rows={2} className="portal-input resize-none" placeholder="Optional description"
                  value={catForm.description} onChange={e=>setCatForm(f=>({...f,description:e.target.value}))}/>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setCatModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={catSaving} className="btn-primary flex-1 disabled:opacity-50">
                  {catSaving ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
                  {catSaving ? "Saving…" : catModal === "edit" ? "Save Changes" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Role / UserType Create Modal ─────────────────────────── */}
      {defModal && (
        <div className="modal-backdrop" onClick={e=>{if(e.target===e.currentTarget)setDefModal(null);}}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <h3 className="font-display text-xl text-brand-900">
                {defModal === "role" ? "New Custom Role" : "New Custom User Type"}
              </h3>
              <button onClick={()=>setDefModal(null)} className="btn-icon"><IcoX size={16}/></button>
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
                  value={defForm.name} onChange={e=>setDefForm(f=>({...f,name:e.target.value}))}/>
              </div>
              <div className="portal-field">
                <label className="portal-label">Description</label>
                <textarea rows={2} className="portal-input resize-none" placeholder="Optional description"
                  value={defForm.description} onChange={e=>setDefForm(f=>({...f,description:e.target.value}))}/>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={()=>setDefModal(null)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={defSaving} className="btn-primary flex-1 disabled:opacity-50">
                  {defSaving ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
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
