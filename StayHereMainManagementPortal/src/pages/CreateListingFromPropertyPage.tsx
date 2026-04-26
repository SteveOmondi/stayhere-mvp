import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, listingsApi, ownersApi, propertiesApi } from "../lib/api";
import { effectiveOwnerId } from "../lib/effectiveOwner";
import {
  filesToListingImageDataUrls,
  MAX_LISTING_IMAGES,
  parseImageUrlLines,
} from "../lib/listingImages";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";

type PropRow = Record<string, unknown>;

export function CreateListingFromPropertyPage() {
  const nav = useNavigate();
  const {
    config,
    setConfig,
    toast,
    bumpReload,
    ownerDirectory,
    ownerDirectoryLoading,
    refreshOwnerDirectory,
  } = usePortal();

  const ownerId = effectiveOwnerId(config);
  const ownerEntry = useMemo(
    () => ownerDirectory.find((o) => o.id === ownerId),
    [ownerDirectory, ownerId]
  );

  const [properties, setProperties] = useState<PropRow[]>([]);
  const [propsLoading, setPropsLoading] = useState(false);
  const [propertyId, setPropertyId] = useState("");
  const [imageUrlsText, setImageUrlsText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [form, setForm] = useState({
    unitNumber: "",
    floorNumber: "1",
    title: "",
    description: "",
    price: "",
    priceCurrency: "KES",
    propertyType: "Apartment",
    listingType: "Rent",
    bedrooms: "2",
    bathrooms: "2",
    isFurnished: false,
    amenities: "",
    sizeSqft: "",
    yearBuilt: "",
    developer: "",
    agentName: "",
    agentPhone: "",
    agentEmail: "",
  });

  useEffect(() => {
    if (!ownerId) {
      setProperties([]);
      setPropertyId("");
      return;
    }
    let c = false;
    (async () => {
      setPropsLoading(true);
      try {
        const data = await propertiesApi.byOwner(ownerId, 1, 100);
        const p = asPaginated<PropRow>(data);
        const items = p?.items ?? [];
        if (!c) {
          setProperties(items);
          setPropertyId((cur) => {
            if (cur && items.some((x) => String(x.id) === cur)) return cur;
            return items.length ? String(items[0].id) : "";
          });
        }
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load properties", "error");
      } finally {
        if (!c) setPropsLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [ownerId, toast]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files?.length) return;
    const remaining = MAX_LISTING_IMAGES - previewUrls.length;
    if (remaining <= 0) {
      toast(`Maximum ${MAX_LISTING_IMAGES} images.`, "error");
      e.target.value = "";
      return;
    }
    setUploading(true);
    try {
      const next = await filesToListingImageDataUrls(Array.from(files).slice(0, remaining));
      setPreviewUrls((prev) => [...prev, ...next].slice(0, MAX_LISTING_IMAGES));
      toast(`Added ${next.length} image(s).`, "success");
    } catch (err) {
      toast(err instanceof Error ? err.message : "Image processing failed", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removePreview(i: number) {
    setPreviewUrls((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!ownerId) {
      toast("Select a property owner first.", "error");
      return;
    }
    if (!propertyId) {
      toast("Select a property.", "error");
      return;
    }
    const urlImages = parseImageUrlLines(imageUrlsText);
    const combined = [...previewUrls, ...urlImages].slice(0, MAX_LISTING_IMAGES);
    let ownerName = ownerEntry?.fullName ?? "";
    let ownerPhone = ownerEntry?.phone ?? "";
    let ownerEmail = ownerEntry?.email ?? "";
    if (!ownerName || !ownerPhone) {
      try {
        const o = (await ownersApi.get(ownerId)) as Record<string, unknown>;
        ownerName = ownerName || String(o.fullName ?? "");
        ownerPhone = ownerPhone || String(o.phone ?? "");
        ownerEmail = ownerEmail || String(o.email ?? "");
      } catch {
        /* use directory only */
      }
    }
    const hasAgent =
      form.agentName.trim() && form.agentPhone.trim();
    try {
      await listingsApi.createFromProperty(
        propertyId,
        {
          unitNumber: form.unitNumber.trim(),
          floorNumber: Number(form.floorNumber) || 1,
          title: form.title.trim(),
          description: form.description.trim() || null,
          price: Number(form.price),
          priceCurrency: form.priceCurrency.trim() || "KES",
          propertyType: form.propertyType,
          listingType: form.listingType,
          bedrooms: Number(form.bedrooms) || 0,
          bathrooms: Number(form.bathrooms) || 0,
          isFurnished: form.isFurnished,
          location: null,
          amenities: form.amenities
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          images: combined,
          sizeSqft: form.sizeSqft.trim() ? Number(form.sizeSqft) : null,
          yearBuilt: form.yearBuilt.trim() ? Number(form.yearBuilt) : null,
          developer: form.developer.trim() || null,
          owner: {
            name: ownerName || "Owner",
            phone: ownerPhone || "+000",
            email: ownerEmail || null,
          },
          agent: hasAgent
            ? {
                name: form.agentName.trim(),
                phone: form.agentPhone.trim(),
                email: form.agentEmail.trim() || null,
              }
            : null,
        },
        ownerId
      );
      toast("Listing created.", "success");
      bumpReload();
      nav("/listings");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Create failed", "error");
    }
  }

  const selectedProperty = properties.find((p) => String(p.id) === propertyId);

  return (
    <div className="max-w-3xl">
      <Link to="/listings" className="text-xs text-brand-gold font-semibold hover:underline">
        ← Listings hub
      </Link>
      <h2 className="font-display text-2xl text-brand-950 mt-2 mb-1">New listing from property</h2>
      <p className="text-sm text-brand-700 mb-6">
        Choose the owning account, pick one of their buildings, then describe the unit. Images: up to{" "}
        {MAX_LISTING_IMAGES} (upload and/or HTTPS URLs). Data is sent as JSON to PropertyService{" "}
        <code className="text-xs bg-brand-950/5 px-1 rounded">POST /properties/{"{id}"}/listings</code>.
      </p>

      <div className="rounded-xl border border-brand-800/10 p-4 mb-6 bg-white/70 space-y-3">
        <label className="block text-xs font-bold text-brand-800 uppercase">
          Property owner (portal directory)
        </label>
        <div className="flex flex-wrap gap-2 items-center">
          <select
            className="flex-1 min-w-[200px] border rounded-lg px-3 py-2 text-sm"
            disabled={ownerDirectoryLoading}
            value={ownerId}
            onChange={(e) => {
              setConfig({ defaultOwnerUserId: e.target.value });
              bumpReload();
            }}
          >
            <option value="">{ownerDirectoryLoading ? "Loading…" : "— Select owner —"}</option>
            {ownerDirectory.map((o) => (
              <option key={o.id} value={o.id}>
                {o.fullName || o.email || o.id.slice(0, 8)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-xs py-2 px-3 rounded-lg border"
            onClick={() => void refreshOwnerDirectory()}
            disabled={ownerDirectoryLoading}
          >
            Reload owners
          </button>
        </div>
        {!ownerDirectory.length && !ownerDirectoryLoading && (
          <p className="text-xs text-amber-800">
            No owners returned. Start PropertyOwnerService on port 7103 and ensure the database is reachable, then
            press Reload owners.
          </p>
        )}
      </div>

      {!ownerId ? (
        <p className="text-sm text-brand-600">Select an owner above to load their properties.</p>
      ) : propsLoading ? (
        <p className="text-sm text-brand-600">Loading properties…</p>
      ) : properties.length === 0 ? (
        <p className="text-sm text-brand-600">
          This owner has no properties yet.{" "}
          <Link className="text-brand-gold font-semibold" to="/properties/new">
            Create a property
          </Link>{" "}
          first.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-xs font-bold text-brand-800 uppercase">
            Property
            <select
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={propertyId}
              onChange={(e) => setPropertyId(e.target.value)}
              required
            >
              {properties.map((p) => (
                <option key={String(p.id)} value={String(p.id)}>
                  {String(p.propertyCode ?? "")} — {String(p.buildingName ?? "")} ·{" "}
                  {String(p.city ?? "")}
                </option>
              ))}
            </select>
          </label>
          {selectedProperty && (
            <p className="text-xs text-brand-600">
              Owner must match header: listings are created under this building for the selected owner.
            </p>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Unit #
              <input
                required
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.unitNumber}
                onChange={(e) => setForm((f) => ({ ...f, unitNumber: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Floor
              <input
                required
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.floorNumber}
                onChange={(e) => setForm((f) => ({ ...f, floorNumber: e.target.value }))}
              />
            </label>
          </div>

          <label className="block text-xs font-bold text-brand-800 uppercase">
            Title
            <input
              required
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </label>

          <label className="block text-xs font-bold text-brand-800 uppercase">
            Description
            <textarea
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Price
              <input
                required
                type="number"
                step="0.01"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.price}
                onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Currency
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.priceCurrency}
                onChange={(e) => setForm((f) => ({ ...f, priceCurrency: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Property type
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.propertyType}
                onChange={(e) => setForm((f) => ({ ...f, propertyType: e.target.value }))}
              >
                {["Apartment", "House", "Townhouse", "Studio", "Penthouse", "Commercial"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Listing type
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.listingType}
                onChange={(e) => setForm((f) => ({ ...f, listingType: e.target.value }))}
              >
                {["Rent", "Sale", "ShortStay"].map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Bedrooms
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.bedrooms}
                onChange={(e) => setForm((f) => ({ ...f, bedrooms: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Bathrooms
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.bathrooms}
                onChange={(e) => setForm((f) => ({ ...f, bathrooms: e.target.value }))}
              />
            </label>
          </div>

          <label className="flex items-center gap-2 text-sm text-brand-800">
            <input
              type="checkbox"
              checked={form.isFurnished}
              onChange={(e) => setForm((f) => ({ ...f, isFurnished: e.target.checked }))}
            />
            Furnished
          </label>

          <label className="block text-xs font-bold text-brand-800 uppercase">
            Amenities (comma-separated)
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="WiFi, Parking, Gym"
              value={form.amenities}
              onChange={(e) => setForm((f) => ({ ...f, amenities: e.target.value }))}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Size (sq ft)
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.sizeSqft}
                onChange={(e) => setForm((f) => ({ ...f, sizeSqft: e.target.value }))}
              />
            </label>
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Year built
              <input
                type="number"
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                value={form.yearBuilt}
                onChange={(e) => setForm((f) => ({ ...f, yearBuilt: e.target.value }))}
              />
            </label>
          </div>

          <label className="block text-xs font-bold text-brand-800 uppercase">
            Developer (optional)
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
              value={form.developer}
              onChange={(e) => setForm((f) => ({ ...f, developer: e.target.value }))}
            />
          </label>

          <fieldset className="border border-brand-800/10 rounded-xl p-4 space-y-2">
            <legend className="text-xs font-bold text-brand-800 px-1">Optional agent on listing</legend>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Agent name"
              value={form.agentName}
              onChange={(e) => setForm((f) => ({ ...f, agentName: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Agent phone"
              value={form.agentPhone}
              onChange={(e) => setForm((f) => ({ ...f, agentPhone: e.target.value }))}
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Agent email"
              value={form.agentEmail}
              onChange={(e) => setForm((f) => ({ ...f, agentEmail: e.target.value }))}
            />
          </fieldset>

          <div className="border border-brand-800/10 rounded-xl p-4 space-y-3">
            <h3 className="text-xs font-bold text-brand-800 uppercase">
              Images (max {MAX_LISTING_IMAGES})
            </h3>
            <p className="text-xs text-brand-600">
              Upload JPG/PNG/WebP (compressed in-browser), and/or paste HTTPS URLs — one per line. Stored as
              strings in the listing record (for production, prefer CDN URLs).
            </p>
            <input
              type="file"
              accept="image/*"
              multiple
              disabled={uploading || previewUrls.length >= MAX_LISTING_IMAGES}
              onChange={onPickFiles}
              className="text-sm"
            />
            {uploading && <p className="text-xs text-brand-600">Processing images…</p>}
            {previewUrls.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previewUrls.map((src, i) => (
                  <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border group">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 group-hover:opacity-100"
                      onClick={() => removePreview(i)}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            <label className="block text-xs font-bold text-brand-800 uppercase">
              Image URLs
              <textarea
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono min-h-[72px]"
                placeholder={"https://cdn.example.com/a.jpg\nhttps://cdn.example.com/b.jpg"}
                value={imageUrlsText}
                onChange={(e) => setImageUrlsText(e.target.value)}
              />
            </label>
            <p className="text-xs text-brand-600">
              Total images sent:{" "}
              {Math.min(MAX_LISTING_IMAGES, previewUrls.length + parseImageUrlLines(imageUrlsText).length)} /{" "}
              {MAX_LISTING_IMAGES}
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="py-3 px-6 rounded-xl bg-brand-950 text-brand-goldlight font-semibold text-sm"
            >
              Create listing
            </button>
            <Link to="/properties" className="py-3 px-4 text-sm text-brand-800 border rounded-xl">
              Cancel
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
