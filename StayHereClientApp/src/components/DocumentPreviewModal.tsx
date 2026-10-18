import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IcoX, IcoLoader } from "./icons";

type Props = {
  url: string;
  title?: string;
  onClose: () => void;
};

/** Uploaded application documents (ID front/back, selfie, digital signature) and property
 * documents are almost always images - the rare exception (e.g. a manually-linked lease PDF)
 * gets detected by extension and shown in an iframe instead, with an "Open Original" escape
 * hatch for anything neither can render. */
function isLikelyPdf(url: string): boolean {
  return /\.pdf(\?|#|$)/i.test(url);
}

/** Inline lightbox for a single uploaded document - used anywhere a "View" action previously
 * opened a bare new tab. Esc and the backdrop both close it. */
export function DocumentPreviewModal({ url, title, onClose }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const pdf = isLikelyPdf(url);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-8"
        role="dialog" aria-modal="true"
      >
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          className="glass-strong relative z-10 flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5">
            <div className="min-w-0 truncate text-sm font-semibold text-white">{title ?? "Document Preview"}</div>
            <div className="flex shrink-0 items-center gap-4">
              <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-brand-teallight hover:underline">
                Open Original
              </a>
              <button onClick={onClose} className="rounded-full p-1.5 text-brand-muted transition hover:bg-white/10 hover:text-white">
                <IcoX size={16} />
              </button>
            </div>
          </div>
          <div className="relative flex min-h-[320px] flex-1 items-center justify-center overflow-auto bg-black/30">
            {pdf ? (
              <iframe src={url} title={title ?? "Document"} className="h-[75vh] w-full" />
            ) : errored ? (
              <div className="flex flex-col items-center gap-3 p-10 text-center">
                <p className="text-sm text-brand-muted">Couldn't load a preview for this file.</p>
                <a href={url} target="_blank" rel="noopener noreferrer" className="btn-gold px-4 py-2 text-xs">Open Original</a>
              </div>
            ) : (
              <>
                {!loaded && <IcoLoader size={24} className="absolute text-brand-gold" />}
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
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
