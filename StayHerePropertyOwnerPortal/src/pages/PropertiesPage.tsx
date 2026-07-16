import { useEffect, useState, useCallback } from "react";
import { propertiesApi, listingsApi, uploadApi, uploadToR2, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import {
  IcoBuilding, IcoPlus, IcoMapPin, IcoListing, IcoChevRight,
  IcoX, IcoCheck, IcoLoader, IcoEdit, IcoRefresh, IcoSearch,
} from "../components/icons";
import { LocationPicker } from "../components/LocationPicker";
import { ListingFormModal } from "../components/ListingFormModal";

/* ─────────────────────────────────────── types ── */
type Prop = {
  id: string; buildingName: string; propertyCode?: string;
  city?: string; suburb?: string; totalUnits?: number; floors?: number;
  description?: string; primaryImageUrl?: string; images?: string[];
  latitude?: number; longitude?: number;
  yearBuilt?: number;
  sharedAmenities?: string[];
  rules?: { type: string; description?: string }[];
};
type PropWithStats = Prop & { listingCount: number; vacantCount: number };

type DrawerListing = {
  id: string; unitNumber: string; title: string; listingCode: string;
  price: number; currency: string; bedrooms: number; bathrooms: number;
  propertyType: string; listingType: string; availabilityStatus: string;
  floorNumber: number; sizeSqft?: number; isFurnished: boolean;
  primaryImageUrl?: string;
};

/* ─────────────────────────────────────── constants ── */
const AMENITY_SLUGS: { slug: string; label: string }[] = [
  { slug: "parking",        label: "Parking" },
  { slug: "coveredParking", label: "Covered Parking" },
  { slug: "elevator",       label: "Elevator" },
  { slug: "gym",            label: "Gym" },
  { slug: "swimmingPool",   label: "Swimming Pool" },
  { slug: "rooftop",        label: "Rooftop" },
  { slug: "lounge",         label: "Lounge" },
  { slug: "playArea",       label: "Play Area" },
  { slug: "generatorBackup",label: "Generator Backup" },
  { slug: "borehole",       label: "Borehole" },
  { slug: "cctv",           label: "CCTV" },
  { slug: "guardedEntry",   label: "Guarded Entry" },
  { slug: "intercom",       label: "Intercom" },
  { slug: "freeWifi",       label: "Free Wi-Fi" },
  { slug: "laundry",        label: "Laundry" },
  { slug: "storage",        label: "Storage" },
  { slug: "disabledAccess", label: "Disabled Access" },
];

const RULE_TYPES: { type: string; label: string; icon: string }[] = [
  { type: "NoSmoking",      label: "No Smoking",      icon: "🚭" },
  { type: "NoPets",         label: "No Pets",          icon: "🐾" },
  { type: "NoParties",      label: "No Parties",       icon: "🎉" },
  { type: "NoLoudMusic",    label: "No Loud Music",    icon: "🎵" },
  { type: "NoChildren",     label: "No Children",      icon: "👶" },
  { type: "NoAlcohol",      label: "No Alcohol",       icon: "🍺" },
  { type: "QuietHours",     label: "Quiet Hours",      icon: "🤫" },
  { type: "VisitorPolicy",  label: "Visitor Policy",   icon: "👥" },
  { type: "CleaningPolicy", label: "Cleaning Policy",  icon: "🧹" },
  { type: "ParkingPolicy",  label: "Parking Policy",   icon: "🅿️" },
];

const IMGS = [
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=600&q=75",
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=75",
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=600&q=75",
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=75",
  "https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=600&q=75",
];

const EMPTY_PROP_FORM = {
  buildingName: "", country: "Kenya", county: "", city: "", suburb: "",
  street: "", description: "", totalUnits: "", totalFloors: "", yearBuilt: "",
};

type ImgSlot = { file?: File; url?: string; uploading: boolean; error?: string };
const EMPTY_IMG = (): ImgSlot => ({ uploading: false });

/* ─────────────────────────────────────── mappers ── */
function mapProp(x: unknown): Prop | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  const loc = r.location as Record<string, unknown> | undefined;
  return {
    id:             String(r.id),
    buildingName:   String(r.buildingName ?? "Unnamed"),
    propertyCode:   r.propertyCode  ? String(r.propertyCode) : undefined,
    city:           loc?.city       ? String(loc.city)       : (r.city   ? String(r.city)   : undefined),
    suburb:         loc?.suburb     ? String(loc.suburb)     : (r.suburb ? String(r.suburb) : undefined),
    totalUnits:     typeof r.totalUnits  === "number" ? r.totalUnits  : undefined,
    floors:         typeof r.totalFloors === "number" ? r.totalFloors : (typeof r.floors === "number" ? r.floors : undefined),
    description:    r.description   ? String(r.description)  : undefined,
    primaryImageUrl:r.primaryImageUrl ? String(r.primaryImageUrl) : undefined,
    images:         Array.isArray(r.images) ? r.images.map(String) : undefined,
    latitude:       typeof loc?.latitude  === "number" ? loc.latitude  : (typeof r.latitude  === "number" ? r.latitude  : undefined),
    longitude:      typeof loc?.longitude === "number" ? loc.longitude : (typeof r.longitude === "number" ? r.longitude : undefined),
    yearBuilt:      typeof r.yearBuilt === "number" ? r.yearBuilt : undefined,
    sharedAmenities:Array.isArray(r.sharedAmenities) ? r.sharedAmenities.map(String) : undefined,
    rules:          Array.isArray(r.rules) ? r.rules.map((ru: unknown) => {
      const o = ru as Record<string, unknown>;
      return { type: String(o.type ?? ""), description: o.description ? String(o.description) : undefined };
    }) : undefined,
  };
}

function mapDrawerListing(x: unknown): DrawerListing | null {
  if (!x || typeof x !== "object") return null;
  const r    = x as Record<string, unknown>;
  if (!r.id) return null;
  const unit    = r.unit    as Record<string, unknown> | undefined;
  const pricing = r.pricing as Record<string, unknown> | undefined;
  const imgs    = r.images  as Record<string, unknown> | undefined;
  return {
    id:                 String(r.id),
    unitNumber:         unit?.number != null ? String(unit.number) : (r.unitNumber ? String(r.unitNumber) : "–"),
    title:              r.title        ? String(r.title)               : "Untitled",
    listingCode:        r.listingCode  ? String(r.listingCode)         : "",
    price:              pricing?.price != null ? Number(pricing.price) : (typeof r.price === "number" ? r.price : 0),
    currency:           pricing?.currency ? String(pricing.currency)   : (r.priceCurrency ? String(r.priceCurrency) : "KES"),
    bedrooms:           unit?.bedrooms != null ? Number(unit.bedrooms) : (typeof r.bedrooms === "number" ? r.bedrooms : 0),
    bathrooms:          unit?.bathrooms != null ? Number(unit.bathrooms) : (typeof r.bathrooms === "number" ? r.bathrooms : 1),
    propertyType:       unit?.propertyType ? String(unit.propertyType) : (r.propertyType ? String(r.propertyType) : "Apartment"),
    listingType:        unit?.listingType  ? String(unit.listingType)  : (r.listingType  ? String(r.listingType)  : "Rent"),
    availabilityStatus: r.availabilityStatus ? String(r.availabilityStatus) : "Available",
    floorNumber:        unit?.floor != null ? Number(unit.floor) : (typeof r.floorNumber === "number" ? r.floorNumber : 0),
    sizeSqft:           unit?.sizeSqft != null ? Number(unit.sizeSqft) : undefined,
    isFurnished:        unit?.isFurnished === true || r.isFurnished === true,
    primaryImageUrl:    imgs?.primary ? String(imgs.primary) : (r.primaryImageUrl ? String(r.primaryImageUrl) : undefined),
  };
}

/* ─────────────────────────────────────── helpers ── */
function fmtPrice(price: number, currency: string) {
  return `${currency} ${new Intl.NumberFormat("en-KE").format(price)}`;
}

function statusConfig(s: string): { dot: string; label: string } {
  if (s === "Occupied")  return { dot: "bg-amber-400",  label: "Occupied"   };
  if (s === "OffMarket") return { dot: "bg-brand-300",  label: "Off Market" };
  return                        { dot: "bg-green-400",  label: "Vacant"     };
}

/* ═══════════════════════════════════════════════════
   Page component
══════════════════════════════════════════════════════ */
export function PropertiesPage() {
  const { owner, toast, reloadKey } = useOwner();

  /* ── property list ── */
  const [props, setProps]     = useState<PropWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  /* ── property create / edit modal ── */
  const [modal, setModal]         = useState<"create" | "edit" | null>(null);
  const [editTarget, setEditTarget] = useState<PropWithStats | null>(null);
  const [form, setForm]           = useState(EMPTY_PROP_FORM);
  const [saving, setSaving]       = useState(false);
  const [coords, setCoords]       = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [rules, setRules]         = useState(RULE_TYPES.map(r => ({ type: r.type, description: "", enabled: false })));
  const [primaryImg, setPrimaryImg] = useState<ImgSlot>(EMPTY_IMG());
  const [extraImgs, setExtraImgs]   = useState<ImgSlot[]>([EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG()]);

  /* ── listings drawer ── */
  const [selectedProp, setSelectedProp]     = useState<PropWithStats | null>(null);
  const [drawerListings, setDrawerListings] = useState<DrawerListing[]>([]);
  const [drawerLoading, setDrawerLoading]   = useState(false);
  const [drawerSearch, setDrawerSearch]     = useState("");

  /* ── add listing modal (shared form, same as ListingsPage) ── */
  const [addListingOpen, setAddListingOpen] = useState(false);

  /* ══ data loading ══ */
  const load = async () => {
    if (!owner?.id) return;
    setLoading(true);
    try {
      const data = await propertiesApi.byOwner(owner.id, 1, 50);
      const pg   = asPaginated<unknown>(data);
      const raw  = (pg?.items ?? (Array.isArray(data) ? data : [])) as unknown[];
      const mapped = raw.map(mapProp).filter(Boolean) as Prop[];
      const withStats = await Promise.all(mapped.map(async p => {
        try {
          const ld    = await listingsApi.byProperty(p.id, 1, 100);
          const lpg   = asPaginated<unknown>(ld);
          const items = lpg?.items ?? (Array.isArray(ld) ? ld : []) as unknown[];
          const vacant = items.filter((l: unknown) => {
            const r = l as Record<string, unknown>;
            return r.availabilityStatus === "Available" || r.isAvailable === true;
          }).length;
          return { ...p, listingCount: lpg?.totalCount ?? items.length, vacantCount: vacant };
        } catch { return { ...p, listingCount: 0, vacantCount: 0 }; }
      }));
      setProps(withStats);
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed to load properties", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reloadKey, owner?.id]);

  /* ══ image helpers ══ */
  async function uploadImage(file: File): Promise<string> {
    const ct = file.type || "image/jpeg";
    const { uploadUrl, publicUrl, contentType: sCt } =
      await uploadApi.getPresignedUrl("properties/images", file.name, ct);
    await uploadToR2(uploadUrl, file, sCt);
    return publicUrl;
  }
  async function handlePrimaryImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setPrimaryImg({ file, uploading: true });
    try   { setPrimaryImg({ file, url: await uploadImage(file), uploading: false }); }
    catch { setPrimaryImg({ file, uploading: false, error: "Upload failed" }); toast("Image upload failed", "error"); }
  }
  async function handleExtraImageChange(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setExtraImgs(imgs => imgs.map((im, i) => i === idx ? { file, uploading: true } : im));
    try   { setExtraImgs(imgs => imgs.map((im, i) => i === idx ? { file, url: "", uploading: false, ...{ url: "" } } : im));
            const url = await uploadImage(file);
            setExtraImgs(imgs => imgs.map((im, i) => i === idx ? { file, url, uploading: false } : im)); }
    catch { setExtraImgs(imgs => imgs.map((im, i) => i === idx ? { ...im, uploading: false, error: "Upload failed" } : im));
            toast("Image upload failed", "error"); }
  }
  function resetImageState() { setPrimaryImg(EMPTY_IMG()); setExtraImgs([EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG(), EMPTY_IMG()]); }
  function resetAmenitiesAndRules() {
    setSelectedAmenities([]);
    setRules(RULE_TYPES.map(r => ({ type: r.type, description: "", enabled: false })));
  }

  /* ══ property modal helpers ══ */
  function openCreateModal() {
    setModal("create"); setForm(EMPTY_PROP_FORM); setEditTarget(null);
    setCoords({ lat: null, lng: null }); resetImageState(); resetAmenitiesAndRules();
  }
  function openEditModal(p: PropWithStats) {
    setEditTarget(p);
    setForm({ buildingName: p.buildingName, city: p.city ?? "", county: p.city ?? "",
              suburb: p.suburb ?? "", street: "", description: p.description ?? "",
              totalUnits: p.totalUnits?.toString() ?? "", totalFloors: p.floors?.toString() ?? "",
              country: "Kenya", yearBuilt: p.yearBuilt?.toString() ?? "" });
    setCoords({ lat: p.latitude ?? null, lng: p.longitude ?? null });
    setSelectedAmenities(p.sharedAmenities ?? []);
    setRules(RULE_TYPES.map(r => {
      const ex = p.rules?.find(pr => pr.type === r.type);
      return { type: r.type, description: ex?.description ?? "", enabled: !!ex };
    }));
    setPrimaryImg(p.primaryImageUrl ? { url: p.primaryImageUrl, uploading: false } : EMPTY_IMG());
    const ex = p.images ?? [];
    setExtraImgs([0,1,2,3].map(i => ex[i] ? { url: ex[i], uploading: false } : EMPTY_IMG()));
    setModal("edit");
  }
  function closeModal() {
    setModal(null); setForm(EMPTY_PROP_FORM); setCoords({ lat: null, lng: null });
    resetImageState(); resetAmenitiesAndRules();
  }
  const handleCoordsChange = useCallback((lat: number, lng: number) => setCoords({ lat, lng }), []);
  const handleCoordsClear  = useCallback(() => setCoords({ lat: null, lng: null }), []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!owner?.id) return;
    setSaving(true);
    const enabledRules = rules.filter(r => r.enabled).map(r => ({ type: r.type, description: r.description.trim() || undefined }));
    const body: Record<string, unknown> = {
      buildingName:   form.buildingName.trim(),
      description:    form.description.trim() || undefined,
      totalUnits:     Number(form.totalUnits)  || 1,
      totalFloors:    Number(form.totalFloors) || 1,
      yearBuilt:      form.yearBuilt ? Number(form.yearBuilt) : undefined,
      sharedAmenities:selectedAmenities.length > 0 ? selectedAmenities : undefined,
      rules:          enabledRules.length > 0 ? enabledRules : undefined,
      location: { country: form.country || "Kenya", county: form.county.trim() || form.city.trim(),
                  city: form.city.trim(), suburb: form.suburb.trim() || undefined,
                  street: form.street.trim() || undefined,
                  latitude: coords.lat ?? undefined, longitude: coords.lng ?? undefined },
      primaryImageUrl:primaryImg.url || undefined,
      images:         extraImgs.filter(im => im.url).map(im => im.url!),
    };
    try {
      if (modal === "edit" && editTarget) { await propertiesApi.update(editTarget.id, body); toast("Property updated.", "success"); }
      else                                { await propertiesApi.create(body);                toast("Property created.", "success"); }
      closeModal(); void load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Save failed", "error"); }
    finally { setSaving(false); }
  }

  /* ══ listings drawer helpers ══ */
  async function loadDrawerListings(p: PropWithStats) {
    setDrawerLoading(true);
    try {
      const data = await listingsApi.byProperty(p.id, 1, 100);
      const pg   = asPaginated<unknown>(data);
      const raw  = (pg?.items ?? (Array.isArray(data) ? data : [])) as unknown[];
      setDrawerListings(raw.map(mapDrawerListing).filter(Boolean) as DrawerListing[]);
    } catch { toast("Failed to load listings", "error"); }
    finally { setDrawerLoading(false); }
  }

  function openDrawer(p: PropWithStats) {
    setSelectedProp(p);
    setDrawerListings([]);
    setDrawerSearch("");
    void loadDrawerListings(p);
  }

  function closeDrawer() {
    setSelectedProp(null);
    setDrawerSearch("");
  }

  /* ══ render ══ */
  return (
    <div className="space-y-5 animate-slide-up">
      {/* ── page header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl text-brand-900">My Properties</h2>
          <p className="text-sm text-brand-500 mt-1">{props.length} buildings in your portfolio</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm"><IcoRefresh size={14}/>Refresh</button>
          <button onClick={openCreateModal}    className="btn-teal text-sm"><IcoPlus size={14}/>Add Property</button>
        </div>
      </div>

      {/* ── property grid ── */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="skeleton h-44"/>
              <div className="p-4 space-y-2"><div className="skeleton h-5 w-2/3"/><div className="skeleton h-3 w-1/2"/></div>
            </div>
          ))}
        </div>
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
                <img src={p.primaryImageUrl || IMGS[i % IMGS.length]} alt={p.buildingName} className="h-44 w-full object-cover"/>
                <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(12,18,34,0.75) 0%, transparent 60%)" }}/>
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                  <div>
                    <div className="text-white font-bold text-sm leading-tight">{p.buildingName}</div>
                    {(p.city || p.suburb) && (
                      <div className="flex items-center gap-1 text-white/70 text-[10px] mt-0.5">
                        <IcoMapPin size={9}/>{[p.suburb, p.city].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  {p.propertyCode && <span className="badge badge-teal text-[9px] font-mono shrink-0">{p.propertyCode}</span>}
                </div>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-3 divide-x divide-black/[0.06] mb-4">
                  {[
                    { label: "Units",  val: p.listingCount ?? p.totalUnits ?? "–" },
                    { label: "Vacant", val: p.vacantCount },
                    { label: "Floors", val: p.floors ?? "–" },
                  ].map(s => (
                    <div key={s.label} className="text-center px-2 first:pl-0 last:pr-0">
                      <div className="text-lg font-bold text-brand-900">{s.val}</div>
                      <div className="text-[10px] text-brand-400 uppercase">{s.label}</div>
                    </div>
                  ))}
                </div>
                {p.description && <p className="text-xs text-brand-500 line-clamp-2 mb-3">{p.description}</p>}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(p)}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                  >
                    <IcoEdit size={12}/>Edit
                  </button>
                  <button
                    onClick={() => openDrawer(p)}
                    className="btn-teal text-xs py-2 flex-1 flex items-center justify-center gap-1.5"
                  >
                    <IcoListing size={12}/>
                    <span>Listings</span>
                    {p.listingCount > 0 && (
                      <span className="bg-white/20 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 leading-none min-w-[18px] text-center">
                        {p.listingCount}
                      </span>
                    )}
                    <IcoChevRight size={11}/>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          Property create / edit modal
      ══════════════════════════════════════════════ */}
      {modal && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal-box max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <h3 className="font-display text-xl text-brand-900">{modal === "edit" ? "Edit Property" : "New Property"}</h3>
              <button onClick={closeModal} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="field"><label className="field-label">Building Name *</label>
                <input required className="input" placeholder="e.g. Kasa Flats" value={form.buildingName}
                  onChange={e => setForm(f => ({ ...f, buildingName: e.target.value }))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">City *</label>
                  <input required className="input" placeholder="Nairobi" value={form.city}
                    onChange={e => setForm(f => ({ ...f, city: e.target.value }))}/></div>
                <div className="field"><label className="field-label">County *</label>
                  <input required className="input" placeholder="Nairobi County" value={form.county}
                    onChange={e => setForm(f => ({ ...f, county: e.target.value }))}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">Suburb</label>
                  <input className="input" placeholder="Kasarani" value={form.suburb}
                    onChange={e => setForm(f => ({ ...f, suburb: e.target.value }))}/></div>
                <div className="field"><label className="field-label">Street Address</label>
                  <input className="input" placeholder="e.g. Mwiki Road" value={form.street}
                    onChange={e => setForm(f => ({ ...f, street: e.target.value }))}/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">Total Units *</label>
                  <input required type="number" min="1" className="input" placeholder="e.g. 24" value={form.totalUnits}
                    onChange={e => setForm(f => ({ ...f, totalUnits: e.target.value }))}/></div>
                <div className="field"><label className="field-label">Total Floors *</label>
                  <input required type="number" min="1" className="input" placeholder="e.g. 4" value={form.totalFloors}
                    onChange={e => setForm(f => ({ ...f, totalFloors: e.target.value }))}/></div>
              </div>
              <div className="field"><label className="field-label">Description</label>
                <textarea className="input" rows={3} placeholder="Brief description…" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}/></div>
              <div className="field">
                <label className="field-label">Year Built <span className="text-brand-400 font-normal">(optional)</span></label>
                <input type="number" min="1900" max={new Date().getFullYear()} className="input w-36"
                  placeholder={String(new Date().getFullYear())} value={form.yearBuilt}
                  onChange={e => setForm(f => ({ ...f, yearBuilt: e.target.value }))}/>
              </div>
              {/* Shared Amenities */}
              <div className="field">
                <label className="field-label">Shared Amenities <span className="text-brand-400 font-normal">(inherited by new listings)</span></label>
                <div className="grid grid-cols-2 gap-1.5 mt-1">
                  {AMENITY_SLUGS.map(a => {
                    const checked = selectedAmenities.includes(a.slug);
                    return (
                      <label key={a.slug}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs transition select-none ${checked ? "border-brand-teal bg-brand-teal/5 text-brand-teal font-medium" : "border-black/[0.08] text-brand-500 hover:border-brand-teal/40"}`}>
                        <input type="checkbox" className="hidden" checked={checked}
                          onChange={() => setSelectedAmenities(prev => checked ? prev.filter(s => s !== a.slug) : [...prev, a.slug])}/>
                        <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-brand-teal border-brand-teal" : "border-brand-300"}`}>
                          {checked && <IcoCheck size={9} className="text-white"/>}
                        </span>
                        {a.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              {/* House Rules */}
              <div className="field">
                <label className="field-label">House Rules <span className="text-brand-400 font-normal">(surfaced on every listing)</span></label>
                <div className="space-y-1.5 mt-1">
                  {rules.map((rule, idx) => {
                    const meta = RULE_TYPES.find(r => r.type === rule.type)!;
                    return (
                      <div key={rule.type} className={`rounded-lg border transition ${rule.enabled ? "border-brand-teal/30 bg-brand-teal/5" : "border-black/[0.07]"}`}>
                        <button type="button"
                          onClick={() => setRules(prev => prev.map((r, i) => i === idx ? { ...r, enabled: !r.enabled } : r))}
                          className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left">
                          <span className="text-base leading-none">{meta.icon}</span>
                          <span className={`flex-1 font-medium ${rule.enabled ? "text-brand-teal" : "text-brand-700"}`}>{meta.label}</span>
                          <span className={`w-7 h-4 rounded-full transition-colors relative shrink-0 ${rule.enabled ? "bg-brand-teal" : "bg-brand-200"}`}>
                            <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-all ${rule.enabled ? "left-3.5" : "left-0.5"}`}/>
                          </span>
                        </button>
                        {rule.enabled && (
                          <div className="px-3 pb-2">
                            <input className="input text-xs py-1.5" placeholder="Optional note…"
                              value={rule.description}
                              onChange={e => setRules(prev => prev.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))}/>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Location */}
              <div className="field">
                <label className="field-label">Map Location <span className="text-brand-400 font-normal">(optional)</span></label>
                <LocationPicker lat={coords.lat} lng={coords.lng} onChange={handleCoordsChange} onClear={handleCoordsClear}/>
              </div>
              {/* Primary Image */}
              <div className="field">
                <label className="field-label">Primary Image <span className="text-red-400">*</span></label>
                <div className="flex items-start gap-3">
                  {primaryImg.url ? (
                    <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-black/[0.08]">
                      <img src={primaryImg.url} alt="" className="w-full h-full object-cover"/>
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
                  <p className="text-xs text-brand-500 leading-relaxed mt-1">Shown as the cover image on listings and property cards.</p>
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
                        <img src={img.url} alt="" className="w-full h-full object-cover"/>
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

      {/* ══════════════════════════════════════════════
          Listings slide-in drawer
      ══════════════════════════════════════════════ */}
      {selectedProp && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-[1px]"
            onClick={closeDrawer}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 w-full sm:w-[440px] bg-white z-50 flex flex-col shadow-2xl">

            {/* ── Drawer header ── */}
            <div className="flex items-start justify-between px-5 py-4 border-b border-black/[0.07] bg-white shrink-0">
              <div className="min-w-0 mr-3">
                <h3 className="font-display text-lg text-brand-900 truncate">{selectedProp.buildingName}</h3>
                <p className="text-xs text-brand-400 mt-0.5">
                  {drawerLoading ? "Loading…" : `${drawerListings.length} listing${drawerListings.length !== 1 ? "s" : ""}`}
                  {selectedProp.propertyCode && <> · <span className="font-mono">{selectedProp.propertyCode}</span></>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setAddListingOpen(true)}
                  className="btn-teal text-xs py-1.5 px-3"
                >
                  <IcoPlus size={12}/>Add Listing
                </button>
                <button onClick={closeDrawer} className="btn-icon"><IcoX size={16}/></button>
              </div>
            </div>

            {/* ── Search bar ── */}
            {drawerListings.length > 3 && (
              <div className="px-5 py-3 border-b border-black/[0.06] shrink-0">
                <div className="relative">
                  <IcoSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-400"/>
                  <input
                    className="input pl-8 text-sm py-1.5"
                    placeholder="Search by unit, title or code…"
                    value={drawerSearch}
                    onChange={e => setDrawerSearch(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* ── Listing list ── */}
            <div className="flex-1 overflow-y-auto">
              {drawerLoading ? (
                <div className="p-5 space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="rounded-xl border border-black/[0.06] p-4 space-y-2">
                      <div className="skeleton h-4 w-3/4"/>
                      <div className="skeleton h-3 w-1/2"/>
                      <div className="skeleton h-3 w-1/3"/>
                    </div>
                  ))}
                </div>
              ) : (() => {
                const filtered = drawerListings.filter(l =>
                  !drawerSearch ||
                  l.unitNumber.toLowerCase().includes(drawerSearch.toLowerCase()) ||
                  l.title.toLowerCase().includes(drawerSearch.toLowerCase()) ||
                  l.listingCode.toLowerCase().includes(drawerSearch.toLowerCase())
                );
                if (filtered.length === 0) return (
                  <div className="flex flex-col items-center justify-center h-full py-16 px-8 text-center">
                    <IcoListing size={36} className="text-brand-200 mb-3"/>
                    {drawerSearch ? (
                      <>
                        <p className="font-semibold text-brand-700 mb-1">No matches</p>
                        <p className="text-xs text-brand-400">Try a different search term</p>
                      </>
                    ) : (
                      <>
                        <p className="font-semibold text-brand-700 mb-1">No listings yet</p>
                        <p className="text-xs text-brand-400 mb-4">Add your first unit to start receiving bookings</p>
                        <button onClick={() => setAddListingOpen(true)} className="btn-teal text-sm">
                          <IcoPlus size={13}/>Add First Listing
                        </button>
                      </>
                    )}
                  </div>
                );
                return (
                <div className="p-4 space-y-3">
                  {filtered.map(l => {
                    const sc = statusConfig(l.availabilityStatus);
                    return (
                      <div key={l.id} className="rounded-xl border border-black/[0.07] bg-white hover:border-brand-teal/30 hover:shadow-sm transition-all p-4">
                        <div className="flex items-start justify-between gap-3">
                          {/* Left: unit badge + info */}
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-brand-teal/10 flex items-center justify-center shrink-0">
                              <span className="text-brand-teal font-bold text-xs leading-tight text-center">{l.unitNumber}</span>
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm text-brand-900 truncate leading-tight">{l.title}</div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${l.availabilityStatus === "Occupied" ? "bg-amber-50 text-amber-600" : l.availabilityStatus === "OffMarket" ? "bg-brand-100 text-brand-500" : "bg-green-50 text-green-600"}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}/>
                                  {sc.label}
                                </span>
                                <span className="text-[10px] text-brand-400">{l.propertyType}</span>
                                <span className="text-[10px] text-brand-300">·</span>
                                <span className="text-[10px] text-brand-400">{l.listingType}</span>
                                {l.isFurnished && <span className="text-[10px] text-brand-400">· Furnished</span>}
                              </div>
                            </div>
                          </div>
                          {/* Right: price */}
                          <div className="text-right shrink-0">
                            <div className="font-bold text-brand-900 text-sm">{fmtPrice(l.price, l.currency)}</div>
                            <div className="text-[10px] text-brand-400">/{l.listingType === "Rent" ? "mo" : "total"}</div>
                          </div>
                        </div>

                        {/* Bottom meta row */}
                        <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.05]">
                          <div className="flex items-center gap-2 text-xs text-brand-500">
                            <span className="flex items-center gap-0.5">
                              <span className="text-brand-300">🛏</span>{l.bedrooms} bed{l.bedrooms !== 1 ? "s" : ""}
                            </span>
                            <span className="text-brand-200">·</span>
                            <span className="flex items-center gap-0.5">
                              <span className="text-brand-300">🚿</span>{l.bathrooms} bath{l.bathrooms !== 1 ? "s" : ""}
                            </span>
                            {l.sizeSqft && (
                              <>
                                <span className="text-brand-200">·</span>
                                <span>{l.sizeSqft} sqft</span>
                              </>
                            )}
                          </div>
                          {l.listingCode && (
                            <span className="ml-auto font-mono text-[10px] text-brand-300">{l.listingCode}</span>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Add another listing CTA at bottom of list */}
                  <button
                    onClick={() => setAddListingOpen(true)}
                    className="w-full rounded-xl border-2 border-dashed border-brand-teal/25 py-3 flex items-center justify-center gap-2 text-sm text-brand-teal/70 hover:border-brand-teal/50 hover:text-brand-teal transition-colors"
                  >
                    <IcoPlus size={14}/>Add Another Listing
                  </button>
                </div>
                );
              })()}
            </div>
          </div>
        </>
      )}

      {/* ── Add listing full modal (same form as Units & Listings page) ── */}
      <ListingFormModal
        open={addListingOpen}
        lockedProperty={selectedProp
          ? { id: selectedProp.id, buildingName: selectedProp.buildingName, sharedAmenities: selectedProp.sharedAmenities }
          : undefined}
        onClose={() => setAddListingOpen(false)}
        onSaved={() => {
          setAddListingOpen(false);
          if (selectedProp) void loadDrawerListings(selectedProp);
          void load();
        }}
      />
    </div>
  );
}
