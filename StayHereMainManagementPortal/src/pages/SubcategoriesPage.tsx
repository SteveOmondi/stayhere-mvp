import { FormEvent, useEffect, useState } from "react";
import { staticApi, ApiError } from "../lib/api";
import { usePortal } from "../context/PortalContext";
import { IcoCategory, IcoPlus, IcoEdit, IcoTrash, IcoX, IcoCheck, IcoLoader, IcoRefresh } from "../components/icons";

type Category = { id: string; name: string; slug?: string };
type Subcategory = {
  id: string;
  categoryId?: string;
  name: string;
  description?: string;
  country: string;
  city: string;
  isActive: boolean;
  slug?: string;
  sortOrder?: number;
  createdAt?: string;
};

function mapCat(x: unknown): Category | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  const id = r.id ?? r.categoryId;
  if (!id) return null;
  return { id: String(id), name: String(r.name ?? r.categoryName ?? ""), slug: r.slug ? String(r.slug) : undefined };
}

function mapSub(x: unknown): Subcategory | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return {
    id: String(r.id),
    categoryId: r.categoryId ? String(r.categoryId) : undefined,
    name: String(r.name ?? ""),
    description: r.description ? String(r.description) : undefined,
    country: String(r.country ?? "Kenya"),
    city: String(r.city ?? "Nairobi"),
    isActive: typeof r.isActive === "boolean" ? r.isActive : true,
    slug: r.slug ? String(r.slug) : undefined,
    sortOrder: typeof r.sortOrder === "number" ? r.sortOrder : undefined,
    createdAt: r.createdAt ? String(r.createdAt) : undefined,
  };
}

const EMPTY_FORM = {
  categoryId: "",
  name: "",
  description: "",
  country: "Kenya",
  city: "Nairobi",
  slug: "",
  sortOrder: "",
  isActive: true,
};

export function SubcategoriesPage() {
  const { toast, reloadKey } = usePortal();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<Subcategory | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const loadCategories = async () => {
    try {
      const data = await staticApi.categoriesAll();
      setCategories((Array.isArray(data) ? data : []).map(mapCat).filter(Boolean) as Category[]);
    } catch {
      try {
        const pub = await staticApi.categories();
        setCategories((Array.isArray(pub) ? pub : []).map(mapCat).filter(Boolean) as Category[]);
      } catch { /* non-fatal */ }
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const data = await staticApi.subcategoriesAll();
      setSubcategories((Array.isArray(data) ? data : []).map(mapSub).filter(Boolean) as Subcategory[]);
    } catch {
      try {
        const pub = await staticApi.subcategories();
        setSubcategories((Array.isArray(pub) ? pub : []).map(mapSub).filter(Boolean) as Subcategory[]);
      } catch (e2) {
        toast(e2 instanceof ApiError ? e2.message : "Failed to load subcategories", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void loadCategories(); void load(); }, [reloadKey]);

  function openCreate() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(s: Subcategory) {
    setEditTarget(s);
    setForm({
      categoryId: s.categoryId ?? "",
      name: s.name,
      description: s.description ?? "",
      country: s.country,
      city: s.city,
      slug: s.slug ?? "",
      sortOrder: s.sortOrder != null ? String(s.sortOrder) : "",
      isActive: s.isActive,
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
      isActive: form.isActive,
    };
    if (form.categoryId) body.categoryId = form.categoryId;
    if (form.description.trim()) body.description = form.description.trim();
    if (form.slug.trim()) body.slug = form.slug.trim();
    if (form.sortOrder.trim()) body.sortOrder = Number(form.sortOrder);
    try {
      if (editTarget) {
        await staticApi.updateSubcategory(editTarget.id, body);
        toast("Subcategory updated.", "success");
      } else {
        await staticApi.createSubcategory(body);
        toast("Subcategory created.", "success");
      }
      setShowModal(false);
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(s: Subcategory) {
    if (!confirm(`Deactivate subcategory "${s.name}"?`)) return;
    setDeleting(s.id);
    try {
      await staticApi.deleteSubcategory(s.id);
      toast("Subcategory deactivated.", "success");
      void load();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Delete failed", "error");
    } finally {
      setDeleting(null);
    }
  }

  function categoryName(id?: string) {
    if (!id) return null;
    return categories.find(c => c.id === id)?.name ?? null;
  }

  const filtered = subcategories.filter(s => {
    const matchSearch = !search ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.description?.toLowerCase().includes(search.toLowerCase()) ||
      s.city.toLowerCase().includes(search.toLowerCase()) ||
      s.country.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategoryId || s.categoryId === filterCategoryId;
    return matchSearch && matchCat;
  });

  const activeCount = subcategories.filter(s => s.isActive).length;

  return (
    <div className="space-y-5 animate-slide-up">

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#c9a22718" }}>
              <IcoCategory size={17} style={{ color: "#c9a227" }} />
            </div>
            <h2 className="font-display text-3xl text-brand-900">Subcategories</h2>
          </div>
          <p className="text-sm text-brand-500">
            Static data service · {subcategories.length} total, {activeCount} active
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm">
            <IcoRefresh size={14} /> Refresh
          </button>
          <button onClick={openCreate} className="btn-primary text-sm">
            <IcoPlus size={14} /> New Subcategory
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid lg:grid-cols-4 gap-4">
        <div className="lg:col-span-2">
          <input
            className="portal-input"
            placeholder="Search by name, city, country or description…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div>
          <select
            className="portal-input"
            value={filterCategoryId}
            onChange={e => setFilterCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="portal-card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: "#c9a22715" }}>
            <IcoCategory size={18} style={{ color: "#c9a227" }} />
          </div>
          <div>
            <div className="text-2xl font-bold text-brand-900">{subcategories.length}</div>
            <div className="text-xs text-brand-500">Total subcategories</div>
          </div>
        </div>
      </div>

      {/* Grid */}
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
            {search || filterCategoryId ? "No matching subcategories" : "No subcategories yet"}
          </div>
          <div className="text-sm text-brand-400 mt-1 mb-4">
            {search || filterCategoryId
              ? "Try clearing the filters"
              : "Create the first subcategory to get started"}
          </div>
          {!search && !filterCategoryId && (
            <button onClick={openCreate} className="btn-primary text-sm">
              <IcoPlus size={14} /> Create First Subcategory
            </button>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(s => {
            const catName = categoryName(s.categoryId);
            return (
              <div key={s.id} className="portal-card-hover p-5 group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-brand-950"
                    style={{ background: "linear-gradient(135deg, #e8d48b40, #c9a22730)" }}>
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEdit(s)} className="btn-icon hover:bg-blue-50 hover:text-blue-600">
                      <IcoEdit size={13} />
                    </button>
                    <button
                      onClick={() => void handleDelete(s)}
                      disabled={deleting === s.id}
                      className="btn-icon hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                    >
                      {deleting === s.id ? <IcoLoader size={13} /> : <IcoTrash size={13} />}
                    </button>
                  </div>
                </div>

                <div className="font-semibold text-brand-900 mb-1">{s.name}</div>
                {s.description && (
                  <div className="text-xs text-brand-500 line-clamp-2 mb-2">{s.description}</div>
                )}
                <div className="text-[10px] text-brand-400 mb-2">
                  {[s.city, s.country].filter(Boolean).join(", ")}
                </div>

                <div className="flex flex-wrap gap-1.5 mt-2">
                  {s.isActive
                    ? <span className="badge badge-success text-[10px]"><IcoCheck size={9} />Active</span>
                    : <span className="badge badge-neutral text-[10px]">Inactive</span>
                  }
                  {catName && (
                    <span className="badge badge-gold text-[10px]">{catName}</span>
                  )}
                  {s.slug && <span className="badge badge-neutral text-[10px] font-mono">{s.slug}</span>}
                  {s.sortOrder != null && <span className="badge badge-neutral text-[10px]">#{s.sortOrder}</span>}
                </div>

                <div className="mt-3 pt-3 border-t border-black/[0.06] text-[10px] text-brand-400 font-mono truncate">
                  {s.id}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-panel max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <div>
                <h3 className="font-display text-xl text-brand-900">
                  {editTarget ? "Edit Subcategory" : "New Subcategory"}
                </h3>
                <p className="text-xs text-brand-500 mt-0.5">Static Data Service</p>
              </div>
              <button onClick={() => setShowModal(false)} className="btn-icon">
                <IcoX size={16} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">

              {/* Category dropdown — required */}
              <div className="portal-field">
                <label className="portal-label">
                  Parent Category <span className="text-red-500">*</span>
                </label>
                {categories.length === 0 ? (
                  <div className="portal-input text-brand-400 text-sm flex items-center gap-2">
                    <IcoLoader size={14} /> Loading categories…
                  </div>
                ) : (
                  <select
                    required
                    className="portal-input"
                    value={form.categoryId}
                    onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}
                  >
                    <option value="">Select a category…</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name}{c.slug ? ` (${c.slug})` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Name */}
              <div className="portal-field">
                <label className="portal-label">
                  Subcategory Name <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  className="portal-input"
                  placeholder="e.g. Bedsitter, 1-Bedroom, Penthouse"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div className="portal-field">
                <label className="portal-label">Description</label>
                <textarea
                  className="portal-input resize-none"
                  rows={2}
                  placeholder="Brief description of this subcategory"
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>

              {/* Country / City */}
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

              {/* Slug / Sort Order */}
              <div className="grid grid-cols-2 gap-4">
                <div className="portal-field">
                  <label className="portal-label">Slug</label>
                  <input
                    className="portal-input font-mono text-xs"
                    placeholder="e.g. bedsitter"
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

              {/* Active toggle — only meaningful on edit */}
              {editTarget && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-black/[0.07] bg-slate-50/60">
                  <div>
                    <div className="text-sm font-medium text-brand-900">Active</div>
                    <div className="text-[11px] text-brand-400">Inactive subcategories are hidden from listings</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, isActive: !f.isActive }))}
                    className={`relative w-10 h-5 rounded-full transition-colors ${form.isActive ? "bg-emerald-500" : "bg-brand-200"}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.isActive ? "translate-x-5" : "translate-x-0.5"}`} />
                  </button>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15} /> : <IcoCheck size={15} />}
                  {saving ? "Saving…" : editTarget ? "Save Changes" : "Create Subcategory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
