import { effectiveOwnerId } from "../lib/effectiveOwner";
import { usePortal } from "../context/PortalContext";

export function ManagementOwnerScope() {
  const {
    config,
    setConfig,
    toast,
    bumpReload,
    ownerDirectory,
    ownerDirectoryLoading,
    refreshOwnerDirectory,
  } = usePortal();
  const value = effectiveOwnerId(config);

  return (
    <div className="mb-6 pb-6 border-b border-brand-950/10 flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-6">
      <div className="flex-1 min-w-0">
        <label className="block text-xs font-bold text-brand-800 uppercase tracking-wide">
          Active property owner
        </label>
        <p className="text-xs text-brand-600 mt-1 max-w-xl">
          Loaded from <code className="text-[10px] bg-brand-950/5 px-1 rounded">GET …/owners/portal-directory</code>.
          Properties, listings, and mutations use this id as <strong>Default X-User-Id</strong>.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:w-[22rem] shrink-0">
        <select
          className="mt-1 w-full border border-brand-950/15 rounded-lg px-3 py-2 text-sm bg-white"
          disabled={ownerDirectoryLoading}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            setConfig({ defaultOwnerUserId: v });
            bumpReload();
            toast(v ? "Owner scope updated." : "Cleared owner scope.", "success");
          }}
        >
          <option value="">
            {ownerDirectoryLoading ? "Loading owners…" : "— Select an owner —"}
          </option>
          {ownerDirectory.map((o) => (
            <option key={o.id} value={o.id}>
              {o.fullName || o.email || o.id.slice(0, 8)}
              {o.email ? ` · ${o.email}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="text-xs py-2 px-3 rounded-lg border border-brand-950/15 text-brand-800 hover:bg-brand-950/5 whitespace-nowrap"
          onClick={() => void refreshOwnerDirectory()}
          disabled={ownerDirectoryLoading}
        >
          Refresh list
        </button>
      </div>
    </div>
  );
}
