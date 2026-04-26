import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, listingsApi, ownersApi } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";

type Tab = "overview" | "properties" | "listings" | "agents" | "caretakers";

export function OwnerDetailPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const { toast, bumpReload, setConfig, config, reloadKey } = usePortal();
  const [tab, setTab] = useState<Tab>("overview");
  const [owner, setOwner] = useState<Record<string, unknown> | null>(null);
  const [wallet, setWallet] = useState<Record<string, unknown> | null>(null);
  const [props, setProps] = useState<unknown[]>([]);
  const [listings, setListings] = useState<unknown[]>([]);
  const [agents, setAgents] = useState<unknown[]>([]);
  const [caretakers, setCaretakers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const [agentForm, setAgentForm] = useState({ fullName: "", phone: "", email: "" });
  const [ctForm, setCtForm] = useState({ fullName: "", phone: "", email: "" });
  const [listForm, setListForm] = useState({
    propertyId: "",
    unitNumber: "",
    floorNumber: "1",
    title: "",
    price: "",
    propertyType: "Apartment",
    listingType: "Rent",
    bedrooms: "2",
    bathrooms: "2",
  });

  useEffect(() => {
    if (!ownerId) return;
    setConfig({ defaultOwnerUserId: ownerId });
  }, [ownerId, setConfig]);

  useEffect(() => {
    if (!ownerId) return;
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const [o, w, pr, li, ag, ct] = await Promise.all([
          ownersApi.get(ownerId),
          ownersApi.wallet(ownerId),
          ownersApi.properties(ownerId),
          ownersApi.listings(ownerId, 1, 50),
          ownersApi.agents(ownerId),
          ownersApi.caretakers(ownerId),
        ]);
        if (c) return;
        setOwner(o as Record<string, unknown>);
        setWallet(w as Record<string, unknown>);
        setProps(Array.isArray(pr) ? pr : []);
        const lp = asPaginated<unknown>(li);
        setListings(lp?.items ?? (Array.isArray(li) ? li : []));
        setAgents(Array.isArray(ag) ? ag : []);
        setCaretakers(Array.isArray(ct) ? ct : []);
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Load failed", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [ownerId, toast, reloadKey]);

  async function addAgent(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) return;
    try {
      await ownersApi.createAgent(ownerId, {
        fullName: agentForm.fullName.trim(),
        phone: agentForm.phone.trim(),
        email: agentForm.email.trim() || undefined,
      });
      setAgentForm({ fullName: "", phone: "", email: "" });
      toast("Agent created.", "success");
      bumpReload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed", "error");
    }
  }

  async function addCaretaker(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId) return;
    try {
      await ownersApi.createCaretaker(ownerId, {
        fullName: ctForm.fullName.trim(),
        phone: ctForm.phone.trim(),
        email: ctForm.email.trim() || undefined,
      });
      setCtForm({ fullName: "", phone: "", email: "" });
      toast("Caretaker created.", "success");
      bumpReload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed", "error");
    }
  }

  async function addListing(e: React.FormEvent) {
    e.preventDefault();
    if (!ownerId || !listForm.propertyId) return;
    try {
      await listingsApi.createFromProperty(
        listForm.propertyId,
        {
          unitNumber: listForm.unitNumber,
          floorNumber: Number(listForm.floorNumber),
          title: listForm.title,
          description: null,
          price: Number(listForm.price),
          priceCurrency: "KES",
          propertyType: listForm.propertyType,
          listingType: listForm.listingType,
          bedrooms: Number(listForm.bedrooms),
          bathrooms: Number(listForm.bathrooms),
          isFurnished: false,
          location: null,
          amenities: [],
          images: [],
          owner: {
            name: String(owner?.fullName ?? "Owner"),
            phone: String(owner?.phone ?? ""),
            email: String(owner?.email ?? ""),
          },
          agent: null,
        },
        ownerId
      );
      toast("Listing created under property.", "success");
      bumpReload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed", "error");
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "properties", label: "Properties" },
    { id: "listings", label: "Listings" },
    { id: "agents", label: "Agents" },
    { id: "caretakers", label: "Caretakers" },
  ];

  if (!ownerId) return <p>Invalid owner.</p>;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <Link to="/owners" className="text-xs text-brand-gold font-semibold hover:underline">
            ← All owners
          </Link>
          <h2 className="font-display text-2xl text-brand-950 mt-2">
            {loading ? "…" : String(owner?.fullName ?? "Owner")}
          </h2>
          <p className="text-sm text-brand-700">{owner?.email as string} · {owner?.phone as string}</p>
        </div>
        <div className="text-right text-sm">
          <div className="text-brand-600 uppercase text-xs tracking-wider">Default X-User-Id</div>
          <code className="text-xs bg-brand-950/5 px-2 py-1 rounded">{config.defaultOwnerUserId}</code>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-8 border-b border-brand-800/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.id
                ? "bg-brand-950 text-brand-goldlight"
                : "text-brand-800 hover:bg-brand-950/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-brand-800/10 p-5 bg-white/60">
            <h3 className="font-semibold text-brand-950 mb-2">Wallet</h3>
            <p className="text-2xl font-display text-brand-gold">
              {(() => {
                const w = wallet as Record<string, unknown> | null;
                if (!w) return "—";
                const bal = w.balance ?? w.Balance;
                if (bal == null) return "—";
                const cur = w.currency ?? w.Currency ?? "KES";
                return `${bal} ${cur}`;
              })()}
            </p>
          </div>
          <div
            className="rounded-xl overflow-hidden min-h-[160px] bg-cover bg-center relative"
            style={{
              backgroundImage:
                "url(https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=80)",
            }}
          >
            <div className="absolute inset-0 bg-brand-950/60" />
            <div className="relative z-10 p-5 text-white text-sm">
              Manage this owner&apos;s buildings and units from the{" "}
              <strong>Properties</strong> and <strong>Listings</strong> tabs.
            </div>
          </div>
        </div>
      )}

      {tab === "properties" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-brand-700">Buildings linked to this owner (owner service).</p>
            <Link
              to={`/properties?ownerId=${ownerId}`}
              className="text-sm font-semibold text-brand-gold hover:underline"
            >
              Open in Properties hub →
            </Link>
          </div>
          <ul className="space-y-2">
            {props.length === 0 && <li className="text-brand-600 text-sm">No properties returned.</li>}
            {props.map((p, i) => {
              const x = p as Record<string, unknown>;
              return (
                <li
                  key={String(x.id ?? i)}
                  className="flex justify-between items-center border rounded-xl px-4 py-3 bg-white/70"
                >
                  <div>
                    <div className="font-medium">{String(x.buildingName ?? x.propertyCode ?? "Property")}</div>
                    <div className="text-xs text-brand-600">{String(x.propertyCode ?? x.id ?? "")}</div>
                  </div>
                  {x.id != null && String(x.id).length > 0 ? (
                    <Link
                      to={`/properties/${String(x.id)}/edit`}
                      className="text-sm text-brand-gold font-semibold"
                    >
                      Edit
                    </Link>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {tab === "listings" && (
        <div>
          <h3 className="font-semibold mb-4">Listings for this owner</h3>
          <div className="overflow-x-auto rounded-xl border mb-8">
            <table className="w-full text-sm">
              <thead className="bg-brand-950 text-brand-cream/90 text-xs uppercase">
                <tr>
                  <th className="px-3 py-2 text-left">Code</th>
                  <th className="px-3 py-2 text-left">Title</th>
                  <th className="px-3 py-2 text-left">Price</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {listings.map((l, i) => {
                  const x = l as Record<string, unknown>;
                  return (
                    <tr key={String(x.id ?? i)}>
                      <td className="px-3 py-2 font-mono text-xs">{String(x.listingCode ?? "")}</td>
                      <td className="px-3 py-2">{String(x.title ?? "")}</td>
                      <td className="px-3 py-2">
                        {String(x.price ?? "")} {String(x.priceCurrency ?? "")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <h3 className="font-semibold mb-2">Create listing under property</h3>
          <form onSubmit={addListing} className="grid md:grid-cols-2 gap-3 max-w-4xl">
            <input
              required
              placeholder="Property id (GUID)"
              className="border rounded-lg px-3 py-2 text-sm"
              value={listForm.propertyId}
              onChange={(e) => setListForm((f) => ({ ...f, propertyId: e.target.value }))}
            />
            <input
              placeholder="Unit e.g. 5A"
              className="border rounded-lg px-3 py-2 text-sm"
              value={listForm.unitNumber}
              onChange={(e) => setListForm((f) => ({ ...f, unitNumber: e.target.value }))}
            />
            <input
              placeholder="Title"
              className="border rounded-lg px-3 py-2 text-sm"
              value={listForm.title}
              onChange={(e) => setListForm((f) => ({ ...f, title: e.target.value }))}
            />
            <input
              placeholder="Price (KES)"
              className="border rounded-lg px-3 py-2 text-sm"
              value={listForm.price}
              onChange={(e) => setListForm((f) => ({ ...f, price: e.target.value }))}
            />
            <button
              type="submit"
              className="md:col-span-2 py-2 rounded-xl bg-brand-950 text-brand-goldlight text-sm font-semibold"
            >
              Create listing
            </button>
          </form>
        </div>
      )}

      {tab === "agents" && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Agents</h3>
            <ul className="space-y-2 mb-6">
              {agents.map((a, i) => {
                const x = a as Record<string, unknown>;
                return (
                  <li key={String(x.id ?? i)} className="border rounded-lg px-3 py-2 text-sm">
                    <strong>{String(x.fullName)}</strong> · {String(x.phone)}
                    <div className="text-xs text-brand-600 font-mono">id: {String(x.id)}</div>
                  </li>
                );
              })}
              {agents.length === 0 && <li className="text-brand-600 text-sm">No agents yet.</li>}
            </ul>
          </div>
          <form onSubmit={addAgent} className="space-y-3 border rounded-xl p-4 bg-brand-cream/50">
            <h4 className="font-semibold text-sm">New agent (linked to this owner)</h4>
            <input
              required
              placeholder="Full name"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={agentForm.fullName}
              onChange={(e) => setAgentForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <input
              required
              placeholder="Phone"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={agentForm.phone}
              onChange={(e) => setAgentForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              placeholder="Email"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={agentForm.email}
              onChange={(e) => setAgentForm((f) => ({ ...f, email: e.target.value }))}
            />
            <button type="submit" className="w-full py-2 rounded-xl bg-brand-950 text-brand-goldlight text-sm font-semibold">
              Create agent
            </button>
          </form>
        </div>
      )}

      {tab === "caretakers" && (
        <div className="grid lg:grid-cols-2 gap-8">
          <div>
            <h3 className="font-semibold mb-3">Caretakers</h3>
            <ul className="space-y-2">
              {caretakers.map((a, i) => {
                const x = a as Record<string, unknown>;
                return (
                  <li key={String(x.id ?? i)} className="border rounded-lg px-3 py-2 text-sm">
                    <strong>{String(x.fullName)}</strong> · {String(x.phone)}
                    <div className="text-xs text-brand-600 font-mono">id: {String(x.id)}</div>
                  </li>
                );
              })}
              {caretakers.length === 0 && <li className="text-brand-600 text-sm">No caretakers yet.</li>}
            </ul>
          </div>
          <form onSubmit={addCaretaker} className="space-y-3 border rounded-xl p-4 bg-brand-cream/50">
            <h4 className="font-semibold text-sm">New caretaker</h4>
            <input
              required
              placeholder="Full name"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={ctForm.fullName}
              onChange={(e) => setCtForm((f) => ({ ...f, fullName: e.target.value }))}
            />
            <input
              required
              placeholder="Phone"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={ctForm.phone}
              onChange={(e) => setCtForm((f) => ({ ...f, phone: e.target.value }))}
            />
            <input
              placeholder="Email"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={ctForm.email}
              onChange={(e) => setCtForm((f) => ({ ...f, email: e.target.value }))}
            />
            <button type="submit" className="w-full py-2 rounded-xl bg-brand-950 text-brand-goldlight text-sm font-semibold">
              Create caretaker
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
