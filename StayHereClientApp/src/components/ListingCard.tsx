import { useState } from "react";
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
  IcoBath,
  IcoBed,
  IcoHeart,
  IcoHeartFilled,
  IcoLocation,
  IcoRuler,
} from "./icons";

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
  const fav = isFavorite(listing.id);
  const rent = isRent(listing);
  const available = listing.isAvailable !== false;

  const go = () => {
    if (onClick) onClick();
    else navigate(`/listing/${listing.id}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.45, delay: Math.min(index * 0.06, 0.5) }}
      className="listing-card card-dark group cursor-pointer overflow-hidden"
      onClick={go}
    >
      <div className="relative h-52 overflow-hidden">
        <img
          src={imgErr ? primaryImage({ ...listing, primaryImageUrl: null, images: [] }) : primaryImage(listing)}
          alt={listingTitle(listing)}
          loading="lazy"
          onError={() => setImgErr(true)}
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
          {listing.propertyType && (
            <span className="badge glass-strong text-white">{listing.propertyType}</span>
          )}
          <span
            className={`badge ${
              rent ? "bg-brand-teal text-white" : "bg-brand-gold text-brand-dark"
            }`}
          >
            {rent ? "For Rent" : "For Sale"}
          </span>
        </div>

        {/* Favorite */}
        {showSaveButton && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(listing.id);
              toast(fav ? "Removed from favorites" : "Saved to favorites", "success");
            }}
            className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full glass-strong text-white transition hover:scale-110"
            aria-label="Toggle favorite"
          >
            <motion.span key={String(fav)} initial={{ scale: 0.5 }} animate={{ scale: 1 }}>
              {fav ? <IcoHeartFilled size={18} className="text-brand-gold" /> : <IcoHeart size={18} />}
            </motion.span>
          </button>
        )}

        {/* Availability dot */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white">
          <span
            className={`h-2 w-2 rounded-full ${
              available ? "bg-emerald-400" : "bg-red-400"
            }`}
          />
          {available ? "Available" : "Occupied"}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-1 font-display text-lg font-semibold text-white">
            {listingTitle(listing)}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-brand-muted">
          <IcoLocation size={15} className="text-brand-teal" />
          <span className="line-clamp-1">{listingLocation(listing)}</span>
        </div>

        <div className="flex items-center gap-4 text-sm text-white/80">
          <span className="flex items-center gap-1.5">
            <IcoBed size={16} className="text-brand-muted" />
            {listing.bedrooms ?? 0}
          </span>
          <span className="flex items-center gap-1.5">
            <IcoBath size={16} className="text-brand-muted" />
            {listing.bathrooms ?? 0}
          </span>
          {listing.sizeSqft ? (
            <span className="flex items-center gap-1.5">
              <IcoRuler size={16} className="text-brand-muted" />
              {listing.sizeSqft} ft²
            </span>
          ) : null}
        </div>

        <div className="flex items-end justify-between pt-1">
          <div>
            <span className="text-xl font-bold text-gradient-gold">
              {formatKes(listingPrice(listing))}
            </span>
            {rent && <span className="text-sm text-brand-muted">/mo</span>}
          </div>
          <StarRating value={listing.rating ?? 0} size={14} />
        </div>
      </div>
    </motion.div>
  );
}
