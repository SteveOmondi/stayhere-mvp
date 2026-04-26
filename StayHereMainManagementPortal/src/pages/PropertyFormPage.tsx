import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, propertiesApi } from "../lib/api";
import { usePortal } from "../context/PortalContext";

const emptyLoc = {
  country: "Kenya",
  county: "Nairobi",
  city: "Nairobi",
  suburb: "Westlands",
  street: "",
  latitude: null as number | null,
  longitude: null as number | null,
};

export function PropertyFormPage() {
  const { propertyId } = useParams<{ propertyId?: string }>();
  const isEdit = Boolean(propertyId && propertyId !== "new");
  const nav = useNavigate();
  const { toast, config, bumpReload } = usePortal();
  const [form, setForm] = useState({
    buildingName: "",
    description: "",
    totalUnits: 1,
    totalFloors: 1,
    location: { ...emptyLoc },
  });

  useEffect(() => {
    if (!isEdit || !propertyId) return;
    let c = false;
    (async () => {
      try {
        const p = (await propertiesApi.get(propertyId)) as Record<string, unknown>;
        if (c || !p) return;
        const loc = (p.location as Record<string, unknown>) ?? {};
        setForm({
          buildingName: String(p.buildingName ?? ""),
          description: String(p.description ?? ""),
          totalUnits: Number(p.totalUnits ?? 1),
          totalFloors: Number(p.totalFloors ?? 1),
          location: {
            country: String(loc.country ?? "Kenya"),
            county: String(loc.county ?? ""),
            city: String(loc.city ?? ""),
            suburb: String(loc.suburb ?? ""),
            street: String(loc.street ?? ""),
            latitude: (loc.latitude as number) ?? null,
            longitude: (loc.longitude as number) ?? null,
          },
        });
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Load failed", "error");
      }
    })();
    return () => {
      c = true;
    };
  }, [isEdit, propertyId, toast]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const ownerId = config.defaultOwnerUserId?.trim();
    if (!ownerId) {
      toast("Set Default owner (X-User-Id) in Settings first.", "error");
      return;
    }
    try {
      if (isEdit && propertyId) {
        await propertiesApi.update(
          propertyId,
          {
            buildingName: form.buildingName,
            description: form.description || null,
            totalUnits: form.totalUnits,
            totalFloors: form.totalFloors,
            location: form.location,
          },
          ownerId
        );
        toast("Property updated.", "success");
      } else {
        await propertiesApi.create(
          {
            buildingName: form.buildingName,
            description: form.description || null,
            totalUnits: form.totalUnits,
            totalFloors: form.totalFloors,
            location: form.location,
          },
          ownerId
        );
        toast("Property created.", "success");
      }
      bumpReload();
      nav("/properties");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Save failed", "error");
    }
  }

  return (
    <div className="max-w-2xl">
      <Link to="/properties" className="text-xs text-brand-gold font-semibold hover:underline">
        ← Properties
      </Link>
      <h2 className="font-display text-2xl text-brand-950 mt-2 mb-6">
        {isEdit ? "Edit property" : "New property"}
      </h2>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-bold text-brand-800 uppercase">
          Building name
          <input
            required
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={form.buildingName}
            onChange={(e) => setForm((f) => ({ ...f, buildingName: e.target.value }))}
          />
        </label>
        <label className="block text-xs font-bold text-brand-800 uppercase">
          Description
          <textarea
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-xs font-bold text-brand-800 uppercase">
            Total units
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.totalUnits}
              onChange={(e) => setForm((f) => ({ ...f, totalUnits: Number(e.target.value) }))}
            />
          </label>
          <label className="text-xs font-bold text-brand-800 uppercase">
            Total floors
            <input
              type="number"
              min={1}
              className="mt-1 w-full border rounded-lg px-3 py-2"
              value={form.totalFloors}
              onChange={(e) => setForm((f) => ({ ...f, totalFloors: Number(e.target.value) }))}
            />
          </label>
        </div>
        <fieldset className="border rounded-xl p-4 space-y-2">
          <legend className="text-xs font-bold text-brand-800 px-2">Location</legend>
          {(["country", "county", "city", "suburb", "street"] as const).map((k) => (
            <label key={k} className="block text-xs capitalize text-brand-700">
              {k}
              <input
                className="mt-0.5 w-full border rounded-lg px-3 py-1.5 text-sm"
                value={String(form.location[k] ?? "")}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location: { ...f.location, [k]: e.target.value },
                  }))
                }
              />
            </label>
          ))}
        </fieldset>
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-brand-950 text-brand-goldlight font-semibold"
        >
          {isEdit ? "Save changes" : "Create property"}
        </button>
      </form>
    </div>
  );
}
