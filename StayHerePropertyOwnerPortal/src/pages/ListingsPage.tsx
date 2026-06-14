import { useEffect, useState } from "react";
import { listingsApi, ownerApi, propertiesApi, uploadApi, uploadToR2, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import { IcoListing, IcoPlus, IcoMapPin, IcoCheck, IcoX, IcoLoader, IcoEdit, IcoTeam, IcoUser, IcoSearch, IcoRefresh, IcoVacant } from "../components/icons";

type Listing = {
  id: string;
  title?: string;
  price?: number;
  city?: string;
  suburb?: string;
  propertyType?: string;
  listingType?: string;
  bedrooms?: number;
  bathrooms?: number;
  isAvailable?: boolean;
  agentId?: string;
  caretakerId?: string;
  propertyId?: string;
  primaryImageUrl?: string;
};
type StaffMember = { id: string; fullName: string; kind: "agent" | "caretaker" };
type PropertyOption = { id: string; buildingName: string };
type ImgSlot = { file?: File; url?: string; uploading: boolean; error?: string };

const EMPTY_IMG = (): ImgSlot => ({ uploading: false });
const EXTRA_COUNT = 9;

function mapL(x: unknown): Listing | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  return {
    id: String(r.id),
    title: r.title ? String(r.title) : undefined,
    price: typeof r.price === "number" ? r.price : typeof r.rentPrice === "number" ? r.rentPrice as number : undefined,
    city: r.city ? String(r.city) : undefined,
    suburb: r.suburb ? String(r.suburb) : undefined,
    propertyType: r.propertyType ? String(r.propertyType) : undefined,
    listingType: r.listingType ? String(r.listingType) : undefined,
    bedrooms: typeof r.bedrooms === "number" ? r.bedrooms : undefined,
    bathrooms: typeof r.bathrooms === "number" ? r.bathrooms : undefined,
    isAvailable: typeof r.isAvailable === "boolean" ? r.isAvailable : true,
    agentId: r.agentId ? String(r.agentId) : undefined,
    caretakerId: r.caretakerId ? String(r.caretakerId) : undefined,
    propertyId: r.propertyId ? String(r.propertyId) : undefined,
    primaryImageUrl: r.primaryImageUrl ? String(r.primaryImageUrl) : undefined,
  };
}

export function ListingsPage() {
  const { owner, userId, toast, reloadKey } = useOwner();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilter] = useState<"all"|"vacant"|"occupied">("all");
  const [agents, setAgents]     = useState<StaffMember[]>([]);
  const [caretakers, setCaretakers] = useState<StaffMember[]>([]);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [assignModal, setAssignModal] = useState<{ listingId: string; kind: "agent"|"caretaker" } | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [assigning, setAssigning] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    propertyId: "", title: "", price: "", bedrooms: "1", bathrooms: "1",
    propertyType: "Apartment", listingType: "Rent", description: "",
  });
  const [creating, setCreating] = useState(false);

  // Image upload state
  const [primaryImg, setPrimaryImg] = useState<ImgSlot>(EMPTY_IMG());
  const [extraImgs, setExtraImgs] = useState<ImgSlot[]>(() => Array.from({ length: EXTRA_COUNT }, EMPTY_IMG));

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [ld, ad, cd, pd] = await Promise.allSettled([
        listingsApi.byOwner(userId, 1, 100),
        ownerApi.agents(owner?.id ?? userId),
        ownerApi.caretakers(owner?.id ?? userId),
        propertiesApi.byOwner(userId, 1, 50),
      ]);
      if (ld.status === "fulfilled") {
        const pg = asPaginated<unknown>(ld.value);
        const raw = pg?.items ?? (Array.isArray(ld.value) ? ld.value : []);
        setListings((raw as unknown[]).map(mapL).filter(Boolean) as Listing[]);
      }
      if (ad.status === "fulfilled" && Array.isArray(ad.value))
        setAgents(ad.value.map(x => { const r = x as Record<string,unknown>; return { id: String(r.id), fullName: String(r.fullName??""), kind: "agent" as const }; }));
      if (cd.status === "fulfilled" && Array.isArray(cd.value))
        setCaretakers(cd.value.map(x => { const r = x as Record<string,unknown>; return { id: String(r.id), fullName: String(r.fullName??""), kind: "caretaker" as const }; }));
      if (pd.status === "fulfilled") {
        const pg2 = asPaginated<unknown>(pd.value);
        const r2 = (pg2?.items ?? (Array.isArray(pd.value) ? pd.value : [])) as unknown[];
        setProperties(r2.map(x => { const r = x as Record<string,unknown>; return { id: String(r.id), buildingName: String(r.buildingName??"") }; }));
      }
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed to load listings", "error"); }
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
    setExtraImgs(Array.from({ length: EXTRA_COUNT }, EMPTY_IMG));
  }

  function openCreateModal() {
    setCreateModal(true);
    resetImageState();
  }

  function closeCreateModal() {
    setCreateModal(false);
    resetImageState();
  }

  async function handleAssign() {
    if (!assignModal || !selectedStaff || !owner?.id) return;
    setAssigning(true);
    try {
      if (assignModal.kind === "agent")
        await listingsApi.assignAgent(assignModal.listingId, { agentId: selectedStaff });
      else
        await listingsApi.assignCaretaker(assignModal.listingId, { caretakerId: selectedStaff });
      toast(`${assignModal.kind === "agent" ? "Agent" : "Caretaker"} assigned.`, "success");
      setAssignModal(null); setSelectedStaff(""); void load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Assignment failed", "error"); }
    finally { setAssigning(false); }
  }

  async function handleToggleAvailability(l: Listing) {
    try {
      await listingsApi.updateAvailability(l.id, { isAvailable: !l.isAvailable });
      toast(`Unit marked as ${!l.isAvailable ? "available" : "occupied"}.`, "success");
      void load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Update failed", "error"); }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.propertyId) { toast("Select a property first", "error"); return; }
    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        title: createForm.title.trim(),
        price: Number(createForm.price),
        bedrooms: Number(createForm.bedrooms),
        bathrooms: Number(createForm.bathrooms),
        propertyType: createForm.propertyType,
        listingType: createForm.listingType,
        description: createForm.description.trim(),
        primaryImageUrl: primaryImg.url || undefined,
        images: extraImgs.filter(img => img.url).map(img => img.url!),
      };
      await listingsApi.createFromProperty(createForm.propertyId, body);
      toast("Listing created!", "success");
      closeCreateModal();
      void load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Create failed", "error"); }
    finally { setCreating(false); }
  }

  const filtered = listings.filter(l => {
    if (filterStatus === "vacant"   && l.isAvailable === false) return false;
    if (filterStatus === "occupied" && l.isAvailable !== false) return false;
    if (search && !([l.title, l.city, l.suburb, l.propertyType].some(v => v?.toLowerCase().includes(search.toLowerCase())))) return false;
    return true;
  });

  const staffList = assignModal?.kind === "agent" ? agents : caretakers;

  return (
    <div className="space-y-5 animate-slide-up">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-3xl text-brand-900">Units & Listings</h2>
          <p className="text-sm text-brand-500 mt-1">{listings.length} total · {listings.filter(l => l.isAvailable !== false).length} vacant · {listings.filter(l=>l.isAvailable===false).length} occupied</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm"><IcoRefresh size={14}/></button>
          <button onClick={openCreateModal} className="btn-teal text-sm"><IcoPlus size={14}/>New Listing</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <IcoSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400"/>
          <input className="input pl-10" placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1 p-1 card rounded-2xl">
          {(["all","vacant","occupied"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterStatus===f ? "bg-brand-950 text-brand-goldlight shadow-sm" : "text-brand-500 hover:text-brand-900"}`}>
              {f.charAt(0).toUpperCase()+f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="card overflow-hidden"><table className="tbl"><thead><tr><th>Unit</th><th>Location</th><th>Price</th><th>Status</th><th>Team</th><th></th></tr></thead><tbody>{Array.from({length:5}).map((_,i)=><tr key={i}>{Array.from({length:6}).map((_,j)=><td key={j}><div className="skeleton h-4 w-full"/></td>)}</tr>)}</tbody></table></div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <IcoVacant size={36} className="mx-auto mb-3 text-brand-200"/><div className="font-semibold text-brand-700">No listings found</div>
          <button onClick={openCreateModal} className="btn-teal text-sm mt-4"><IcoPlus size={14}/>Create Listing</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Unit / Title</th><th>Location</th><th>Price/mo</th><th>Status</th><th>Agent</th><th>Caretaker</th><th></th></tr></thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {l.primaryImageUrl && (
                        <img src={l.primaryImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/[0.08]"/>
                      )}
                      <div>
                        <div className="font-semibold text-brand-900 text-sm">{l.title ?? `Unit`}</div>
                        {l.propertyType && <div className="text-[10px] text-brand-400">{l.propertyType} · {l.bedrooms}BR · {l.bathrooms}BA</div>}
                      </div>
                    </div>
                  </td>
                  <td><div className="flex items-center gap-1 text-brand-600 text-xs"><IcoMapPin size={11}/>{[l.suburb, l.city].filter(Boolean).join(", ") || "–"}</div></td>
                  <td className="font-bold text-brand-teal text-sm">{l.price != null ? `KES ${l.price.toLocaleString()}` : "–"}</td>
                  <td>
                    <button onClick={() => void handleToggleAvailability(l)}
                      className={`badge cursor-pointer hover:opacity-80 transition-opacity ${l.isAvailable !== false ? "badge-vacant" : "badge-occupied"}`}>
                      {l.isAvailable !== false ? "Vacant" : "Occupied"}
                    </button>
                  </td>
                  <td>
                    {l.agentId
                      ? <span className="badge badge-info text-[10px] cursor-pointer" onClick={() => setAssignModal({ listingId: l.id, kind: "agent" })}>Assigned</span>
                      : <button onClick={() => { setAssignModal({ listingId: l.id, kind:"agent"}); setSelectedStaff(""); }} className="btn-ghost text-xs py-1 text-brand-teal"><IcoTeam size={11}/>Assign</button>
                    }
                  </td>
                  <td>
                    {l.caretakerId
                      ? <span className="badge badge-neutral text-[10px] cursor-pointer" onClick={() => setAssignModal({ listingId: l.id, kind: "caretaker" })}>Assigned</span>
                      : <button onClick={() => { setAssignModal({ listingId: l.id, kind:"caretaker"}); setSelectedStaff(""); }} className="btn-ghost text-xs py-1 text-brand-teal"><IcoUser size={11}/>Assign</button>
                    }
                  </td>
                  <td><button className="btn-icon"><IcoEdit size={13}/></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="modal-bg" onClick={e=>{ if(e.target===e.currentTarget){setAssignModal(null);}}}>
          <div className="modal-box max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg text-brand-900">Assign {assignModal.kind === "agent" ? "Agent" : "Caretaker"}</h3>
              <button onClick={() => setAssignModal(null)} className="btn-icon"><IcoX size={15}/></button>
            </div>
            <div className="space-y-2 mb-5 max-h-60 overflow-y-auto">
              {staffList.length === 0 ? (
                <div className="text-center py-6 text-sm text-brand-400">No {assignModal.kind}s found. Add one in My Team.</div>
              ) : staffList.map(s => (
                <button key={s.id} onClick={() => setSelectedStaff(s.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedStaff===s.id ? "border-brand-teal bg-teal-50" : "border-black/[0.07] hover:border-brand-teal/40"}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{background:"linear-gradient(135deg,#5eead4,#0d9488)"}}>{s.fullName.charAt(0)}</div>
                  <span className="text-sm font-medium text-brand-900 flex-1 text-left">{s.fullName}</span>
                  {selectedStaff===s.id && <IcoCheck size={14} className="text-brand-teal"/>}
                </button>
              ))}
            </div>
            <button onClick={() => void handleAssign()} disabled={!selectedStaff || assigning} className="btn-teal w-full justify-center disabled:opacity-50">
              {assigning ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
              {assigning ? "Assigning…" : "Confirm Assignment"}
            </button>
          </div>
        </div>
      )}

      {/* Create listing modal */}
      {createModal && (
        <div className="modal-bg" onClick={e=>{if(e.target===e.currentTarget)closeCreateModal();}}>
          <div className="modal-box max-w-lg w-full">
            <div className="flex items-center justify-between p-6 border-b border-black/[0.07]">
              <h3 className="font-display text-xl text-brand-900">New Listing</h3>
              <button onClick={closeCreateModal} className="btn-icon"><IcoX size={16}/></button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="field"><label className="field-label">Property *</label>
                <select required className="select" value={createForm.propertyId} onChange={e=>setCreateForm(f=>({...f,propertyId:e.target.value}))}>
                  <option value="">Select property…</option>
                  {properties.map(p=><option key={p.id} value={p.id}>{p.buildingName}</option>)}
                </select>
              </div>
              <div className="field"><label className="field-label">Title *</label><input required className="input" placeholder="e.g. 2BR Apartment, Westlands" value={createForm.title} onChange={e=>setCreateForm(f=>({...f,title:e.target.value}))}/></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">Monthly Rent (KES) *</label><input required type="number" className="input" value={createForm.price} onChange={e=>setCreateForm(f=>({...f,price:e.target.value}))}/></div>
                <div className="field"><label className="field-label">Type</label>
                  <select className="select" value={createForm.propertyType} onChange={e=>setCreateForm(f=>({...f,propertyType:e.target.value}))}>
                    {["Apartment","House","Studio","Bedsitter","Commercial"].map(t=><option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field"><label className="field-label">Bedrooms</label><input type="number" min="0" className="input" value={createForm.bedrooms} onChange={e=>setCreateForm(f=>({...f,bedrooms:e.target.value}))}/></div>
                <div className="field"><label className="field-label">Bathrooms</label><input type="number" min="1" className="input" value={createForm.bathrooms} onChange={e=>setCreateForm(f=>({...f,bathrooms:e.target.value}))}/></div>
              </div>
              <div className="field"><label className="field-label">Description</label><textarea className="input" rows={2} value={createForm.description} onChange={e=>setCreateForm(f=>({...f,description:e.target.value}))}/></div>

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
                  <p className="text-xs text-brand-500 leading-relaxed mt-1">Required. Shown as the cover image for this listing.</p>
                </div>
                {primaryImg.error && <p className="text-xs text-red-400 mt-1">{primaryImg.error}</p>}
              </div>

              {/* Additional Images (up to 9) */}
              <div className="field">
                <label className="field-label">Additional Images <span className="text-brand-400">(up to 9)</span></label>
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
                <button type="button" onClick={closeCreateModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating} className="btn-teal flex-1 disabled:opacity-50">
                  {creating ? <IcoLoader size={15}/> : <IcoCheck size={15}/>}
                  {creating ? "Creating…" : "Create Listing"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
