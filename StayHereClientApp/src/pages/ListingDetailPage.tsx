import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { listingsApi, asListingArray, type Listing, aiApi } from "../lib/api";
import { formatKes, listingImages, listingLocation, listingPrice, listingTitle, isRent, resolveLocation } from "../lib/format";
import { useApp } from "../context/AppContext";
import { ImageGallery } from "../components/ImageGallery";
import { StarRating, InteractiveStars } from "../components/StarRating";
import { ListingCard } from "../components/ListingCard";
import { SectionHeading, CardSkeleton } from "../components/ui";
import {
  IcoBath, IcoBed, IcoBuilding, IcoCar, IcoCalendar, IcoCheck,
  IcoEye, IcoGym, IcoHeartFilled, IcoHeart, IcoKey,
  IcoLocation, IcoPhone, IcoPool, IcoRuler, IcoSecurity, IcoShare,
  IcoSparkle, IcoStar, IcoWallet, IcoWifi, IcoArrowRight,
} from "../components/icons";

const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <IcoWifi size={16} />, pool: <IcoPool size={16} />, gym: <IcoGym size={16} />,
  parking: <IcoCar size={16} />, security: <IcoSecurity size={16} />, "24/7 security": <IcoSecurity size={16} />,
  borehole: <IcoWifi size={16} />, elevator: <IcoKey size={16} />, backup: <IcoWifi size={16} />,
  generator: <IcoWifi size={16} />, "fibre internet": <IcoWifi size={16} />,
};

function getAmenityIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(AMENITY_ICONS)) {
    if (lower.includes(k)) return v;
  }
  return <IcoCheck size={16} />;
}

const STEPS = [
  { icon: <IcoEye size={22} className="text-brand-gold" />, title: "Browse & Save", desc: "Explore listings, save favourites, compare details." },
  { icon: <IcoCalendar size={22} className="text-brand-teallight" />, title: "Book a Viewing", desc: "Schedule a physical or virtual tour at your convenience." },
  { icon: <IcoKey size={22} className="text-brand-gold" />, title: "Sign Lease Online", desc: "Digital contract — review and sign from anywhere." },
  { icon: <IcoWallet size={22} className="text-brand-teallight" />, title: "Pay & Move In", desc: "Secure M-Pesa or card payment. Get your keys." },
];

function EnquiryPanel({ listing }: { listing: Listing }) {
  const { addToCart, inCart, isFavorite, toggleFavorite, toast } = useApp();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const saved = isFavorite(listing.id);
  const enquired = inCart(listing.id);

  function handleEnquire() {
    addToCart(listing.id);
    toast("Added to your enquiry list!", "success");
    setShowModal(true);
  }

  return (
    <>
      <div className="glass-strong rounded-3xl p-6 sticky top-24 space-y-5">
        {/* Price */}
        <div>
          <div className="text-xs uppercase tracking-widest text-brand-muted mb-0.5">{isRent(listing) ? "Monthly Rent" : "Sale Price"}</div>
          <div className="font-display text-3xl font-bold text-gradient-gold">
            {formatKes(listingPrice(listing))}
            {isRent(listing) && <span className="text-base text-brand-muted font-normal">/mo</span>}
          </div>
          {listing.isAvailable !== false ? (
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Available Now
            </div>
          ) : (
            <div className="mt-1.5 text-xs text-red-400">Currently Unavailable</div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: <IcoBed size={18} className="mx-auto text-brand-muted" />, val: listing.bedrooms ?? "–", lbl: "Beds" },
            { icon: <IcoBath size={18} className="mx-auto text-brand-muted" />, val: listing.bathrooms ?? "–", lbl: "Baths" },
            { icon: <IcoRuler size={18} className="mx-auto text-brand-muted" />, val: listing.sizeSqft ? `${listing.sizeSqft}` : "–", lbl: "Sqft" },
          ].map((s) => (
            <div key={s.lbl} className="rounded-xl bg-white/5 py-3">
              {s.icon}
              <div className="mt-1 font-semibold text-white text-sm">{s.val}</div>
              <div className="text-[10px] text-brand-muted uppercase tracking-wider">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <button
          onClick={() => navigate(`/rental-flow?listingId=${listing.id}`)}
          className="btn-gold w-full justify-center"
        >
          <IcoCalendar size={16} /> Book a Viewing
        </button>
        <button
          onClick={handleEnquire}
          disabled={enquired}
          className="btn-ghost w-full justify-center disabled:opacity-60"
        >
          {enquired ? <><IcoCheck size={16} /> Enquiry Sent</> : <><IcoPhone size={16} /> Enquire Now</>}
        </button>
        <button
          onClick={() => { toggleFavorite(listing.id); toast(saved ? "Removed from saved" : "Saved!", saved ? "info" : "success"); }}
          className="btn-ghost w-full justify-center"
        >
          {saved ? <IcoHeartFilled size={16} className="text-brand-gold" /> : <IcoHeart size={16} />}
          {saved ? "Saved" : "Save Property"}
        </button>

        {/* Contact agent */}
        <div className="rounded-2xl bg-white/5 p-4">
          <div className="text-xs text-brand-muted mb-2 uppercase tracking-wider">Contact Agent</div>
          <Link to="/contact" className="flex items-center gap-2 text-sm text-white hover:text-brand-gold transition">
            <IcoPhone size={15} className="text-brand-teal" /> Get in touch
            <IcoArrowRight size={13} className="ml-auto text-brand-muted" />
          </Link>
        </div>
      </div>

      {/* Enquiry success modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm glass-strong rounded-3xl p-7 text-center"
            >
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <IcoCheck size={30} />
              </div>
              <h3 className="font-display text-xl font-bold text-white">Enquiry Registered!</h3>
              <p className="mt-2 text-sm text-brand-muted">We've added this listing to your enquiry list. An agent will reach out soon.</p>
              <div className="mt-5 flex gap-3">
                <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center text-sm">Continue Browsing</button>
                <button onClick={() => navigate("/cart")} className="btn-gold flex-1 justify-center text-sm">
                  View Enquiries <IcoArrowRight size={14} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useApp();
  const [listing, setListing] = useState<Listing | null>(null);
  const [similar, setSimilar] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [rated, setRated] = useState(false);

  const viewFired = useRef(false);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    listingsApi.getById(id)
      .then((l) => {
        setListing(l);
        // Fire view increment once
        if (!viewFired.current) {
          viewFired.current = true;
          listingsApi.incrementViews(id).catch(() => {});
        }
        // Load similar via AI search
        const locFields = resolveLocation(l);
        const loc = locFields.city ?? locFields.suburb ?? "";
        if (loc) {
          aiApi.searchListings({ location: loc, listing_id: id }).then((data) => {
            const items = asListingArray(data).filter((x) => x.id !== id).slice(0, 4);
            setSimilar(items);
          }).catch(() => {});
        }
      })
      .catch(() => { toast("Listing not found", "error"); navigate("/explore"); })
      .finally(() => setLoading(false));
  }, [id]);

  function handleRate(rating: number) {
    if (!id || rated) return;
    listingsApi.rate(id, rating).then(() => {
      setUserRating(rating);
      setRated(true);
      toast("Thanks for your rating!", "success");
    }).catch(() => toast("Could not submit rating", "error"));
  }

  function handleShare() {
    navigator.clipboard.writeText(window.location.href).then(() => toast("Link copied!", "success")).catch(() => {});
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-6 h-8 w-64 animate-pulse rounded-xl bg-white/10" />
        <div className="mb-6 h-96 animate-pulse rounded-3xl bg-white/10" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
          <CardSkeleton />
        </div>
      </div>
    );
  }

  if (!listing) return null;

  const imgs = listingImages(listing);
  const loc = listingLocation(listing);

  return (
    <div className="pb-20">
      {/* Breadcrumb */}
      <div className="mx-auto max-w-7xl px-4 pt-6 pb-2 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs text-brand-muted">
          <Link to="/" className="hover:text-white transition">Home</Link>
          <span>/</span>
          <Link to="/explore" className="hover:text-white transition">Explore</Link>
          <span>/</span>
          <span className="text-white truncate max-w-48">{listingTitle(listing)}</span>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-4 sm:px-6 lg:px-8">
        {/* Title row */}
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{listingTitle(listing)}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-brand-muted">
              <span className="flex items-center gap-1"><IcoLocation size={14} className="text-brand-teal" />{loc}</span>
              {listing.listingCode && <span className="text-white/40">#{listing.listingCode}</span>}
              {listing.views != null && <span className="flex items-center gap-1"><IcoEye size={13} />{listing.views} views</span>}
              {(listing.rating ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <IcoStar size={13} className="text-brand-gold" />
                  {Number(listing.rating).toFixed(1)}
                </span>
              )}
            </div>
          </div>
          <button onClick={handleShare} className="btn-ghost text-sm py-2 px-3">
            <IcoShare size={15} /> Share
          </button>
        </div>

        {/* Badge row */}
        <div className="mb-5 flex flex-wrap gap-2">
          {listing.propertyType && (
            <span className="rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1 text-xs font-medium text-brand-gold">{listing.propertyType}</span>
          )}
          {listing.listingType && (
            <span className="rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1 text-xs font-medium text-brand-teallight">{listing.listingType}</span>
          )}
          {listing.isFeatured && (
            <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-medium text-yellow-300">Featured</span>
          )}
        </div>

        {/* Gallery */}
        <div className="mb-8">
          <ImageGallery images={imgs} primaryImage={listing.primaryImageUrl ?? undefined} alt={listingTitle(listing)} />
        </div>

        {/* Main grid */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Left: Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Description */}
            {listing.description && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
                <SectionHeading title="About This Property" />
                <p className="mt-4 leading-relaxed text-brand-muted whitespace-pre-line">{listing.description}</p>
              </motion.div>
            )}

            {/* Key details */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
              <SectionHeading title="Property Details" />
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {[
                  { icon: <IcoBed size={18} className="text-brand-gold" />, label: "Bedrooms", value: listing.bedrooms ?? "N/A" },
                  { icon: <IcoBath size={18} className="text-brand-teallight" />, label: "Bathrooms", value: listing.bathrooms ?? "N/A" },
                  { icon: <IcoRuler size={18} className="text-brand-gold" />, label: "Size", value: listing.sizeSqft ? `${listing.sizeSqft} sqft` : "N/A" },
                  { icon: <IcoBuilding size={18} className="text-brand-teallight" />, label: "Type", value: listing.propertyType ?? "N/A" },
                  { icon: <IcoKey size={18} className="text-brand-gold" />, label: "Floor", value: listing.floor ?? "N/A" },
                  { icon: <IcoCalendar size={18} className="text-brand-teallight" />, label: "Year Built", value: listing.yearBuilt ?? "N/A" },
                ].map((d) => (
                  <div key={d.label} className="card-dark flex items-center gap-3 p-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5">{d.icon}</div>
                    <div>
                      <div className="text-[10px] uppercase tracking-wider text-brand-muted">{d.label}</div>
                      <div className="text-sm font-medium text-white">{String(d.value)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Amenities */}
            {listing.amenities && listing.amenities.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <SectionHeading title="Amenities & Features" />
                <div className="mt-4 flex flex-wrap gap-3">
                  {listing.amenities.map((a) => (
                    <div key={a} className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white">
                      <span className="text-brand-teallight">{getAmenityIcon(a)}</span>
                      {a}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Location */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }}>
              <SectionHeading title="Location" />
              {(() => {
                const loc = resolveLocation(listing);
                return (
                  <div className="mt-4 rounded-2xl bg-white/5 p-4 text-sm space-y-1.5 text-brand-muted">
                    {loc.street  && <div><span className="text-white font-medium">Street: </span>{loc.street}</div>}
                    {loc.suburb  && <div><span className="text-white font-medium">Area: </span>{loc.suburb}</div>}
                    {loc.city    && <div><span className="text-white font-medium">City: </span>{loc.city}</div>}
                    {loc.county  && <div><span className="text-white font-medium">County: </span>{loc.county}</div>}
                    {loc.country && <div><span className="text-white font-medium">Country: </span>{loc.country}</div>}
                  </div>
                );
              })()}
            </motion.div>

            {/* How to rent */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <SectionHeading title="How to Rent / Buy" />
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                {STEPS.map((s) => (
                  <div key={s.title} className="card-dark p-4 text-center space-y-2">
                    <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-2xl bg-white/5">
                      {s.icon}
                    </div>
                    <div className="text-xs font-semibold text-white">{s.title}</div>
                    <div className="text-[11px] text-brand-muted leading-snug">{s.desc}</div>
                    <div className="mt-1 h-0.5 w-6 mx-auto rounded-full bg-brand-gold/40" />
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Rating */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}>
              <SectionHeading title="Rate This Listing" />
              <div className="mt-4 card-dark p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div>
                  <div className="font-display text-3xl font-bold text-brand-gold">{Number(listing.rating ?? 0).toFixed(1)}</div>
                  <StarRating value={listing.rating} size={14} className="mt-1" />
                </div>
                <div className="h-px w-full sm:h-12 sm:w-px bg-white/10" />
                <div>
                  {rated ? (
                    <div className="flex items-center gap-2 text-emerald-400">
                      <IcoCheck size={18} />
                      <span className="text-sm">Thanks for rating!</span>
                      <StarRating value={userRating} size={14} />
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-brand-muted mb-2">Share your experience</div>
                      <InteractiveStars value={userRating} onRate={handleRate} />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Ask AI */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))}
                className="w-full rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-5 text-left hover:border-brand-gold/40 transition group"
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-gold/10">
                    <IcoSparkle size={18} className="text-brand-gold" />
                  </span>
                  <span className="font-semibold text-white">Ask Sage AI</span>
                  <span className="ml-auto text-brand-gold group-hover:translate-x-1 transition"><IcoArrowRight size={17} /></span>
                </div>
                <p className="text-sm text-brand-muted">Have questions about this property or neighbourhood? Ask our AI assistant for instant answers.</p>
              </button>
            </motion.div>
          </div>

          {/* Right: Sticky enquiry panel */}
          <div>
            <EnquiryPanel listing={listing} />
          </div>
        </div>

        {/* Similar listings */}
        {similar.length > 0 && (
          <div className="mt-16">
            <SectionHeading title="Similar Properties" subtitle="AI-powered recommendations based on location and features." />
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((l, i) => <ListingCard key={l.id} listing={l} index={i} showSaveButton />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
