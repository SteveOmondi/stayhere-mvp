import { useEffect, useState } from "react";
import { IcoX } from "./icons";

type Props = {
  url: string;
  title?: string;
  onClose: () => void;
};

/** KYC documents here are almost always images - detect the rare PDF by extension and fall back
 * to an "Open Original" link for anything neither an <img> nor an <iframe> can render. */
function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

/** Inline preview for a single uploaded document - replaces a bare `target="_blank"` link. */
export function DocumentPreviewModal({ url, title, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const pdf = isLikelyPdf(url);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="min-w-0 truncate text-sm font-semibold text-brand-950">{title ?? "Document Preview"}</div>
          <div className="flex shrink-0 items-center gap-3">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-gold hover:underline">
              Open Original
            </a>
            <button onClick={onClose} className="rounded-full p-1.5 text-brand-600 hover:bg-brand-50">
              <IcoX size={16} />
            </button>
          </div>
        </div>
        <div className="relative flex min-h-[300px] flex-1 items-center justify-center overflow-auto bg-brand-50">
          {pdf ? (
            <iframe src={url} title={title ?? "Document"} className="h-[70vh] w-full" />
          ) : errored ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-brand-600">Couldn't load a preview for this file.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-brand-gold px-4 py-2 text-xs font-semibold text-brand-950">
                Open Original
              </a>
            </div>
          ) : (
            <img
              src={url}
              alt={title ?? "Document preview"}
              className={`max-h-[70vh] w-auto object-contain transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setLoaded(true)}
              onError={() => setErrored(true)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
