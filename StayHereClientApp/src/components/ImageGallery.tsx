import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IcoChevLeft, IcoChevRight, IcoEye, IcoX } from "./icons";
import { fallbackImage } from "../lib/format";

export function ImageGallery({
  images,
  primaryImage,
  alt = "Property image",
  variant = "grid",
}: {
  images: string[];
  primaryImage?: string;
  alt?: string;
  /** "grid" (default) = equal-weight thumbnail strip. "hero-grid" = Airbnb-style
   *  large image + 2x2 grid with a "Show all photos" trigger into the same lightbox. */
  variant?: "grid" | "hero-grid";
}) {
  const all = (() => {
    const list: string[] = [];
    if (primaryImage) list.push(primaryImage);
    for (const i of images) if (i && !list.includes(i)) list.push(i);
    return list.length ? list : images;
  })();

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [imgErrors, setImgErrors] = useState<Record<string, boolean>>({});

  function imgSrc(url: string): string {
    return imgErrors[url] ? fallbackImage(url) : url;
  }
  function onImgError(url: string) {
    setImgErrors((prev) => ({ ...prev, [url]: true }));
  }

  const next = useCallback(() => setActive((a) => (a + 1) % all.length), [all.length]);
  const prev = useCallback(() => setActive((a) => (a - 1 + all.length) % all.length), [all.length]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") setLightbox(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, next, prev]);

  if (!all.length) return null;

  function openAt(i: number) {
    setActive(i);
    setLightbox(true);
  }

  return (
    <>
      {variant === "hero-grid" ? (
        /* ── Airbnb-style: large hero (left ~60%) + 2x2 grid (right ~40%) ── */
        <div className="relative flex flex-col gap-2 overflow-hidden rounded-2xl lg:h-[480px] lg:flex-row">
          <button
            onClick={() => openAt(0)}
            className="relative h-64 w-full shrink-0 overflow-hidden sm:h-80 lg:h-full lg:w-[60%] cursor-zoom-in"
          >
            <img
              src={imgSrc(all[0])}
              alt={alt}
              onError={() => onImgError(all[0])}
              className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            />
          </button>

          {all.length > 1 && (
            <div className="grid grid-cols-2 gap-2 lg:h-full lg:w-[40%]">
              {Array.from({ length: Math.min(4, all.length - 1) }).map((_, i) => {
                const idx = i + 1;
                const img = all[idx];
                return (
                  <button
                    key={idx}
                    onClick={() => openAt(idx)}
                    className="relative h-28 overflow-hidden sm:h-36 lg:h-full cursor-zoom-in"
                  >
                    <img
                      src={imgSrc(img)}
                      alt={`${alt} ${idx + 1}`}
                      onError={() => onImgError(img)}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  </button>
                );
              })}
            </div>
          )}

          {all.length > 1 && (
            <button
              onClick={() => openAt(active)}
              className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full glass-strong px-4 py-2 text-sm font-sans font-semibold text-white hover:bg-white/20 transition"
            >
              <IcoEye size={14} /> Show all {all.length} photos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
          {/* Main */}
          <div className="relative col-span-1 h-64 overflow-hidden rounded-2xl sm:h-96 lg:col-span-3">
            <AnimatePresence mode="wait">
              <motion.img
                key={active}
                src={imgSrc(all[active])}
                alt={alt}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => setLightbox(true)}
                onError={() => onImgError(all[active])}
                className="h-full w-full cursor-zoom-in object-cover"
              />
            </AnimatePresence>
            <div className="absolute bottom-3 right-3 rounded-full glass-strong px-3 py-1 text-sm font-medium text-white">
              {active + 1} / {all.length}
            </div>
            {all.length > 1 && (
              <>
                <GalleryArrow side="left" onClick={prev} />
                <GalleryArrow side="right" onClick={next} />
              </>
            )}
          </div>

          {/* Thumbnails */}
          <div className="flex gap-3 overflow-x-auto lg:max-h-96 lg:flex-col lg:overflow-y-auto no-scrollbar">
            {all.map((img, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-xl border-2 transition lg:w-full ${
                  i === active ? "border-brand-gold" : "border-transparent opacity-70 hover:opacity-100"
                }`}
              >
                <img src={imgSrc(img)} alt={`${alt} ${i + 1}`} onError={() => onImgError(img)} className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 p-4"
            onClick={() => setLightbox(false)}
          >
            <button
              className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full glass-strong text-white"
              onClick={() => setLightbox(false)}
            >
              <IcoX size={22} />
            </button>
            <GalleryArrow side="left" onClick={(e) => { e?.stopPropagation(); prev(); }} large />
            <motion.img
              key={active}
              src={imgSrc(all[active])}
              alt={alt}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onError={() => onImgError(all[active])}
              className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain"
              onClick={(e) => e.stopPropagation()}
            />
            <GalleryArrow side="right" onClick={(e) => { e?.stopPropagation(); next(); }} large />
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full glass-strong px-4 py-1.5 text-white">
              {active + 1} / {all.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function GalleryArrow({
  side,
  onClick,
  large = false,
}: {
  side: "left" | "right";
  onClick: (e?: React.MouseEvent) => void;
  large?: boolean;
}) {
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(e); }}
      className={`absolute top-1/2 z-10 flex -translate-y-1/2 items-center justify-center rounded-full glass-strong text-white transition hover:scale-110 ${
        side === "left" ? "left-3" : "right-3"
      } ${large ? "h-12 w-12" : "h-9 w-9"}`}
      aria-label={side === "left" ? "Previous image" : "Next image"}
    >
      {side === "left" ? <IcoChevLeft size={large ? 26 : 20} /> : <IcoChevRight size={large ? 26 : 20} />}
    </button>
  );
}
