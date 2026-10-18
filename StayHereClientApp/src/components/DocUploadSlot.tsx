import { useRef } from "react";
import { IcoCheck, IcoLoader } from "./icons";

export type DocState = { file?: File; url?: string; uploading: boolean; error?: string };

/** A single ID-document upload slot (preview thumbnail once uploaded, drag/tap-to-replace) -
 * shared by RentalFlowPage's long-term application flow and ShortStayBookingPage's lighter
 * post-payment ID verification step, so the two never drift out of sync visually. */
export function DocUploadSlot({ docKey, label, hint, state, onChange }: {
  docKey: string; label: string; hint: string;
  state: DocState;
  onChange: (key: string, file: File) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`glass rounded-2xl p-4 border transition ${state.url ? "border-emerald-500/30" : state.error ? "border-red-500/30" : "border-white/10"}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-white">{label}</span>
        {state.url && <span className="flex items-center gap-1 text-xs text-emerald-400"><IcoCheck size={12} /> Uploaded</span>}
        {state.error && <span className="text-xs text-red-400">{state.error}</span>}
      </div>
      <p className="text-xs text-brand-muted mb-3">{hint}</p>
      {state.url ? (
        <div className="flex items-center gap-3">
          <img src={state.url} alt="Preview" className="h-12 w-16 object-cover rounded-lg" />
          <button onClick={() => inputRef.current?.click()} className="text-xs text-brand-teallight hover:underline">Replace</button>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()} disabled={state.uploading}
          className="flex items-center gap-2 rounded-xl border border-dashed border-white/20 px-4 py-2.5 text-sm text-brand-muted hover:border-brand-gold/40 hover:text-white transition w-full justify-center">
          {state.uploading ? <IcoLoader size={16} className="animate-spin" /> : "📎 Choose File"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onChange(docKey, f); }} />
    </div>
  );
}
