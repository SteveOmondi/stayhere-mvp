import { useState, useEffect } from "react";
import {
  listingsApi, propertiesApi, staticApi, uploadApi, uploadToR2,
  termsApi, ApiError,
} from "../lib/api";
import type { UpsertTermsBody } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import { IcoX, IcoPlus, IcoLoader, IcoCheck } from "./icons";
import { StructuredImageUploader } from "./StructuredImageUploader";
import type { ImageSection } from "./StructuredImageUploader";

/* ─── types ─── */
type PropertyOption = { id: string; buildingName: string; sharedAmenities?: string[] };
type CategoryOption = { id: string; name: string };
type SubcategoryOption = { id: string; name: string };
type ImgSlot = { file?: File; url?: string; uploading: boolean; error?: string };

export type ListingFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Pass when editing an existing listing */
  editListing?: { id: string; propertyId?: string };
  /** Pass to pre-select + lock a property (e.g. opening from the property drawer) */
  lockedProperty?: { id: string; buildingName: string; sharedAmenities?: string[] };
};

/* ─── constants ─── */
const LISTING_IMAGE_SECTIONS: ImageSection[] = [
  { key: "exterior",   label: "Exterior" },
  { key: "livingRoom", label: "Living Room" },
  { key: "kitchen",    label: "Kitchen" },
  { key: "diningArea", label: "Dining Area" },
  { key: "bedroom",    label: "Bedroom" },
  { key: "bathroom",   label: "Bathroom" },
  { key: "balcony",    label: "Balcony" },
  { key: "other",      label: "Other" },
];

const PROPERTY_TYPES = ["Apartment", "House", "Studio", "Bedsitter", "Commercial"];
const LISTING_TYPES  = ["Rent", "Sale", "ShortStay", "Lease"];

const EMPTY_FORM = {
  propertyId: "", title: "", price: "", bedrooms: "1", bathrooms: "1",
  propertyType: "Apartment", listingType: "Rent", description: "",
  unitNumber: "", floorNumber: "0", sizeSqft: "",
  categoryId: "", subcategoryId: "",
};

const EMPTY_TERMS = {
  minLeasePeriod: "", noticePeriod: "",
  securityDeposit: "", waterDeposit: "", electricityDeposit: "",
  tokenDeposit: "", garbageDeposit: "", adminFee: "",
  mpesaPaybill: "", mpesaTill: "", mpesaAccountNumber: "",
  bankName: "", bankAccountName: "", bankAccountNumber: "", bankBranch: "",
};

const EMPTY_IMG = (): ImgSlot => ({ uploading: false });

const emptyStructured = (): Record<string, string[]> =>
  Object.fromEntries(LISTING_IMAGE_SECTIONS.map(s => [s.key, []]));

function buildTermsBody(t: typeof EMPTY_TERMS): UpsertTermsBody | null {
  const hasAny = Object.values(t).some(v => v.trim() !== "");
  if (!hasAny) return null;
  return {
    noticePeriod:       t.noticePeriod       || undefined,
    minimumLeasePeriod: t.minLeasePeriod      || undefined,
    securityDeposit:    t.securityDeposit    ? Number(t.securityDeposit)    : undefined,
    adminFee:           t.adminFee           ? Number(t.adminFee)           : undefined,
    waterDeposit:       t.waterDeposit       ? Number(t.waterDeposit)       : undefined,
    electricityDeposit: t.electricityDeposit ? Number(t.electricityDeposit) : undefined,
    tokenDeposit:       t.tokenDeposit       ? Number(t.tokenDeposit)       : undefined,
    garbageDeposit:     t.garbageDeposit     ? Number(t.garbageDeposit)     : undefined,
    mpesaPaybill:       t.mpesaPaybill       || undefined,
    mpesaTill:          t.mpesaTill          || undefined,
    mpesaAccountNumber: t.mpesaAccountNumber || undefined,
    bankName:           t.bankName           || undefined,
    bankAccountName:    t.bankAccountName    || undefined,
    bankAccountNumber:  t.bankAccountNumber  || undefined,
    bankBranch:         t.bankBranch         || undefined,
  };
}

/* ═══════════════════════════════════════════════════
   ListingFormModal
══════════════════════════════════════════════════════ */
export function ListingFormModal({
  open, onClose, onSaved, editListing, lockedProperty,
}: ListingFormModalProps) {
  const { owner, toast } = useOwner();
  const isEdit = !!editListing;

  /* ── form state ── */
  const [form, setForm]   = useState(EMPTY_FORM);
  const [structuredImages, setStructuredImages] = useState<Record<string, string[]>>(emptyStructured);
  const [terms, setTerms] = useState(EMPTY_TERMS);
  const [termsOpen, setTermsOpen] = useState(false);
  const [primaryImg, setPrimaryImg] = useState<ImgSlot>(EMPTY_IMG());
  const [inheritedAmenities, setInheritedAmenities] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  /* ── edit-mode extras ── */
  const [editLoading, setEditLoading] = useState(false);
  const [editTermsId, setEditTermsId] = useState<string | null>(null);

  /* ── reference data ── */
  const [properties, setProperties]   = useState<PropertyOption[]>([]);
  const [categories, setCategories]   = useState<CategoryOption[]>([]);
  const [subcategories, setSubcategories] = useState<SubcategoryOption[]>([]);

  /* ── reset whenever the modal opens ── */
  function reset() {
    setForm(EMPTY_FORM);
    setStructuredImages(emptyStructured());
    setTerms(EMPTY_TERMS);
    setTermsOpen(false);
    setPrimaryImg(EMPTY_IMG());
    setInheritedAmenities([]);
    setEditTermsId(null);
    setSubcategories([]);
  }

  /* ── load reference data + (if edit) full listing details ── */
  useEffect(() => {
    if (!open || !owner?.id) return;
    reset();

    // Load properties + categories in parallel
    Promise.allSettled([
      propertiesApi.byOwner(owner.id, 1, 50),
      staticApi.categories(),
    ]).then(([pd, cats]) => {
      if (pd.status === "fulfilled") {
        const pg = asPaginated<unknown>(pd.value);
        const raw = (pg?.items ?? (Array.isArray(pd.value) ? pd.value : [])) as unknown[];
        setProperties(raw.map(x => {
          const r = x as Record<string, unknown>;
          return {
            id: String(r.id),
            buildingName: String(r.buildingName ?? ""),
            sharedAmenities: Array.isArray(r.sharedAmenities) ? r.sharedAmenities.map(String) : [],
          };
        }));
      }
      if (cats.status === "fulfilled" && Array.isArray(cats.value)) {
        setCategories(cats.value.map(x => {
          const r = x as Record<string, unknown>;
          return { id: String(r.id), name: String(r.name ?? "") };
        }));
      }
    });

    // Pre-seed the property if locked
    if (lockedProperty) {
      setForm(f => ({ ...f, propertyId: lockedProperty.id }));
      setInheritedAmenities(lockedProperty.sharedAmenities ?? []);
    }

    // Load full listing when editing
    if (isEdit && editListing) {
      setEditLoading(true);
      listingsApi.get(editListing.id).then(full => {
        const r      = full as Record<string, unknown>;
        const unit   = r.unit     as Record<string, unknown> | undefined;
        const pricing= r.pricing  as Record<string, unknown> | undefined;
        const imgs   = r.images   as Record<string, unknown> | undefined;
        const prop   = r.property as Record<string, unknown> | undefined;
        const cat    = r.category as Record<string, unknown> | undefined;
        const sub    = r.subcategory as Record<string, unknown> | undefined;

        setForm({
          propertyId:    prop?.id ? String(prop.id) : (editListing.propertyId ?? ""),
          title:         String(r.title ?? ""),
          price:         String((pricing?.price as number | undefined) ?? ""),
          bedrooms:      String(unit?.bedrooms ?? "1"),
          bathrooms:     String(unit?.bathrooms ?? "1"),
          propertyType:  String(unit?.propertyType ?? "Apartment"),
          listingType:   String(unit?.listingType  ?? "Rent"),
          description:   String(r.description ?? ""),
          unitNumber:    String(unit?.number ?? ""),
          floorNumber:   String(unit?.floor  ?? "0"),
          sizeSqft:      unit?.sizeSqft != null ? String(unit.sizeSqft) : "",
          categoryId:    cat?.id ? String(cat.id) : "",
          subcategoryId: sub?.id ? String(sub.id) : "",
        });

        setPrimaryImg(imgs?.primary ? { url: String(imgs.primary), uploading: false } : EMPTY_IMG());

        const structured = emptyStructured();
        if (imgs) {
          for (const sec of LISTING_IMAGE_SECTIONS) {
            const v = (imgs as Record<string, unknown>)[sec.key];
            if (Array.isArray(v)) structured[sec.key] = v.map(String);
          }
        }
        setStructuredImages(structured);

        // Load existing terms (may 404 if none yet)
        return termsApi.getByListing(editListing.id)
          .then(t => {
            setEditTermsId(t.id);
            setTerms({
              minLeasePeriod:     t.minimumLeasePeriod  ?? "",
              noticePeriod:       t.noticePeriod         ?? "",
              securityDeposit:    t.securityDeposit    != null ? String(t.securityDeposit)    : "",
              waterDeposit:       t.waterDeposit       != null ? String(t.waterDeposit)       : "",
              electricityDeposit: t.electricityDeposit != null ? String(t.electricityDeposit) : "",
              tokenDeposit:       t.tokenDeposit       != null ? String(t.tokenDeposit)       : "",
              garbageDeposit:     t.garbageDeposit     != null ? String(t.garbageDeposit)     : "",
              adminFee:           t.adminFee           != null ? String(t.adminFee)           : "",
              mpesaPaybill:       t.mpesaPaybill        ?? "",
              mpesaTill:          t.mpesaTill           ?? "",
              mpesaAccountNumber: t.mpesaAccountNumber  ?? "",
              bankName:           t.bankName            ?? "",
              bankAccountName:    t.bankAccountName     ?? "",
              bankAccountNumber:  t.bankAccountNumber   ?? "",
              bankBranch:         t.bankBranch          ?? "",
            });
            if (Object.values(t).some(v => v)) setTermsOpen(true);
          })
          .catch(() => { /* no terms yet — fine */ });
      })
      .catch(() => { toast("Failed to load listing details", "error"); onClose(); })
      .finally(() => setEditLoading(false));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editListing?.id, lockedProperty?.id]);

  /* ── load subcategories when category changes ── */
  useEffect(() => {
    if (!form.categoryId || !open) { setSubcategories([]); return; }
    staticApi.subcategoriesByCategory(form.categoryId)
      .then(data => {
        if (Array.isArray(data))
          setSubcategories(data.map(x => {
            const r = x as Record<string, unknown>;
            return { id: String(r.id), name: String(r.name ?? "") };
          }));
      })
      .catch(() => setSubcategories([]));
  }, [form.categoryId, open]);

  /* ── update inherited amenities when property selection changes ── */
  useEffect(() => {
    if (!open) return;
    if (lockedProperty) {
      setInheritedAmenities(lockedProperty.sharedAmenities ?? []);
      return;
    }
    const prop = properties.find(p => p.id === form.propertyId);
    setInheritedAmenities(prop?.sharedAmenities ?? []);
  }, [form.propertyId, properties, lockedProperty, open]);

  /* ── image upload helper ── */
  async function uploadImage(file: File): Promise<string> {
    const ct = file.type || "image/jpeg";
    const { uploadUrl, publicUrl, contentType: sCt } =
      await uploadApi.getPresignedUrl("properties/images", file.name, ct);
    await uploadToR2(uploadUrl, file, sCt);
    return publicUrl;
  }

  async function handlePrimaryImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPrimaryImg({ file, uploading: true });
    try {
      setPrimaryImg({ file, url: await uploadImage(file), uploading: false });
    } catch {
      setPrimaryImg({ file, uploading: false, error: "Upload failed" });
      toast("Image upload failed", "error");
    }
  }

  /* ── form submit ── */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const propertyId = lockedProperty?.id ?? form.propertyId;
    if (!isEdit && !propertyId) { toast("Select a property first", "error"); return; }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title:        form.title.trim(),
        price:        Number(form.price),
        priceCurrency:"KES",
        bedrooms:     Number(form.bedrooms),
        bathrooms:    Number(form.bathrooms),
        sizeSqft:     form.sizeSqft ? Number(form.sizeSqft) : undefined,
        propertyType: form.propertyType,
        listingType:  form.listingType,
        description:  form.description.trim(),
        unitNumber:   form.unitNumber.trim() || "N/A",
        floorNumber:  Number(form.floorNumber) || 0,
        owner: { name: owner?.fullName ?? "", phone: owner?.phone ?? "", email: owner?.email ?? "" },
        primaryImageUrl: primaryImg.url || undefined,
        images: [],
        structuredImages,
        categoryId:    form.categoryId    || undefined,
        subcategoryId: form.subcategoryId || undefined,
      };

      let listingId: string;
      if (isEdit && editListing) {
        await listingsApi.update(editListing.id, body);
        listingId = editListing.id;
        toast("Listing updated.", "success");
      } else {
        const created = await listingsApi.createFromProperty(propertyId, body) as Record<string, unknown>;
        listingId = String(created.id ?? "");
        toast("Listing created!", "success");
      }

      // Save terms if any field is filled
      const termsBody = buildTermsBody(terms);
      if (termsBody && listingId) {
        if (editTermsId) {
          await termsApi.update(listingId, editTermsId, termsBody);
        } else {
          await termsApi.create(listingId, { title: form.title.trim() || "Lease Terms", ...termsBody });
        }
      }

      onSaved();
      onClose();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const title = isEdit ? "Edit Listing" : lockedProperty ? `New Listing · ${lockedProperty.buildingName}` : "New Listing";

  return (
    <div className="modal-bg" style={{ zIndex: 60 }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box max-w-lg w-full">
        <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
          <h3 className="font-display text-xl text-brand-900 truncate pr-4">{title}</h3>
          <button onClick={onClose} className="btn-icon shrink-0"><IcoX size={16}/></button>
        </div>

        {editLoading ? (
          <div className="p-12 flex items-center justify-center gap-2 text-brand-400 text-sm">
            <IcoLoader size={18} className="animate-spin text-brand-teal"/>Loading listing…
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">

            {/* Property selector — hidden when property is locked */}
            {!lockedProperty && (
              <div className="field">
                <label className="field-label">Property *</label>
                <select required className="select" value={form.propertyId}
                  disabled={isEdit}
                  onChange={e => setForm(f => ({ ...f, propertyId: e.target.value, categoryId: "", subcategoryId: "" }))}>
                  <option value="">Select property…</option>
                  {properties.map(p => <option key={p.id} value={p.id}>{p.buildingName}</option>)}
                </select>
              </div>
            )}

            {/* Inherited amenities from property */}
            {inheritedAmenities.length > 0 && (
              <div className="field">
                <label className="field-label">Inherited Amenities <span className="text-brand-400 font-normal">(from property)</span></label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {inheritedAmenities.map(a => (
                    <span key={a} className="badge badge-teal text-[10px]">{a}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Title */}
            <div className="field">
              <label className="field-label">Title *</label>
              <input required className="input" placeholder="e.g. 2BR Apartment, Westlands"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}/>
            </div>

            {/* Unit / Floor */}
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">Unit Number *</label>
                <input required className="input" placeholder="A1, 3B, 101"
                  value={form.unitNumber} onChange={e => setForm(f => ({ ...f, unitNumber: e.target.value }))}/>
              </div>
              <div className="field">
                <label className="field-label">Floor</label>
                <input type="number" min="0" className="input" placeholder="0"
                  value={form.floorNumber} onChange={e => setForm(f => ({ ...f, floorNumber: e.target.value }))}/>
              </div>
            </div>

            {/* Price / Listing Type */}
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">Price (KES) *</label>
                <input required type="number" className="input"
                  value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))}/>
              </div>
              <div className="field">
                <label className="field-label">Listing Type</label>
                <select className="select" value={form.listingType}
                  onChange={e => setForm(f => ({ ...f, listingType: e.target.value }))}>
                  {LISTING_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {/* Property Type / Size */}
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">Property Type</label>
                <select className="select" value={form.propertyType}
                  onChange={e => setForm(f => ({ ...f, propertyType: e.target.value }))}>
                  {PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Size (sqft)</label>
                <input type="number" min="0" className="input" placeholder="e.g. 750"
                  value={form.sizeSqft} onChange={e => setForm(f => ({ ...f, sizeSqft: e.target.value }))}/>
              </div>
            </div>

            {/* Beds / Baths */}
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">Bedrooms</label>
                <input type="number" min="0" className="input"
                  value={form.bedrooms} onChange={e => setForm(f => ({ ...f, bedrooms: e.target.value }))}/>
              </div>
              <div className="field">
                <label className="field-label">Bathrooms</label>
                <input type="number" min="1" className="input"
                  value={form.bathrooms} onChange={e => setForm(f => ({ ...f, bathrooms: e.target.value }))}/>
              </div>
            </div>

            {/* Description */}
            <div className="field">
              <label className="field-label">Description</label>
              <textarea className="input" rows={2}
                value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/>
            </div>

            {/* Category / Subcategory */}
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="field-label">Category</label>
                <select className="select" value={form.categoryId}
                  onChange={e => setForm(f => ({ ...f, categoryId: e.target.value, subcategoryId: "" }))}>
                  <option value="">Select category…</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label className="field-label">Subcategory</label>
                <select className="select" value={form.subcategoryId}
                  onChange={e => setForm(f => ({ ...f, subcategoryId: e.target.value }))}
                  disabled={!form.categoryId || subcategories.length === 0}>
                  <option value="">{!form.categoryId ? "Select category first" : subcategories.length === 0 ? "No subcategories" : "Select subcategory…"}</option>
                  {subcategories.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Cover image */}
            <div className="field">
              <label className="field-label">Cover Image <span className="text-red-400">*</span></label>
              <div className="flex items-start gap-3">
                {primaryImg.url ? (
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-black/[0.08]">
                    <img src={primaryImg.url} alt="" className="w-full h-full object-cover"/>
                    <button type="button" onClick={() => setPrimaryImg(EMPTY_IMG())}
                      className="absolute top-0.5 right-0.5 w-5 h-5 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs">×</button>
                  </div>
                ) : (
                  <label className="w-20 h-20 rounded-xl border-2 border-dashed border-brand-teal/30 flex flex-col items-center justify-center cursor-pointer hover:border-brand-teal/60 transition shrink-0">
                    {primaryImg.uploading
                      ? <IcoLoader size={18} className="text-brand-teal animate-spin"/>
                      : <IcoPlus size={20} className="text-brand-teal"/>}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePrimaryImageChange} disabled={primaryImg.uploading}/>
                    <span className="text-[10px] text-brand-400 mt-1">{primaryImg.uploading ? "Uploading…" : "Upload"}</span>
                  </label>
                )}
                <p className="text-xs text-brand-500 leading-relaxed mt-1">Shown as the listing card cover. Separate from room photos below.</p>
              </div>
              {primaryImg.error && <p className="text-xs text-red-400 mt-1">{primaryImg.error}</p>}
            </div>

            {/* Structured room photos */}
            <div className="field">
              <label className="field-label">Room Photos <span className="text-brand-400 font-normal">(by section, up to 6 per room)</span></label>
              <StructuredImageUploader
                sections={LISTING_IMAGE_SECTIONS}
                value={structuredImages}
                onChange={setStructuredImages}
                uploadFolder="properties/images"
              />
            </div>

            {/* Lease Terms & Deposits collapsible */}
            <div className="field">
              <button type="button"
                onClick={() => setTermsOpen(o => !o)}
                className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs transition ${termsOpen ? "border-brand-teal/30 bg-brand-teal/[0.02]" : "border-black/[0.07]"}`}>
                <span className={`flex-1 font-medium text-left ${termsOpen ? "text-brand-teal" : "text-brand-700"}`}>Lease Terms &amp; Deposits</span>
                <span className={`text-brand-300 text-[9px] transition-transform inline-block ${termsOpen ? "rotate-90" : ""}`}>▶</span>
              </button>
              {termsOpen && (
                <div className="mt-2 space-y-3 p-3 rounded-xl border border-black/[0.06] bg-brand-50/40">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="field">
                      <label className="field-label">Min Lease Period</label>
                      <input className="input text-xs" placeholder="e.g. 6 months"
                        value={terms.minLeasePeriod} onChange={e => setTerms(t => ({ ...t, minLeasePeriod: e.target.value }))}/>
                    </div>
                    <div className="field">
                      <label className="field-label">Notice Period</label>
                      <input className="input text-xs" placeholder="e.g. 1 month"
                        value={terms.noticePeriod} onChange={e => setTerms(t => ({ ...t, noticePeriod: e.target.value }))}/>
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-brand-500 uppercase tracking-wide mb-1.5">Deposits (KES)</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "securityDeposit",    label: "Security" },
                        { key: "waterDeposit",        label: "Water" },
                        { key: "electricityDeposit",  label: "Electricity" },
                        { key: "tokenDeposit",        label: "Token (Prepaid)" },
                        { key: "garbageDeposit",      label: "Garbage" },
                        { key: "adminFee",            label: "Admin Fee" },
                      ].map(({ key, label }) => (
                        <div key={key} className="field">
                          <label className="field-label text-[10px]">{label}</label>
                          <input type="number" min="0" className="input text-xs py-1.5" placeholder="0"
                            value={(terms as Record<string, string>)[key]}
                            onChange={e => setTerms(t => ({ ...t, [key]: e.target.value }))}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-brand-500 uppercase tracking-wide mb-1.5">M-Pesa</div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { key: "mpesaPaybill",       label: "Paybill" },
                        { key: "mpesaTill",          label: "Till" },
                        { key: "mpesaAccountNumber", label: "Account No." },
                      ].map(({ key, label }) => (
                        <div key={key} className="field">
                          <label className="field-label text-[10px]">{label}</label>
                          <input className="input text-xs py-1.5" placeholder="—"
                            value={(terms as Record<string, string>)[key]}
                            onChange={e => setTerms(t => ({ ...t, [key]: e.target.value }))}/>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-semibold text-brand-500 uppercase tracking-wide mb-1.5">Bank</div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { key: "bankName",          label: "Bank Name" },
                        { key: "bankAccountName",   label: "Account Name" },
                        { key: "bankAccountNumber", label: "Account No." },
                        { key: "bankBranch",        label: "Branch" },
                      ].map(({ key, label }) => (
                        <div key={key} className="field">
                          <label className="field-label text-[10px]">{label}</label>
                          <input className="input text-xs py-1.5" placeholder="—"
                            value={(terms as Record<string, string>)[key]}
                            onChange={e => setTerms(t => ({ ...t, [key]: e.target.value }))}/>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-teal flex-1 disabled:opacity-50">
                {saving ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Listing"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
