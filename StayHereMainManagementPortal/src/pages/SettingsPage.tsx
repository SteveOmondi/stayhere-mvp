import { FormEvent, useState } from "react";
import { loadConfig, saveConfig, type PortalConfig } from "../lib/config";
import { usePortal } from "../context/PortalContext";
import { IcoSettings, IcoCheck, IcoKey, IcoRefresh } from "../components/icons";

const APIM_ROOT = "https://apim-dev-5c27bcf3.azure-api.net";

const API_FIELDS: Array<{ key: keyof PortalConfig; label: string; hint: string; color: string }> = [
  { key: "authApiBase",          label: "Auth Service",                hint: "Authentication & user management",          color: "#3b82f6" },
  { key: "propertyOwnerApiBase", label: "Property Owner Service",      hint: "Owners, agents, caretakers",                color: "#c9a227" },
  { key: "propertyApiBase",      label: "Property & Listings Service", hint: "Properties, listings, assignments",          color: "#10b981" },
  { key: "customerApiBase",      label: "Customer Service",            hint: "Renter profiles & KYC",                     color: "#8b5cf6" },
  { key: "staticApiBase",        label: "Static Data Service",         hint: "Categories & reference data",               color: "#f59e0b" },
  { key: "aiAgentApiBase",       label: "AI Agent Service",            hint: "AI chat, search & recommendations",         color: "#ef4444" },
];

const PRESET_AZURE = {
  authApiBase:          `${APIM_ROOT}/auth`,
  propertyOwnerApiBase: `${APIM_ROOT}/propertyowner`,
  propertyApiBase:      `${APIM_ROOT}/property`,
  customerApiBase:      `${APIM_ROOT}/customers`,
  staticApiBase:        `${APIM_ROOT}/staticdata`,
  aiAgentApiBase:       `${APIM_ROOT}/aiagent`,
};

const PRESET_LOCAL = {
  authApiBase:          "http://localhost:7100/api",
  propertyOwnerApiBase: "http://localhost:7103/api",
  propertyApiBase:      "http://localhost:7101/api",
  customerApiBase:      "http://localhost:7102/api",
  staticApiBase:        "http://localhost:7104/api",
  aiAgentApiBase:       "http://localhost:7105/api",
};

export function SettingsPage() {
  const { setConfig, toast } = usePortal();
  const [f, setF] = useState<PortalConfig>(() => loadConfig());
  const [saved, setSaved] = useState(false);

  function save(e: FormEvent) {
    e.preventDefault();
    saveConfig(f);
    setConfig(f);
    setSaved(true);
    toast("Configuration saved successfully.", "success");
    setTimeout(() => setSaved(false), 2000);
  }

  function applyPreset(preset: Partial<PortalConfig>) {
    setF(prev => ({ ...prev, ...preset }));
    toast("Preset applied — click Save to confirm.", "info");
  }

  return (
    <div className="space-y-6 animate-slide-up max-w-3xl">

      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#47556918" }}>
            <IcoSettings size={17} style={{ color: "#475569" }} />
          </div>
          <h2 className="font-display text-3xl text-brand-900">Settings</h2>
        </div>
        <p className="text-sm text-brand-500">
          Configure API endpoints · values stored in browser localStorage
        </p>
      </div>

      {/* Presets */}
      <div className="portal-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-brand-900">Quick Presets</h3>
            <p className="text-xs text-brand-500 mt-0.5">Load a preset then save to apply</p>
          </div>
        </div>
        <div className="flex gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => applyPreset(PRESET_AZURE)}
            className="btn-primary text-sm"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
            Azure APIM (Production)
          </button>
          <button
            type="button"
            onClick={() => applyPreset(PRESET_LOCAL)}
            className="btn-secondary text-sm"
          >
            <IcoRefresh size={14} /> Localhost (Development)
          </button>
        </div>
        <div className="mt-3 p-3 rounded-xl text-xs text-brand-600 border border-blue-100" style={{ background: "#eff6ff" }}>
          <strong>Azure APIM base:</strong>{" "}
          <code className="font-mono text-blue-700">{APIM_ROOT}</code>
          <br />
          In <strong>npm run dev</strong>, use same-origin <code>/stayhere-api/…</code> paths — they proxy to ports 7100–7105 without CORS.
        </div>
      </div>

      {/* API Endpoints */}
      <form onSubmit={save} className="space-y-4">
        <div className="portal-card p-5">
          <h3 className="font-semibold text-brand-900 mb-4">API Endpoints</h3>
          <div className="space-y-4">
            {API_FIELDS.map(({ key, label, hint, color }) => (
              <div key={key} className="portal-field">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                  <label className="text-xs font-bold text-brand-700 uppercase tracking-wide">{label}</label>
                  <span className="text-[10px] text-brand-400 font-normal normal-case">{hint}</span>
                </div>
                <input
                  className="portal-input font-mono text-xs"
                  value={f[key] as string}
                  onChange={e => setF(x => ({ ...x, [key]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Auth & tokens */}
        <div className="portal-card p-5">
          <h3 className="font-semibold text-brand-900 mb-4">Identity & Tokens</h3>
          <div className="space-y-4">
            <div className="portal-field">
              <label className="portal-label">
                Default Owner ID (X-User-Id)
              </label>
              <div className="text-xs text-brand-500 mb-1.5">
                The <strong>Active Owner</strong> dropdown in the sidebar sets this automatically.
                PropertyService mutations use it as the <code className="text-[10px] bg-slate-100 px-1 rounded">X-User-Id</code> header.
              </div>
              <input
                className="portal-input font-mono text-xs"
                placeholder="Property owner GUID"
                value={f.defaultOwnerUserId}
                onChange={e => setF(x => ({ ...x, defaultOwnerUserId: e.target.value }))}
              />
            </div>

            <div className="portal-field">
              <label className="portal-label flex items-center gap-1.5">
                <IcoKey size={13} /> Static Data Bearer Token
              </label>
              <div className="text-xs text-brand-500 mb-1.5">
                Required for admin category routes on the Static Data Service.
              </div>
              <input
                type="password"
                className="portal-input font-mono text-xs"
                placeholder="Bearer token for staticdata/categories/all"
                value={f.staticDataBearer}
                onChange={e => setF(x => ({ ...x, staticDataBearer: e.target.value }))}
              />
            </div>

            <div className="portal-field">
              <label className="portal-label flex items-center gap-1.5">
                <IcoKey size={13} /> Auth Bearer Token
              </label>
              <div className="text-xs text-brand-500 mb-1.5">
                JWT from the Auth service — used for authenticated API calls.
              </div>
              <input
                type="password"
                className="portal-input font-mono text-xs"
                placeholder="Bearer token from auth/login"
                value={f.authToken}
                onChange={e => setF(x => ({ ...x, authToken: e.target.value }))}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn-primary w-full py-3 justify-center text-base">
          {saved ? <><IcoCheck size={17} /> Saved!</> : "Save Configuration"}
        </button>
      </form>
    </div>
  );
}
