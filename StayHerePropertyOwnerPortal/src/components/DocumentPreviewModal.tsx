import { useEffect, useState } from "react";
import { IcoX, IcoLoader } from "./icons";

type Props = {
  url: string;
  title?: string;
  onClose: () => void;
};

/** Most uploaded documents here (ID front/back, selfie, digital signature) are images - the only
 * exception is a lease/agreement doc an owner may paste in manually on the Onboarding page, which
 * could be a PDF. Detect by extension and fall back to "couldn't preview" + an external-open link
 * for anything neither an <img> nor an <iframe> can actually render. */
function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

/** Inline lightbox for a single uploaded document - used anywhere a "View" action on an
 * application/tenant/onboarding document previously opened a bare new tab. Esc and the backdrop
 * both close it; "Open Original" stays available for the rare file this can't render inline. */
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
    <div className="modal-bg" role="dialog" aria-modal="true" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box flex max-h-full w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-3.5">
          <div className="min-w-0 truncate text-sm font-semibold text-brand-900">{title ?? "Document Preview"}</div>
          <div className="flex shrink-0 items-center gap-3">
            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-teal hover:underline">
              Open Original
            </a>
            <button onClick={onClose} className="rounded-full p-1.5 text-brand-400 transition-colors hover:bg-brand-50 hover:text-brand-800">
              <IcoX size={16} />
            </button>
          </div>
        </div>
        <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-brand-50">
          {pdf ? (
            <iframe src={url} title={title ?? "Document"} className="h-[75vh] w-full" />
          ) : errored ? (
            <div className="flex flex-col items-center gap-3 p-10 text-center">
              <p className="text-sm text-brand-500">Couldn't load a preview for this file.</p>
              <a href={url} target="_blank" rel="noopener noreferrer" className="btn-teal px-4 py-2 text-xs">Open Original</a>
            </div>
          ) : (
            <>
              {!loaded && <IcoLoader size={24} className="absolute text-brand-300" />}
              <img
                src={url}
                alt={title ?? "Document preview"}
                className={`max-h-[75vh] w-auto object-contain transition-opacity duration-200 ${loaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setLoaded(true)}
                onError={() => setErrored(true)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
