import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import type { Listing } from "../lib/api";
import {
  formatKes,
  isRent,
  listingLocation,
  listingPrice,
  listingTitle,
  primaryImage,
} from "../lib/format";
import { useApp } from "../context/AppContext";
import { StarRating } from "./StarRating";
import {
  IcoArrowRight,
  IcoBath,
  IcoBed,
  IcoHeart,
  IcoHeartFilled,
  IcoLocation,
  IcoRuler,
} from "./icons";

/* ── 3D tilt on mouse move ───────────────────────────────────────── */
function useTilt(intensity = 10) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({
    transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
    transition: "transform 0.5s ease-out",
  });

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rotY = (x - 0.5) * intensity;
    const rotX = (y - 0.5) * -intensity;
    setStyle({
      transform: `perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale3d(1.02,1.02,1.02)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const onMouseLeave = () => {
    setStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1,1,1)",
      transition: "transform 0.6s cubic-bezier(0.16,1,0.3,1)",
    });
  };

  return { ref, style, onMouseMove, onMouseLeave };
}

export function ListingCard({
  listing,
  showSaveButton = true,
  index = 0,
  onClick,
}: {
  listing: Listing;
  showSaveButton?: boolean;
  index?: number;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite, toast } = useApp();
  const [imgErr, setImgErr] = useState(false);
  const [hovered, setHovered] = useState(false);
  const fav = isFavorite(listing.id);
  const rent = isRent(listing);
  const available = listing.isAvailable !== false;
  const { ref, style, onMouseMove, onMouseLeave } = useTilt(8);

  const go = () => {
    if (onClick) onClick();
    else navigate(`/listing/${listing.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.07, 0.5), ease: [0.16, 1, 0.3, 1] }}
    >
      <div
        ref={ref}
        style={style}
        className="listing-card card-dark group cursor-pointer overflow-hidden will-change-transform"
        onClick={go}
        onMouseMove={onMouseMove}
        onMouseLeave={() => { onMouseLeave(); setHovered(false); }}
        onMouseEnter={() => setHovered(true)}
      >
        {/* Image */}
        <div className="relative h-56 overflow-hidden">
          <img
            src={imgErr ? primaryImage({ ...listing, primaryImageUrl: null, images: [] }) : primaryImage(listing)}
            alt={listingTitle(listing)}
            loading="lazy"
            onError={() => setImgErr(true)}
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
          />

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

          {/* Top badges */}
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {listing.propertyType && (
              <span className="badge glass-strong text-white/90 text-[10px]">{listing.propertyType}</span>
            )}
            <span className={`badge text-[10px] ${rent ? "badge-teal" : "badge-gold"}`}>
              {rent ? "For Rent" : "For Sale"}
            </span>
          </div>

          {/* Favorite button */}
          {showSaveButton && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(listing.id);
                toast(fav ? "Removed from favorites" : "Saved to favorites", "success");
              }}
              className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full glass-strong border border-white/10 text-white transition-all duration-200 hover:scale-110 hover:border-brand-gold/40"
              aria-label="Toggle favorite"
            >
              <motion.span key={String(fav)} initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
                {fav ? <IcoHeartFilled size={17} className="text-brand-gold" /> : <IcoHeart size={17} />}
              </motion.span>
            </button>
          )}

          {/* Availability indicator */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white">
            <span className={`h-2 w-2 rounded-full ${available ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
            {available ? "Available" : "Occupied"}
          </div>

          {/* Hover "View Property" CTA overlay */}
          <div
            className={`absolute inset-x-0 bottom-0 flex items-center justify-between px-4 py-3 transition-all duration-300 ${
              hovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            }`}
            style={{
              background: "linear-gradient(to top, rgba(10,15,30,0.95) 0%, rgba(10,15,30,0.6) 60%, transparent 100%)",
            }}
          >
            <span className="text-sm font-semibold text-white">View Property</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-gold shadow-glow-gold">
              <IcoArrowRight size={14} className="text-brand-dark" />
            </div>
          </div>

          {/* Shine effect */}
          <div
            className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${hovered ? "opacity-100" : "opacity-0"}`}
            style={{
              background: "linear-gradient(105deg, transparent 35%, rgba(255,255,255,0.06) 50%, transparent 65%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="space-y-3 p-4">
          <div>
            <h3 className="line-clamp-1 font-display text-base font-semibold text-white group-hover:text-brand-goldlight transition-colors duration-200">
              {listingTitle(listing)}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-brand-muted">
            <IcoLocation size={13} className="text-brand-teal shrink-0" />
            <span className="line-clamp-1 text-xs">{listingLocation(listing)}</span>
          </div>

          <div className="flex items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <IcoBed size={14} className="text-brand-muted" />
              <span className="text-xs">{listing.bedrooms ?? 0} BR</span>
            </span>
            <span className="flex items-center gap-1.5">
              <IcoBath size={14} className="text-brand-muted" />
              <span className="text-xs">{listing.bathrooms ?? 0} BA</span>
            </span>
            {listing.sizeSqft ? (
              <span className="flex items-center gap-1.5">
                <IcoRuler size={14} className="text-brand-muted" />
                <span className="text-xs">{listing.sizeSqft} ft²</span>
              </span>
            ) : null}
          </div>

          <div className="flex items-end justify-between pt-1 border-t border-white/[0.06]">
            <div>
              <span className="text-xl font-bold text-gradient-gold">
                {formatKes(listingPrice(listing))}
              </span>
              {rent && <span className="text-xs text-brand-muted ml-1">/mo</span>}
            </div>
            <StarRating value={listing.rating ?? 0} size={13} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
