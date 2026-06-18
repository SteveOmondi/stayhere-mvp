import { FormEvent, useEffect, useState } from "react";
import { staticApi, ApiError } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import { IcoCategory, IcoPlus, IcoEdit, IcoTrash, IcoX, IcoCheck, IcoLoader, IcoRefresh } from "../components/icons";

type Category = {
  id: string;
  name: string;
  description?: string;
  country?: string;
  city?: string;
  isActive?: boolean;
  slug?: string;
  sortOrder?: number;
  parentId?: string;
  createdAt?: string;
};

function mapCat(x: unknown): Category | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = r.id ?? r.categoryId;
  if (!id) return null;
  return {
    id: String(id),
    name: String(r.name ?? r.categoryName ?? ""),
    description: r.description ? String(r.description) : undefined,
    country: r.country ? String(r.country) : undefined,
    city: r.city ? String(r.city) : undefined,
    isActive: typeof r.isActive === "boolean" ? r.isActive : true,
    slug: r.slug ? String(r.slug) : undefined,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : undefined,
    parentId: r.parentId ? String(r.parentId) : undefined,
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
  };
}

const EMPTY_FORM = { name: "", description: "", country: "Kenya", city: "Nairobi", slug: "", sortOrder: "" };

export function CategoriesPage() {
  const { toast, reloadKey } = usePortal();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await staticApi.categoriesAll();
      setCategories((Array.isArray(data) ? data : []).map(mapCat).filter(Boolean) as Category[]);
    } catch {
      try {
        const pub = await staticApi.categories();
        setCategories((Array.isArray(pub) ? pub : []).map(mapCat).filter(Boolean) as Category[]);
      } catch (e2) {
        toast(e2 instanceof ApiError ? e2.message : "Failed to load categories", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [reloadKey]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(c: Category) {
    setEditTarget(c);
    setForm({
      name: c.name,
      description: c.description ?? "",
      country: c.country ?? "Kenya",
      city: c.city ?? "Nairobi",
      slug: c.slug ?? "",
      sortOrder: c.sortOrder != null ? String(c.sortOrder) : "",
    });
    setShowModal(true);
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      name: form.name.trim(),
      country: form.country.trim() || "Kenya",
      city: form.city.trim() || "Nairobi",
    };
    if (form.description.trim()) body.description = form.description.trim();
    if (form.slug.trim()) body.slug = form.slug.trim();
    if (form.sortOrder.trim()) body.sortOrder = Number(form.sortOrder);
    try {
      if (editTarget) {
        await staticApi.updateCategory(editTarget.id, body);
        toast("Category updated.", "success");
      } else {
        await staticApi.createCategory(body);
        toast("Category created.", "success");
      }
      setShowModal(false);
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(c: Category) {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    setDeleting(c.id);
    try {
      await staticApi.deleteCategory(c.id);
      toast("Category deleted.", "success");
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = categories.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#c9a22718" }}>
              <IcoCategory size={17} style={{ color: "#c9a227" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Categories</h2>
          </div>
          <p className="text-sm text-brand-500">
            Static data service · {categories.length} categories registered
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm">
            <IcoRefresh size={14} /> Refresh
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <IcoPlus size={14} /> New Category
          </button>
        </div>
      </div>

      {/* Search + summary */}
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3">
          <input
            className="portal-input"
            placeholder="Search categories by name or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="portal-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#c9a22715" }}>
            <IcoCategory size={18} style={{ color: "#c9a227" }} />
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-900">{categories.length}</div>
            <div className="text-xs text-brand-500">Total categories</div>
          </div>
        </div>
      </div>

      {/* Categories grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="portal-card p-5 space-y-3">
              <div className="skeleton h-5 w-2/3" />
              <div className="skeleton h-3 w-full" />
              <div className="skeleton h-3 w-1/2" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="portal-card p-16 text-center">
          <IcoCategory size={40} className="text-brand-200 mx-auto mb-3" />
          <div className="font-semibold text-brand-700">
            {search ? "No matching categories" : "No categories yet"}
          </div>
          <div className="text-sm text-brand-400 mt-1 mb-4">
            {search ? "Try a different search term" : "Create the first category to get started"}
          </div>
          {!search && (
            <button onClick={openCreate} className="btn-primary text-sm">
              <IcoPlus size={14} /> Create First Category
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(c => (
            <div key={c.id} className="portal-card-hover p-5 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-brand-950"
                  style={{ background: "linear-gradient(135deg, #e8d48b40, #c9a22730)" }}>
                  {c.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => openEdit(c)} className="btn-icon hover:bg-blue-50 hover:text-blue-600">
                    <IcoEdit size={13} />
                  </button>
                  <button
                    onClick={() => void handleDelete(c)}
                    disabled={deleting === c.id}
                    className="btn-icon hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                  >
                    {deleting === c.id ? <IcoLoader size={13} /> : <IcoTrash size={13} />}
                  </button>
                </div>
              </div>

              <div className="font-semibold text-brand-900 mb-1">{c.name}</div>
              {c.description && (
                <div className="text-xs text-brand-500 line-clamp-2 mb-2">{c.description}</div>
              )}
              {(c.country || c.city) && (
                <div className="text-[10px] text-brand-400 mb-2">
                  {[c.city, c.country].filter(Boolean).join(", ")}
                </div>
              )}

              <div className="flex flex-wrap gap-1.5 mt-2">
                {c.isActive !== false
                  ? <span className="badge badge-success text-[10px]"><IcoCheck size={9} />Active</span>
                  : <span className="badge badge-neutral text-[10px]">Inactive</span>
                }
                {c.slug && <span className="badge badge-neutral text-[10px] font-mono">{c.slug}</span>}
                {c.sortOrder != null && <span className="badge badge-gold text-[10px]">#{c.sortOrder}</span>}
              </div>

              {c.id && (
                <div className="mt-3 pt-3 border-t border-black/[0.06] text-[10px] text-brand-400 font-mono truncate">
                  {c.id}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-panel max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div>
                <h3 className="font-display text-xl text-brand-900">
                  {editTarget ? "Edit Category" : "New Category"}
                </h3>
                <p className="text-xs text-brand-500 mt-0.5">Static Data Service</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon">
                <IcoX size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="portal-field">
                <label className="portal-label">Category Name <span className="text-red-500">*</span></label>
                <input
                  required
                  className="portal-input"
                  placeholder="e.g. Apartment, House, Studio"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              <div className="portal-field">
                <label className="portal-label">Description</label>
                <textarea
                  className="portal-input resize-none"
                  rows={3}
                  placeholder="Brief description of this category"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="portal-field">
                  <label className="portal-label">Country <span className="text-red-500">*</span></label>
                  <input
                    required
                    className="portal-input"
                    placeholder="e.g. Kenya"
                    value={form.country}
                    onChange={e => setForm(f => ({ ...f, country: e.target.value }))}
                  />
                </div>
                <div className="portal-field">
                  <label className="portal-label">City <span className="text-red-500">*</span></label>
                  <input
                    required
                    className="portal-input"
                    placeholder="e.g. Nairobi"
                    value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="portal-field">
                  <label className="portal-label">Slug</label>
                  <input
                    className="portal-input font-mono text-xs"
                    placeholder="e.g. apartment"
                    value={form.slug}
                    onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  />
                </div>
                <div className="portal-field">
                  <label className="portal-label">Sort Order</label>
                  <input
                    type="number"
                    className="portal-input"
                    placeholder="0"
                    value={form.sortOrder}
                    onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15} /> : <IcoCheck size={15} />}
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
