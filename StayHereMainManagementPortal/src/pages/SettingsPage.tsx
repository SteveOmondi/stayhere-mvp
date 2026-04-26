import { FormEvent, useState } from "react";
import { loadConfig, saveConfig, type PortalConfig } from "../lib/config";
import { usePortal } from "../context/PortalContext";

export function SettingsPage() {
  const { setConfig, toast } = usePortal();
  const [f, setF] = useState<PortalConfig>(() => loadConfig());

  function save(e: FormEvent) {
    e.preventDefault();
    saveConfig(f);
    setConfig(f);
    toast("Configuration saved.", "success");
  }

  return (
    <div className="max-w-2xl">
      <h2 className="font-display text-2xl text-brand-950 mb-2">API configuration</h2>
      <p className="text-sm text-brand-700 mb-6">
        Values are stored in <code className="text-xs bg-brand-950/5 px-1 rounded">localStorage</code> for this browser.
        In <strong>npm run dev</strong>, defaults use same-origin paths (<code className="text-xs">/stayhere-api/…</code>) so Vite proxies to ports <strong>7100–7105</strong> without CORS.
        Production builds use full URLs from env or the values you save here.
      </p>
      <form onSubmit={save} className="space-y-4">
        {(
          [
            ["propertyOwnerApiBase", "Property owner service"],
            ["propertyApiBase", "Property & listings service"],
            ["customerApiBase", "Customer service"],
            ["staticApiBase", "Static data service"],
          ] as const
        ).map(([key, label]) => (
          <label key={key} className="block text-xs font-bold text-brand-800 uppercase">
            {label}
            <input
              className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono"
              value={f[key]}
              onChange={(e) => setF((x) => ({ ...x, [key]: e.target.value }))}
            />
          </label>
        ))}
        <label className="block text-xs font-bold text-brand-800 uppercase">
          Default X-User-Id (property owner GUID)
          <span className="block font-normal normal-case text-brand-600 font-sans mt-1 mb-1">
            The header <strong>Active property owner</strong> dropdown updates this value so PropertyService calls use the correct owner.
          </span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono"
            placeholder="Required for PropertyService writes when SKIP_AUTH=true"
            value={f.defaultOwnerUserId}
            onChange={(e) => setF((x) => ({ ...x, defaultOwnerUserId: e.target.value }))}
          />
        </label>
        <label className="block text-xs font-bold text-brand-800 uppercase">
          Static data Bearer token (admin categories)
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2 text-sm font-mono"
            value={f.staticDataBearer}
            onChange={(e) => setF((x) => ({ ...x, staticDataBearer: e.target.value }))}
          />
        </label>
        <button
          type="submit"
          className="w-full py-3 rounded-xl bg-brand-950 text-brand-goldlight font-semibold"
        >
          Save settings
        </button>
      </form>
    </div>
  );
}
