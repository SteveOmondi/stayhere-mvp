import { useState } from "react";
import { useOwner } from "../context/OwnerContext";
import { ownerApi, ApiError } from "../lib/api";
import { loadConfig, saveConfig } from "../lib/config";
import { IcoSettings, IcoCheck, IcoLoader, IcoUser, IcoShield } from "../components/icons";

export function SettingsPage() {
  const { owner, authUser, toast, bumpReload } = useOwner();

  const cfg = loadConfig();
  const [apiForm, setApiForm] = useState({
    ownerApiBase: cfg.ownerApiBase,
    propertyApiBase: cfg.propertyApiBase,
    customerApiBase: cfg.customerApiBase,
    aiApiBase: cfg.aiApiBase,
  });
  const [savingApi, setSavingApi] = useState(false);

  const [profileForm, setProfileForm] = useState({
    fullName: owner?.fullName ?? "",
    email: owner?.email ?? "",
    phone: owner?.phone ?? "",
  });
  const [savingProfile, setSavingProfile] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!owner?.id) { toast("Owner profile not loaded.", "error"); return; }
    setSavingProfile(true);
    try {
      await ownerApi.update(owner.id, { fullName: profileForm.fullName, email: profileForm.email, phone: profileForm.phone });
      toast("Profile updated successfully.", "success");
      bumpReload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Failed to update profile", "error");
    } finally { setSavingProfile(false); }
  }

  function handleSaveApi(e: React.FormEvent) {
    e.preventDefault();
    setSavingApi(true);
    saveConfig(apiForm);
    setTimeout(() => {
      setSavingApi(false);
      toast("API endpoints saved. Refresh the page to apply changes.", "success");
    }, 600);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-2xl text-brand-950">Settings</h1>
        <p className="text-sm text-brand-500 mt-0.5">Manage your profile and portal configuration</p>
      </div>

      {/* Profile info */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 pb-4 border-b border-black/[0.07]">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold text-white"
            style={{ background: "linear-gradient(135deg,#5eead4,#0d9488)" }}>
            {(owner?.fullName ?? authUser?.name ?? "O").charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="font-semibold text-brand-900">{owner?.fullName ?? authUser?.name ?? "Owner"}</div>
            <div className="text-xs text-brand-400">{owner?.email ?? authUser?.email ?? ""}</div>
            <span className="badge badge-teal mt-1">Property Owner</span>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <IcoUser size={16} className="text-teal-600" />
          <h3 className="font-semibold text-brand-900 text-sm">Profile Details</h3>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="field">
            <label className="field-label">Full Name</label>
            <input className="input" value={profileForm.fullName} onChange={e => setProfileForm(f => ({ ...f, fullName: e.target.value }))} placeholder="Your full name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="field">
              <label className="field-label">Email</label>
              <input type="email" className="input" value={profileForm.email} onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" />
            </div>
            <div className="field">
              <label className="field-label">Phone</label>
              <input className="input" value={profileForm.phone} onChange={e => setProfileForm(f => ({ ...f, phone: e.target.value }))} placeholder="+254 700 000000" />
            </div>
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={savingProfile} className="btn-teal gap-2 disabled:opacity-50">
              {savingProfile ? <IcoLoader size={14} /> : <IcoCheck size={14} />}
              {savingProfile ? "Saving…" : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Wallet info */}
      {owner?.walletBalance != null && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <IcoSettings size={16} className="text-teal-600" />
            <h3 className="font-semibold text-brand-900 text-sm">Wallet</h3>
          </div>
          <div className="p-4 rounded-xl" style={{ background: "rgba(13,148,136,0.07)", border: "1px solid rgba(13,148,136,0.15)" }}>
            <div className="text-xs text-teal-600 uppercase tracking-wide mb-1">Available Balance</div>
            <div className="text-2xl font-bold text-teal-700">KES {owner.walletBalance.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* API endpoints */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <IcoShield size={16} className="text-teal-600" />
          <h3 className="font-semibold text-brand-900 text-sm">API Endpoints</h3>
          <span className="ml-auto badge badge-neutral">Advanced</span>
        </div>
        <p className="text-xs text-brand-400 -mt-1">Override these only if you're connecting to a different backend environment.</p>
        <form onSubmit={handleSaveApi} className="space-y-3">
          {[
            { key: "ownerApiBase" as const, label: "Owner API Base" },
            { key: "propertyApiBase" as const, label: "Property API Base" },
            { key: "customerApiBase" as const, label: "Customer API Base" },
            { key: "aiApiBase" as const, label: "AI Agent API Base" },
          ].map(({ key, label }) => (
            <div key={key} className="field">
              <label className="field-label">{label}</label>
              <input className="input font-mono text-xs" value={apiForm[key]} onChange={e => setApiForm(f => ({ ...f, [key]: e.target.value }))} />
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={savingApi} className="btn-secondary gap-2 disabled:opacity-50">
              {savingApi ? <IcoLoader size={14} /> : <IcoCheck size={14} />}
              {savingApi ? "Saving…" : "Save Endpoints"}
            </button>
          </div>
        </form>
      </div>

      {/* Session info */}
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-3">
          <IcoShield size={16} className="text-brand-500" />
          <h3 className="font-semibold text-brand-900 text-sm">Session</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-black/[0.05]">
            <span className="text-brand-500">Owner ID</span>
            <span className="font-mono text-xs text-brand-700">{owner?.id ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-black/[0.05]">
            <span className="text-brand-500">User ID</span>
            <span className="font-mono text-xs text-brand-700">{authUser?.userId ?? "—"}</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-brand-500">Role</span>
            <span className="badge badge-teal">{authUser?.role ?? "PropertyOwner"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
