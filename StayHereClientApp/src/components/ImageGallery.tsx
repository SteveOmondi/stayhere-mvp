import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IcoChevLeft, IcoChevRight, IcoX } from "./icons";

export function ImageGallery({
  images,
  primaryImage,
  alt = "Property image",
}: {
  images: string[];
  primaryImage?: string;
  alt?: string;
}) {
  const all = (() => {
    const list: string[] = [];
    if (primaryImage) list.push(primaryImage);
    for (const i of images) if (i && !list.includes(i)) list.push(i);
    return list.length ? list : images;
  })();

  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState(false);

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

  return (
    <>
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {/* Main */}
        <div className="relative col-span-1 h-64 overflow-hidden rounded-2xl sm:h-96 lg:col-span-3">
          <AnimatePresence mode="wait">
            <motion.img
              key={active}
              src={all[active]}
              alt={alt}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setLightbox(true)}
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
              <img src={img} alt={`${alt} ${i + 1}`} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      </div>

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
              src={all[active]}
              alt={alt}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
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
