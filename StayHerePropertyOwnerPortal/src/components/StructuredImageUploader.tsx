import { useState } from "react";
import { uploadApi, uploadToR2 } from "../lib/api";
import { IcoPlus, IcoLoader } from "./icons";

export type ImageSection = { key: string; label: string };

type Props = {
  sections: ImageSection[];
  value: Record<string, string[]>;
  onChange: (updated: Record<string, string[]>) => void;
  uploadFolder: string;
  maxPerSection?: number;
};

export function StructuredImageUploader({ sections, value, onChange, uploadFolder, maxPerSection = 6 }: Props) {
  const [openKey, setOpenKey] = useState<string | null>(sections[0]?.key ?? null);
  const [uploading, setUploading] = useState<Record<string, boolean[]>>(() =>
    Object.fromEntries(sections.map(s => [s.key, Array(maxPerSection).fill(false)]))
  );

  function setSlot(sectionKey: string, idx: number, val: boolean) {
    setUploading(prev => ({
      ...prev,
      [sectionKey]: (prev[sectionKey] ?? []).map((v, i) => i === idx ? val : v),
    }));
  }

  async function handleFile(sectionKey: string, slotIdx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSlot(sectionKey, slotIdx, true);
    try {
      const ct = file.type || "image/jpeg";
      const { uploadUrl, publicUrl, contentType } = await uploadApi.getPresignedUrl(uploadFolder, file.name, ct);
      await uploadToR2(uploadUrl, file, contentType);
      const existing = [...(value[sectionKey] ?? [])];
      existing[slotIdx] = publicUrl;
      onChange({ ...value, [sectionKey]: existing.filter(Boolean) });
    } catch {
      // upload failure is silent; parent toasts on critical errors
    } finally {
      setSlot(sectionKey, slotIdx, false);
    }
  }

  function removeImg(sectionKey: string, urlIdx: number) {
    onChange({ ...value, [sectionKey]: (value[sectionKey] ?? []).filter((_, i) => i !== urlIdx) });
  }

  return (
    <div className="space-y-1.5">
      {sections.map(sec => {
        const urls = value[sec.key] ?? [];
        const isOpen = openKey === sec.key;
        return (
          <div key={sec.key} className={`rounded-xl border transition ${isOpen ? "border-brand-teal/30 bg-brand-teal/[0.02]" : "border-black/[0.07]"}`}>
            <button type="button" onClick={() => setOpenKey(isOpen ? null : sec.key)}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-xs">
              <span className={`flex-1 font-medium text-left ${isOpen ? "text-brand-teal" : "text-brand-700"}`}>{sec.label}</span>
              {urls.length > 0 && <span className="badge badge-teal text-[10px] py-0 px-1.5">{urls.length}</span>}
              <span className={`text-brand-300 text-[9px] transition-transform inline-block ${isOpen ? "rotate-90" : ""}`}>▶</span>
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                <div className="flex gap-2 flex-wrap">
                  {Array.from({ length: maxPerSection }).map((_, idx) => {
                    const url = urls[idx];
                    const isUp = uploading[sec.key]?.[idx] ?? false;
                    return url ? (
                      <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-black/[0.08] shrink-0">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => removeImg(sec.key, idx)}
                          className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500/80 rounded-full flex items-center justify-center text-white text-xs leading-none">×</button>
                      </div>
                    ) : (
                      <label key={idx} className="w-16 h-16 rounded-xl border-2 border-dashed border-black/[0.10] flex items-center justify-center cursor-pointer hover:border-brand-teal/40 transition shrink-0">
                        {isUp ? <IcoLoader size={14} className="text-brand-teal animate-spin" /> : <IcoPlus size={16} className="text-brand-400" />}
                        <input type="file" accept="image/*" className="hidden" disabled={isUp}
                          onChange={e => void handleFile(sec.key, idx, e)} />
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
