import { useEffect, useState, useCallback } from "react";
import { propertiesApi, listingsApi, uploadApi, uploadToR2, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import { IcoBuilding, IcoPlus, IcoMapPin, IcoListing, IcoChevRight, IcoX, IcoCheck, IcoLoader, IcoEdit, IcoRefresh } from "../components/icons";
import { LocationPicker } from "../components/LocationPicker";

type Prop = {
  id: string; buildingName: string; propertyCode?: string;
  city?: string; suburb?: string; totalUnits?: number; floors?: number;
  description?: string; primaryImageUrl?: string; images?: string[];
  latitude?: number; longitude?: number;
};
type PropWithStats = Prop & { listingCount: number; vacantCount: number };

function mapProp(x: unknown): Prop | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return {
    id: String(r.id),
    buildingName: String(r.buildingName ?? "Unnamed"),
    propertyCode: r.propertyCode ? String(r.propertyCode) : undefined,
    city: r.city ? String(r.city) : undefined,
    suburb: r.suburb ? String(r.suburb) : undefined,
    totalUnits: typeof r.totalUnits === "number" ? r.totalUnits : undefined,
    floors: typeof r.floors === "number" ? r.floors : undefined,
    description: r.description ? String(r.description) : undefined,
    primaryImageUrl: r.primaryImageUrl ? String(r.primaryImageUrl) : undefined,
    images: Array.isArray(r.images) ? r.images.map(String) : undefined,
    latitude: typeof r.latitude === "number" ? r.latitude : undefined,
    longitude: typeof r.longitude === "number" ? r.longitude : undefined,
  };
}

const IMGS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=75",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=75",
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=75",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=75",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=75",
];

const EMPTY_FORM = { buildingName: "", country: "Kenya", county: "", city: "", suburb: "", street: "", description: "", totalUnits: "", totalFloors: "" };

// Image slot type
type ImgSlot = { file?: File; url?: string; uploading: boolean; error?: string };
const EMPTY_IMG = (): ImgSlot => ({ uploading: false });

export function PropertiesPage() {
  const { owner, userId, toast, reloadKey } = useOwner();
  const [props, setProps]   = useState<PropWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]   = useState<"create"|"edit"|null>(null);
  const [editTarget, setEditTarget] = useState<PropWithStats | null>(null);
  const [form, setForm]     = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });

  // Image state
  const [primaryImg, setPrimaryImg] = useState<ImgSlot>(EMPTY_IMG());
  const [extraImgs, setExtraImgs] = useState<ImgSlot[]>([EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG()]);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await propertiesApi.byOwner(userId, 1, 50);
      const pg = asPaginated<unknown>(data);
      const raw = (pg?.items ?? (Array.isArray(data) ? data : [])) as unknown[];
      const mapped = raw.map(mapProp).filter(Boolean) as Prop[];
      // Fetch listing counts for each property in parallel
      const withStats = await Promise.all(mapped.map(async p => {
        try {
          const ld = await listingsApi.byProperty(p.id, 1, 100);
          const lpg = asPaginated<unknown>(ld);
          const items = lpg?.items ?? (Array.isArray(ld) ? ld : []) as unknown[];
          const vacant = items.filter((l: unknown) => { const r = l as Record<string,unknown>; return r.isAvailable !== false && r.isOccupied !== true; }).length;
          return { ...p, listingCount: lpg?.totalCount ?? items.length, vacantCount: vacant };
        } catch { return { ...p, listingCount: 0, vacantCount: 0 }; }
      }));
      setProps(withStats);
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed to load properties", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reloadKey, userId]);

  async function uploadImage(file: File): Promise<string> {
    const contentType = file.type || "image/jpeg";
    const { uploadUrl, publicUrl, contentType: signedContentType } =
      await uploadApi.getPresignedUrl("properties/images", file.name, contentType);
    await uploadToR2(uploadUrl, file, signedContentType);
    return publicUrl;
  }

  async function handlePrimaryImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryImg({ file, uploading: true });
    try {
      const url = await uploadImage(file);
      setPrimaryImg({ file, url, uploading: false });
    } catch (err) {
      setPrimaryImg({ file, uploading: false, error: String(err) });
      toast("Image upload failed", "error");
    }
  }

  async function handleExtraImageChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setExtraImgs(imgs => imgs.map((img, i) => i === idx ? { file, uploading: true } : img));
    try {
      const url = await uploadImage(file);
      setExtraImgs(imgs => imgs.map((img, i) => i === idx ? { file, url, uploading: false } : img));
    } catch (err) {
      setExtraImgs(imgs => imgs.map((img, i) => i === idx ? { ...img, uploading: false, error: String(err) } : img));
      toast("Image upload failed", "error");
    }
  }

  function resetImageState() {
    setPrimaryImg(EMPTY_IMG());
    setExtraImgs([EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG()]);
  }

  function openCreateModal() {
    setModal("create");
    setForm(EMPTY_FORM);
    setEditTarget(null);
    setCoords({ lat: null, lng: null });
    resetImageState();
  }

  function openEditModal(p: PropWithStats) {
    setEditTarget(p);
    setForm({
      buildingName: p.buildingName,
      city: p.city ?? "",
      county: p.city ?? "",
      suburb: p.suburb ?? "",
      street: "",
      description: p.description ?? "",
      totalUnits: p.totalUnits?.toString() ?? "",
      totalFloors: p.floors?.toString() ?? "",
      country: "Kenya",
    });
    setCoords({ lat: p.latitude ?? null, lng: p.longitude ?? null });
    // Pre-populate existing images
    setPrimaryImg(p.primaryImageUrl ? { url: p.primaryImageUrl, uploading: false } : EMPTY_IMG());
    const existingExtras = p.images ?? [];
    setExtraImgs([
      existingExtras[0] ? { url: existingExtras[0], uploading: false } : EMPTY_IMG(),
      existingExtras[1] ? { url: existingExtras[1], uploading: false } : EMPTY_IMG(),
      existingExtras[2] ? { url: existingExtras[2], uploading: false } : EMPTY_IMG(),
      existingExtras[3] ? { url: existingExtras[3], uploading: false } : EMPTY_IMG(),
    ]);
    setModal("edit");
  }

  function closeModal() {
    setModal(null);
    setForm(EMPTY_FORM);
    setCoords({ lat: null, lng: null });
    resetImageState();
  }

  const handleCoordsChange = useCallback((lat: number, lng: number) => {
    setCoords({ lat, lng });
  }, []);

  const handleCoordsClear = useCallback(() => {
    setCoords({ lat: null, lng: null });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!owner?.id) return;
    setSaving(true);
    const body: Record<string, unknown> = {
      buildingName: form.buildingName.trim(),
      description: form.description.trim() || undefined,
      totalUnits: Number(form.totalUnits) || 1,
      totalFloors: Number(form.totalFloors) || 1,
      location: {
        country: form.country || "Kenya",
        county: form.county.trim() || form.city.trim(),
        city: form.city.trim(),
        suburb: form.suburb.trim() || undefined,
        street: form.street.trim() || undefined,
        latitude: coords.lat ?? undefined,
        longitude: coords.lng ?? undefined,
      },
      primaryImageUrl: primaryImg.url || undefined,
      images: extraImgs.filter(img => img.url).map(img => img.url!),
    };
    try {
      if (modal === "edit" && editTarget) {
        await propertiesApi.update(editTarget.id, body);
        toast("Property updated.", "success");
      } else {
        await propertiesApi.create(body);
        toast("Property created.", "success");
      }
      closeModal(); void load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl text-brand-900">My Properties</h2>
          <p className="text-sm text-brand-500 mt-1">{props.length} buildings in your portfolio</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm"><IcoRefresh size={14}/>Refresh</button>
          <button onClick={openCreateModal} className="btn-teal text-sm"><IcoPlus size={14}/>Add Property</button>
        </div>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">{Array.from({length:3}).map((_,i)=>(
          <div key={i} className="card overflow-hidden"><div className="skeleton h-44"/><div className="p-4 space-y-2"><div className="skeleton h-5 w-2/3"/><div className="skeleton h-3 w-1/2"/></div></div>
        ))}</div>
      ) : props.length === 0 ? (
        <div className="card p-16 text-center">
          <IcoBuilding size={40} className="mx-auto mb-3 text-brand-200"/>
          <div className="font-semibold text-brand-700 mb-2">No properties yet</div>
          <button onClick={openCreateModal} className="btn-teal text-sm"><IcoPlus size={14}/>Add Your First Property</button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 stagger">
          {props.map((p, i) => (
            <div key={p.id} className="property-card animate-slide-up">
              <div className="relative h-44 overflow-hidden">
                <img src={p.primaryImageUrl || IMGS[i % IMGS.length]} alt={p.buildingName} className="h-44 w-full object-cover" />
                <div className="absolute inset-0" style={{background:"linear-gradient(to top, rgba(12,18,34,0.75) 0%, transparent 60%)"}}/>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <div className="text-white font-bold text-sm leading-tight">{p.buildingName}</div>
                    {(p.city || p.suburb) && <div className="flex items-center gap-1 text-white/70 text-[10px] mt-0.5"><IcoMapPin size={9}/>{[p.suburb, p.city].filter(Boolean).join(", ")}</div>}
                  </div>
                  {p.propertyCode && <span className="badge badge-teal text-[9px] font-mono shrink-0">{p.propertyCode}</span>}
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 divide-x divide-black/[0.06] mb-4">
                  {[
                    { label: "Units",   val: p.listingCount ?? p.totalUnits ?? "–" },
                    { label: "Vacant",  val: p.vacantCount },
                    { label: "Floors",  val: p.floors ?? "–" },
                  ].map(s => (
                    <div key={s.label} className="text-center px-2 first:pl-0 last:pr-0">
                      <div className="text-lg font-bold text-brand-900">{s.val}</div>
                      <div className="text-[10px] text-brand-400 uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>
                {p.description && <p className="text-xs text-brand-500 line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex gap-2">
                  <button onClick={() => openEditModal(p)}
                    className="btn-secondary text-xs flex-1 justify-center py-2"><IcoEdit size={12}/>Edit</button>
                  <button className="btn-teal text-xs flex-1 justify-center py-2"><IcoListing size={12}/>Listings<IcoChevRight size={11}/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-box max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <h3 className="font-display text-xl text-brand-900">{modal === "edit" ? "Edit Property" : "New Property"}</h3>
              <button onClick={closeModal} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="field"><label className="field-label">Building Name *</label><input required className="input" placeholder="e.g. Kasa Flats" value={form.buildingName} onChange={e=>setForm(f=>({...f,buildingName:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">City *</label><input required className="input" placeholder="Nairobi" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/></div>
                <div className="field"><label className="field-label">County *</label><input required className="input" placeholder="Nairobi County" value={form.county} onChange={e=>setForm(f=>({...f,county:e.target.value}))}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">Suburb</label><input className="input" placeholder="Kasarani" value={form.suburb} onChange={e=>setForm(f=>({...f,suburb:e.target.value}))}/></div>
                <div className="field"><label className="field-label">Street Address</label><input className="input" placeholder="e.g. Mwiki Road" value={form.street} onChange={e=>setForm(f=>({...f,street:e.target.value}))}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">Total Units *</label><input required type="number" min="1" className="input" placeholder="e.g. 24" value={form.totalUnits} onChange={e=>setForm(f=>({...f,totalUnits:e.target.value}))}/></div>
                <div className="field"><label className="field-label">Total Floors *</label><input required type="number" min="1" className="input" placeholder="e.g. 4" value={form.totalFloors} onChange={e=>setForm(f=>({...f,totalFloors:e.target.value}))}/></div>
              </div>
              <div className="field"><label className="field-label">Description</label><textarea className="input" rows={3} placeholder="Brief description of the property…" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>

              {/* Location pin */}
              <div className="field">
                <label className="field-label">Map Location <span className="text-brand-400 font-normal">(optional — set now or update later)</span></label>
                <LocationPicker
                  lat={coords.lat}
                  lng={coords.lng}
                  onChange={handleCoordsChange}
                  onClear={handleCoordsClear}
                />
              </div>

              {/* Primary Image */}
              <div className="field">
                <label className="field-label">Primary Image <span className="text-red-400">*</span></label>
                <div className="flex items-start gap-3">
                  {primaryImg.url ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-black/[0.08]">
                      <img src={primaryImg.url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setPrimaryImg(EMPTY_IMG())}
                        className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs">×</button>
                    </div>
                  ) : (
                    <label className="w-20 h-20 rounded-xl border-2 border-dashed border-brand-teal/30 flex flex-col items-center justify-center cursor-pointer hover:border-brand-teal/60 transition shrink-0">
                      {primaryImg.uploading ? <IcoLoader size={18} className="text-brand-teal animate-spin"/> : <IcoPlus size={20} className="text-brand-teal"/>}
                      <input type="file" accept="image/*" className="hidden" onChange={handlePrimaryImageChange} disabled={primaryImg.uploading}/>
                      <span className="text-[10px] text-brand-400 mt-1">{primaryImg.uploading ? "Uploading…" : "Upload"}</span>
                    </label>
                  )}
                  <p className="text-xs text-brand-500 leading-relaxed mt-1">Required. Shown as the cover image. Upload to Cloudflare CDN.</p>
                </div>
                {primaryImg.error && <p className="text-xs text-red-400 mt-1">{primaryImg.error}</p>}
              </div>

              {/* Extra Images */}
              <div className="field">
                <label className="field-label">Additional Images <span className="text-brand-400">(up to 4)</span></label>
                <div className="flex gap-2 flex-wrap">
                  {extraImgs.map((img, idx) => (
                    img.url ? (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-black/[0.08]">
                        <img src={img.url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setExtraImgs(imgs => imgs.map((im, i) => i === idx ? EMPTY_IMG() : im))}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs">×</button>
                      </div>
                    ) : (
                      <label key={idx} className="w-16 h-16 rounded-xl border-2 border-dashed border-black/[0.10] flex items-center justify-center cursor-pointer hover:border-brand-teal/40 transition">
                        {img.uploading ? <IcoLoader size={14} className="text-brand-teal animate-spin"/> : <IcoPlus size={16} className="text-brand-400"/>}
                        <input type="file" accept="image/*" className="hidden" onChange={e => void handleExtraImageChange(idx, e)} disabled={img.uploading}/>
                      </label>
                    )
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-teal flex-1 disabled:opacity-50">
                  {saving ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
                  {saving ? "Saving…" : modal === "edit" ? "Save Changes" : "Create Property"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
