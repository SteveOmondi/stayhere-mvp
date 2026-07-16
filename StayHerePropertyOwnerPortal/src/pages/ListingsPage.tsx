import { useEffect, useState } from "react";
import { listingsApi, ownerApi, ApiError } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { useOwner } from "../context/OwnerContext";
import {
  IcoPlus, IcoMapPin, IcoCheck, IcoX, IcoLoader,
  IcoEdit, IcoTeam, IcoUser, IcoSearch, IcoRefresh, IcoVacant,
} from "../components/icons";
import { ListingFormModal } from "../components/ListingFormModal";

type Listing = {
  id: string; title?: string; price?: number;
  city?: string; suburb?: string;
  propertyType?: string; listingType?: string;
  bedrooms?: number; bathrooms?: number; sizeSqft?: number;
  isAvailable?: boolean;
  agentId?: string; caretakerId?: string; propertyId?: string;
  primaryImageUrl?: string; unitNumber?: string; floorNumber?: number;
};

type StaffMember = { id: string; fullName: string; kind: "agent" | "caretaker" };

const IMAGE_SECTION_KEYS = ["exterior","livingRoom","kitchen","diningArea","bedroom","bathroom","balcony","other"];

function mapL(x: unknown): Listing | null {
  if (!x || typeof x !== "object") return null;
  const r = x as Record<string, unknown>;
  if (!r.id) return null;
  const unit      = r.unit     as Record<string, unknown> | undefined;
  const loc       = r.location as Record<string, unknown> | undefined;
  const pricing   = r.pricing  as Record<string, unknown> | undefined;
  const agent     = r.agent    as Record<string, unknown> | undefined;
  const caretaker = r.caretaker as Record<string, unknown> | undefined;
  const imgs      = r.images   as Record<string, unknown> | undefined;
  const prop      = r.property as Record<string, unknown> | undefined;
  void IMAGE_SECTION_KEYS; // referenced in modal, not here
  return {
    id:           String(r.id),
    title:        r.title ? String(r.title) : undefined,
    price:        pricing?.price != null ? Number(pricing.price) : (typeof r.price === "number" ? r.price : undefined),
    city:         loc?.city   ? String(loc.city)   : (r.city   ? String(r.city)   : undefined),
    suburb:       loc?.suburb ? String(loc.suburb) : (r.suburb ? String(r.suburb) : undefined),
    propertyType: unit?.propertyType ? String(unit.propertyType) : (r.propertyType ? String(r.propertyType) : undefined),
    listingType:  unit?.listingType  ? String(unit.listingType)  : (r.listingType  ? String(r.listingType)  : undefined),
    bedrooms:     unit?.bedrooms  != null ? Number(unit.bedrooms)  : (typeof r.bedrooms  === "number" ? r.bedrooms  : undefined),
    bathrooms:    unit?.bathrooms != null ? Number(unit.bathrooms) : (typeof r.bathrooms === "number" ? r.bathrooms : undefined),
    sizeSqft:     unit?.sizeSqft  != null ? Number(unit.sizeSqft)  : undefined,
    isAvailable:  r.availabilityStatus === "Occupied" ? false : r.availabilityStatus === "Available" ? true : (typeof r.isAvailable === "boolean" ? r.isAvailable : true),
    agentId:      agent?.id     ? String(agent.id)     : (r.agentId     ? String(r.agentId)     : undefined),
    caretakerId:  caretaker?.id ? String(caretaker.id) : (r.caretakerId ? String(r.caretakerId) : undefined),
    propertyId:   prop?.id      ? String(prop.id)      : (r.propertyId  ? String(r.propertyId)  : undefined),
    primaryImageUrl: imgs?.primary ? String(imgs.primary) : (r.primaryImageUrl ? String(r.primaryImageUrl) : undefined),
    unitNumber:   unit?.number != null ? String(unit.number) : undefined,
    floorNumber:  unit?.floor  != null ? Number(unit.floor)  : undefined,
  };
}

export function ListingsPage() {
  const { owner, toast, reloadKey } = useOwner();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [filterStatus, setFilter] = useState<"all" | "vacant" | "occupied">("all");
  const [agents, setAgents]         = useState<StaffMember[]>([]);
  const [caretakers, setCaretakers] = useState<StaffMember[]>([]);

  const [assignModal, setAssignModal] = useState<{ listingId: string; kind: "agent" | "caretaker" } | null>(null);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [assigning, setAssigning]         = useState(false);

  // Listing create / edit — backed by shared ListingFormModal
  const [listingModal, setListingModal] = useState<{ open: boolean; editListing?: { id: string; propertyId?: string } }>({ open: false });

  /* ── data loading ── */
  const load = async () => {
    if (!owner?.id) return;
    setLoading(true);
    try {
      const [ld, ad, cd] = await Promise.allSettled([
        listingsApi.byOwner(owner.id, 1, 100),
        ownerApi.agents(owner.id),
        ownerApi.caretakers(owner.id),
      ]);
      if (ld.status === "fulfilled") {
        const pg  = asPaginated<unknown>(ld.value);
        const raw = pg?.items ?? (Array.isArray(ld.value) ? ld.value : []);
        setListings((raw as unknown[]).map(mapL).filter(Boolean) as Listing[]);
      }
      if (ad.status === "fulfilled" && Array.isArray(ad.value))
        setAgents(ad.value.map(x => { const r = x as Record<string, unknown>; return { id: String(r.id), fullName: String(r.fullName ?? ""), kind: "agent" as const }; }));
      if (cd.status === "fulfilled" && Array.isArray(cd.value))
        setCaretakers(cd.value.map(x => { const r = x as Record<string, unknown>; return { id: String(r.id), fullName: String(r.fullName ?? ""), kind: "caretaker" as const }; }));
    } catch (e) { toast(e instanceof ApiError ? e.message : "Failed to load listings", "error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, [reloadKey, owner?.id]);

  /* ── staff assignment ── */
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

  /* ── vacancy toggle ── */
  async function handleToggleAvailability(l: Listing) {
    try {
      const next = l.isAvailable !== false ? "Occupied" : "Available";
      await listingsApi.updateAvailability(l.id, { availabilityStatus: next });
      toast(`Unit marked as ${next.toLowerCase()}.`, "success");
      void load();
    } catch (e) { toast(e instanceof ApiError ? e.message : "Update failed", "error"); }
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
          <p className="text-sm text-brand-500 mt-1">
            {listings.length} total · {listings.filter(l => l.isAvailable !== false).length} vacant · {listings.filter(l => l.isAvailable === false).length} occupied
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void load()} className="btn-secondary text-sm"><IcoRefresh size={14}/></button>
          <button onClick={() => setListingModal({ open: true })} className="btn-teal text-sm"><IcoPlus size={14}/>New Listing</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <IcoSearch size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-400"/>
          <input className="input pl-10" placeholder="Search listings…" value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
        <div className="flex gap-1 p-1 card rounded-2xl">
          {(["all", "vacant", "occupied"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${filterStatus === f ? "bg-brand-950 text-brand-goldlight shadow-sm" : "text-brand-500 hover:text-brand-900"}`}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead><tr><th>Unit</th><th>Location</th><th>Price</th><th>Status</th><th>Team</th><th></th></tr></thead>
            <tbody>{Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>{Array.from({ length: 6 }).map((_, j) => <td key={j}><div className="skeleton h-4 w-full"/></td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card p-16 text-center">
          <IcoVacant size={36} className="mx-auto mb-3 text-brand-200"/>
          <div className="font-semibold text-brand-700">No listings found</div>
          <button onClick={() => setListingModal({ open: true })} className="btn-teal text-sm mt-4"><IcoPlus size={14}/>Create Listing</button>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="tbl">
            <thead>
              <tr><th>Unit / Title</th><th>Location</th><th>Price/mo</th><th>Status</th><th>Agent</th><th>Caretaker</th><th></th></tr>
            </thead>
            <tbody>
              {filtered.map(l => (
                <tr key={l.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {l.primaryImageUrl && (
                        <img src={l.primaryImageUrl} alt="" className="w-8 h-8 rounded-lg object-cover shrink-0 border border-black/[0.08]"/>
                      )}
                      <div>
                        <div className="font-semibold text-brand-900 text-sm">{l.title ?? "Unit"}</div>
                        {l.propertyType && (
                          <div className="text-[10px] text-brand-400">
                            {l.propertyType}{l.listingType ? ` · ${l.listingType}` : ""} · {l.bedrooms}BR · {l.bathrooms}BA{l.sizeSqft ? ` · ${l.sizeSqft} sqft` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-1 text-brand-600 text-xs">
                      <IcoMapPin size={11}/>{[l.suburb, l.city].filter(Boolean).join(", ") || "–"}
                    </div>
                  </td>
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
                      : <button onClick={() => { setAssignModal({ listingId: l.id, kind: "agent" }); setSelectedStaff(""); }} className="btn-ghost text-xs py-1 text-brand-teal"><IcoTeam size={11}/>Assign</button>
                    }
                  </td>
                  <td>
                    {l.caretakerId
                      ? <span className="badge badge-neutral text-[10px] cursor-pointer" onClick={() => setAssignModal({ listingId: l.id, kind: "caretaker" })}>Assigned</span>
                      : <button onClick={() => { setAssignModal({ listingId: l.id, kind: "caretaker" }); setSelectedStaff(""); }} className="btn-ghost text-xs py-1 text-brand-teal"><IcoUser size={11}/>Assign</button>
                    }
                  </td>
                  <td>
                    <button
                      onClick={() => setListingModal({ open: true, editListing: { id: l.id, propertyId: l.propertyId } })}
                      className="btn-icon">
                      <IcoEdit size={13}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && (
        <div className="modal-bg" onClick={e => { if (e.target === e.currentTarget) setAssignModal(null); }}>
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
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${selectedStaff === s.id ? "border-brand-teal bg-teal-50" : "border-black/[0.07] hover:border-brand-teal/40"}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
                    {s.fullName.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-brand-900 flex-1 text-left">{s.fullName}</span>
                  {selectedStaff === s.id && <IcoCheck size={14} className="text-brand-teal"/>}
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

      {/* Create / Edit listing modal — shared component */}
      <ListingFormModal
        open={listingModal.open}
        editListing={listingModal.editListing}
        onClose={() => setListingModal({ open: false })}
        onSaved={() => { setListingModal({ open: false }); void load(); }}
      />
    </div>
  );
}
