import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence, useScroll } from "framer-motion";
import { listingsApi, asListingArray, applicationApi, type Listing, aiApi } from "../lib/api";
import {
  formatKes, listingImages, listingLocation, listingPrice,
  listingTitle, isRent, resolveLocation,
} from "../lib/format";
import { useApp } from "../context/AppContext";
import { loginUrlWithRedirect } from "../lib/authRedirect";
import { StarRating, InteractiveStars } from "../components/StarRating";
import { ListingCard } from "../components/ListingCard";
import { GrainLayer, DetailSection } from "../components/ui";
import { ImageGallery } from "../components/ImageGallery";
import { FloorPlanSection } from "../components/floorplan/FloorPlanSection";
import {
  IcoBath, IcoBed, IcoBuilding, IcoCar, IcoCalendar, IcoCheck,
  IcoEye, IcoGym, IcoHeartFilled, IcoHeart, IcoKey,
  IcoLocation, IcoPhone, IcoPool, IcoRuler, IcoSecurity, IcoShare,
  IcoSparkle, IcoStar, IcoWallet, IcoWifi, IcoArrowRight,
} from "../components/icons";

/* ── Amenity icon map ────────────────────────────────────────────── */
const AMENITY_ICONS: Record<string, React.ReactNode> = {
  wifi: <IcoWifi size={15} />, pool: <IcoPool size={15} />, gym: <IcoGym size={15} />,
  parking: <IcoCar size={15} />, security: <IcoSecurity size={15} />,
  "24/7 security": <IcoSecurity size={15} />, borehole: <IcoWifi size={15} />,
  elevator: <IcoKey size={15} />, backup: <IcoWifi size={15} />,
  generator: <IcoWifi size={15} />, "fibre internet": <IcoWifi size={15} />,
};
function getAmenityIcon(name: string) {
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(AMENITY_ICONS)) if (lower.includes(k)) return v;
  return <IcoCheck size={15} />;
}

/* ── Tenure labels (only present for Sale/Rent listings) ─────────── */
const TENURE_LABELS: Record<string, string> = {
  CompleteTurnkey: "Complete / Turnkey",
  OffPlanUnderConstruction: "Off-Plan / Under Construction",
  LongTermLease: "Long-Term Lease",
  ShortTermServicedVacation: "Short-Term / Serviced / Vacation",
};

const TABS = ["Overview", "Details", "Floor Plan", "Amenities", "Location", "Reviews"] as const;
type Tab = typeof TABS[number];

/* ── Stagger reveal wrapper ──────────────────────────────────────── */
function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Pill stat badge ─────────────────────────────────────────────── */
function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 flex-1 min-w-[110px]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gold/10">{icon}</div>
      <div>
        <div className="text-[11px] uppercase tracking-wider text-brand-muted font-sans">{label}</div>
        <div className="text-sm font-semibold text-white font-sans leading-tight">{String(value)}</div>
      </div>
    </div>
  );
}

/* ── Sticky enquiry panel ────────────────────────────────────────── */
function EnquiryPanel({ listing, isActiveTenant }: { listing: Listing; isActiveTenant: boolean }) {
  const { isAuthenticated, hasEnquired, createEnquiry, isFavorite, toggleFavorite, toast } = useApp();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showModal, setShowModal] = useState(false);
  const [enquiring, setEnquiring] = useState(false);
  const saved    = isFavorite(listing.id);
  const enquired = hasEnquired(listing.id);

  async function handleEnquire() {
    if (!isAuthenticated) {
      toast("Sign in to enquire about this listing", "info");
      // ?autoEnquire=1 on the way back lets the effect below finish this same enquiry
      // automatically once signed in, instead of the user needing to click "Enquire" again.
      navigate(loginUrlWithRedirect(`/listing/${listing.id}?autoEnquire=1`));
      return;
    }
    if (enquired) { setShowModal(true); return; }

    setEnquiring(true);
    try {
      await createEnquiry(listing.id);
      toast("Enquiry sent!", "success");
      setShowModal(true);
    } catch {
      toast("Couldn't send your enquiry - please try again.", "error");
    } finally {
      setEnquiring(false);
    }
  }

  // Resume an enquiry that was interrupted by the login gate above.
  useEffect(() => {
    if (isAuthenticated && searchParams.get("autoEnquire") === "1") {
      setSearchParams((p) => { p.delete("autoEnquire"); return p; }, { replace: true });
      handleEnquire();
    }
  }, [isAuthenticated]);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-24 space-y-4"
      >
        {/* Price card */}
        <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-brand-card p-6">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-brand-gold/8 blur-2xl pointer-events-none" />
          <GrainLayer opacity={0.02} />

          <div className="relative z-10">
            <div className="text-[10px] uppercase tracking-[0.2em] text-brand-muted font-sans mb-1">
              {listing.listingType === "ShortStay" ? "Per Night" : isRent(listing) ? "Monthly Rent" : "Sale Price"}
            </div>
            <div className="text-gradient-gold font-display text-4xl font-bold leading-none">
              {formatKes(listingPrice(listing))}
              {listing.listingType === "ShortStay" && <span className="text-base text-brand-muted font-sans font-normal ml-1">/night</span>}
              {listing.listingType !== "ShortStay" && isRent(listing) && <span className="text-base text-brand-muted font-sans font-normal ml-1">/mo</span>}
            </div>
            <div className="mt-3 flex items-center gap-2">
              {listing.isAvailable !== false ? (
                <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1 text-[11px] font-sans font-semibold text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Available Now
                </div>
              ) : (
                <div className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1 text-[11px] text-red-400 font-sans">Unavailable</div>
              )}
              {listing.isFeatured && (
                <div className="flex items-center gap-1 rounded-full bg-brand-gold/10 border border-brand-gold/25 px-3 py-1 text-[11px] font-sans font-semibold text-brand-gold">
                  <IcoStar size={10} /> Featured
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stat grid */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { icon: <IcoBed size={16} className="text-brand-gold" />,      val: listing.bedrooms  ?? "–", lbl: "Beds"  },
            { icon: <IcoBath size={16} className="text-brand-teallight" />, val: listing.bathrooms ?? "–", lbl: "Baths" },
            { icon: <IcoRuler size={16} className="text-brand-gold" />,     val: listing.sizeSqft  ?? "–", lbl: "Sqft"  },
          ].map((s) => (
            <div key={s.lbl} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] py-4 text-center">
              <div className="flex justify-center mb-1.5">{s.icon}</div>
              <div className="text-sm font-semibold text-white font-sans">{String(s.val)}</div>
              <div className="text-[9px] uppercase tracking-wider text-brand-muted mt-0.5 font-sans">{s.lbl}</div>
            </div>
          ))}
        </div>

        {/* CTAs — ShortStay listings get a single lighter "pick dates & book" flow instead of the
         * long-term viewing/application pair, which assumes a lease with no date-range concept.
         * Once the customer already has an Active tenancy here, booking a viewing or starting a
         * new application makes no sense (and the backend already enforces one active application
         * per listing+customer), so show a "you live here" state instead. */}
        {isActiveTenant ? (
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-center">
            <div className="flex items-center justify-center gap-1.5 text-[13px] font-sans font-semibold text-emerald-400">
              <IcoKey size={15} /> You're Renting This Property
            </div>
            <Link to="/dashboard" className="btn-ghost w-full justify-center text-[12px] font-sans mt-3">
              Manage Tenancy <IcoArrowRight size={13} />
            </Link>
          </div>
        ) : listing.listingType === "ShortStay" ? (
          <button
            onClick={() => navigate(`/book-stay?listingId=${listing.id}`)}
            className="btn-gold w-full justify-center text-[13px] font-sans font-semibold py-3.5"
          >
            <IcoCalendar size={16} /> Check Availability & Book
          </button>
        ) : (
          <>
            <button
              onClick={() => navigate(`/rental-flow?listingId=${listing.id}`)}
              className="btn-gold w-full justify-center text-[13px] font-sans font-semibold py-3.5"
            >
              <IcoCalendar size={16} /> Book a Viewing
            </button>
            <button
              onClick={() => navigate(`/rental-flow?listingId=${listing.id}&path=apply`)}
              className="btn-teal w-full justify-center text-[13px] font-sans font-semibold py-3.5"
            >
              <IcoKey size={16} /> Start Tenancy Application
            </button>
          </>
        )}
        <button
          onClick={handleEnquire}
          disabled={enquiring}
          className="btn-ghost w-full justify-center text-[13px] font-sans disabled:opacity-50"
        >
          {enquired
            ? <><IcoCheck size={15} className="text-emerald-400" /> Enquiry Sent</>
            : <><IcoPhone size={15} /> Enquire Now</>}
        </button>
        <button
          onClick={() => { toggleFavorite(listing.id); toast(saved ? "Removed from saved" : "Saved!", saved ? "info" : "success"); }}
          className="btn-ghost w-full justify-center text-[13px] font-sans"
        >
          {saved
            ? <><IcoHeartFilled size={15} className="text-brand-gold" /> Saved</>
            : <><IcoHeart size={15} /> Save Property</>}
        </button>

        {/* Agent contact */}
        <div className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-brand-dark text-sm font-bold"
              style={{ background: "linear-gradient(135deg,#e8d48b,#c9a227)" }}>
              SH
            </div>
            <div>
              <div className="text-[12px] font-sans font-semibold text-white">StayHere Agent</div>
              <div className="text-[10px] text-brand-muted font-sans">Available Mon–Sat, 8am–7pm</div>
            </div>
          </div>
          <Link
            to="/contact"
            className="mt-3 flex items-center gap-2 text-[12px] text-brand-teallight hover:text-white transition font-sans"
          >
            <IcoPhone size={13} /> Get in touch <IcoArrowRight size={12} className="ml-auto" />
          </Link>
        </div>

        {/* Ask Sage */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))}
          className="group w-full rounded-2xl border border-brand-gold/15 bg-brand-gold/[0.04] p-4 text-left hover:border-brand-gold/35 hover:bg-brand-gold/[0.08] transition-all duration-200"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-gold/10">
              <IcoSparkle size={15} className="text-brand-gold" />
            </span>
            <div>
              <div className="text-[12px] font-sans font-semibold text-white">Ask Sage AI</div>
              <div className="text-[10px] text-brand-muted font-sans">Instant property insights</div>
            </div>
            <IcoArrowRight size={14} className="ml-auto text-brand-gold group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </motion.div>

      {/* Enquiry success modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.88, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 12, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm overflow-hidden rounded-3xl border border-white/[0.08] bg-brand-card"
            >
              <div className="h-1 bg-gradient-to-r from-brand-gold via-brand-teal to-brand-gold" />
              <div className="p-7 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-400">
                  <IcoCheck size={28} />
                </div>
                <h3 className="font-display text-xl font-bold text-white">Enquiry Sent!</h3>
                <p className="mt-2 text-[13px] text-brand-muted font-sans leading-relaxed">
                  The owner has been notified. Start a chat about this listing any time from My Enquiries.
                </p>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setShowModal(false)} className="btn-ghost flex-1 justify-center text-sm font-sans">Continue</button>
                  <button onClick={() => navigate("/cart")} className="btn-gold flex-1 justify-center text-sm font-sans">
                    Start Chat <IcoArrowRight size={13} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/* ── Skeleton loader ─────────────────────────────────────────────── */
function DetailSkeleton() {
  return (
    <div className="pb-20 animate-fade-in">
      <div className="h-[58vh] min-h-[420px] w-full skeleton" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        <div className="h-8 w-2/3 skeleton rounded-xl" />
        <div className="h-5 w-1/3 skeleton rounded-xl" />
        <div className="grid gap-8 lg:grid-cols-3 mt-8">
          <div className="lg:col-span-2 space-y-4">
            {[...Array(5)].map((_, i) => <div key={i} className="h-24 skeleton rounded-2xl" />)}
          </div>
          <div className="h-96 skeleton rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast, isAuthenticated, authUser, customerProfile } = useApp();

  const [listing,    setListing]    = useState<Listing | null>(null);
  const [similar,    setSimilar]    = useState<Listing[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [userRating, setUserRating] = useState(0);
  const [rated,      setRated]      = useState(false);
  const [activeTab,  setActiveTab]  = useState<Tab>("Overview");
  const [stickyBar,  setStickyBar]  = useState(false);
  const [isActiveTenant, setIsActiveTenant] = useState(false);

  const customerId = customerProfile?.id ?? customerProfile?.customerId ?? authUser?.id;

  const heroRef    = useRef<HTMLDivElement>(null);
  const sectionRefs: Record<Tab, React.RefObject<HTMLDivElement>> = {
    Overview:  useRef<HTMLDivElement>(null),
    Details:   useRef<HTMLDivElement>(null),
    "Floor Plan": useRef<HTMLDivElement>(null),
    Amenities: useRef<HTMLDivElement>(null),
    Location:  useRef<HTMLDivElement>(null),
    Reviews:   useRef<HTMLDivElement>(null),
  };

  const viewFired = useRef(false);
  const { scrollY } = useScroll();

  /* Sticky bar after hero */
  useEffect(() => {
    const unsub = scrollY.on("change", (y) => setStickyBar(y > 420));
    return () => unsub();
  }, [scrollY]);

  /* Load listing */
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    listingsApi.getById(id)
      .then((l) => {
        setListing(l);
        if (!viewFired.current) {
          viewFired.current = true;
          listingsApi.incrementViews(id).catch(() => {});
        }
        const locFields = resolveLocation(l);
        const loc = locFields.city ?? locFields.suburb ?? "";
        if (loc) {
          aiApi.searchListings({ location: loc, listing_id: id })
            .then((data) => setSimilar(asListingArray(data).filter((x) => x.id !== id).slice(0, 4)))
            .catch(() => {});
        }
      })
      .catch(() => { toast("Listing not found", "error"); navigate("/explore"); })
      .finally(() => setLoading(false));
  }, [id]);

  /* Does the signed-in customer already have an Active tenancy on this exact listing? If so, the
   * viewing/application CTAs below no longer make sense. */
  useEffect(() => {
    if (!id || !isAuthenticated || !customerId) { setIsActiveTenant(false); return; }
    applicationApi.getByCustomer(customerId, 1, 100)
      .then((res) => setIsActiveTenant(res.items.some((a) => a.listingId === id && a.status === "Active")))
      .catch(() => setIsActiveTenant(false));
  }, [id, isAuthenticated, customerId]);

  function handleRate(rating: number) {
    if (!id || rated) return;
    listingsApi.rate(id, rating)
      .then(() => listingsApi.getById(id))
      .then(updated => {
        if (updated) setListing(updated);
        setUserRating(rating);
        setRated(true);
        toast("Thanks for your rating!", "success");
      })
      .catch(() => toast("Could not submit rating", "error"));
  }

  function handleShare() {
    // listingCode is already unique per listing, so /l/:code works as a short, shareable alias
    // without needing a separate short-link table/backend - falls back to the full URL if a
    // listing somehow has no code.
    const shareUrl = listing?.listingCode
      ? `${window.location.origin}/l/${listing.listingCode}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl)
      .then(() => toast("Link copied!", "success"))
      .catch(() => {});
  }

  function scrollToTab(tab: Tab) {
    setActiveTab(tab);
    sectionRefs[tab].current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (loading) return <DetailSkeleton />;
  if (!listing) return null;

  const imgs  = listingImages(listing);
  const loc   = listingLocation(listing);
  const title = listingTitle(listing);
  const photoCount = imgs.length;

  const keyDetails = [
    { icon: <IcoBed size={17} className="text-brand-gold" />,       label: "Bedrooms",  value: listing.bedrooms    ?? "N/A" },
    { icon: <IcoBath size={17} className="text-brand-teallight" />,  label: "Bathrooms", value: listing.bathrooms   ?? "N/A" },
    { icon: <IcoRuler size={17} className="text-brand-gold" />,      label: "Size",      value: listing.sizeSqft ? `${listing.sizeSqft} sqft` : "N/A" },
    { icon: <IcoBuilding size={17} className="text-brand-teallight" />, label: "Type",   value: listing.propertyType ?? "N/A" },
    { icon: <IcoKey size={17} className="text-brand-gold" />,         label: "Floor",    value: listing.floor       ?? "N/A" },
    { icon: <IcoCalendar size={17} className="text-brand-teallight" />, label: "Year Built", value: listing.yearBuilt ?? "N/A" },
  ];

  return (
    <div className="min-h-screen pb-24">

      {/* ── 1. Title + Airbnb-style photo gallery ── */}
      <div ref={heroRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="mb-5"
        >
          {/* Badges */}
          <div className="flex flex-wrap gap-2 mb-3">
            {listing.propertyType && (
              <span className="rounded-full border border-brand-gold/40 bg-brand-gold/5 px-3 py-1 text-[11px] font-sans font-semibold text-brand-gold">
                {listing.propertyType}
              </span>
            )}
            {listing.listingType && (
              <span className="rounded-full border border-brand-teal/40 bg-brand-teal/5 px-3 py-1 text-[11px] font-sans font-semibold text-brand-teallight">
                {listing.listingType}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight max-w-2xl">
            {title}
          </h1>

          {/* Meta row */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] text-brand-muted font-sans">
            <span className="flex items-center gap-1.5">
              <IcoLocation size={13} className="text-brand-teal" /> {loc}
            </span>
            {listing.views != null && (
              <span className="flex items-center gap-1.5">
                <IcoEye size={13} className="text-white/40" /> {listing.views} views
              </span>
            )}
            {(listing.rating ?? 0) > 0 && (
              <span className="flex items-center gap-1.5">
                <IcoStar size={13} className="text-brand-gold" />
                {Number(listing.rating).toFixed(1)}
              </span>
            )}
            {listing.listingCode && (
              <span className="text-white/30 font-sans">#{listing.listingCode}</span>
            )}
          </div>
        </motion.div>

        <ImageGallery
          variant="hero-grid"
          images={imgs}
          primaryImage={listing.primaryImageUrl ?? undefined}
          alt={title}
        />
      </div>

      {/* ── 2. Sticky tab nav + floating price ── */}
      <AnimatePresence>
        {stickyBar && (
          <motion.div
            initial={{ y: -56, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -56, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed top-16 inset-x-0 z-40 border-b border-white/[0.06] bg-brand-dark/90 backdrop-blur-xl"
          >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between">
              <div className="flex items-center gap-1">
                {TABS.filter((tab) => tab !== "Floor Plan" || listing.floorPlan).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => scrollToTab(tab)}
                    className={`px-3.5 py-1.5 rounded-full text-[12px] font-sans font-semibold transition-all duration-200 ${
                      activeTab === tab
                        ? "bg-brand-gold text-brand-dark"
                        : "text-white/55 hover:text-white hover:bg-white/8"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm font-display font-bold text-brand-gold">
                  {formatKes(listingPrice(listing))}
                  {listing.listingType === "ShortStay" && <span className="text-xs text-brand-muted font-sans font-normal ml-1">/night</span>}
                  {listing.listingType !== "ShortStay" && isRent(listing) && <span className="text-xs text-brand-muted font-sans font-normal ml-1">/mo</span>}
                </span>
                <button
                  onClick={handleShare}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition"
                >
                  <IcoShare size={14} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 3. Main content ── */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">

        {/* Breadcrumb + share */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[12px] text-brand-muted font-sans">
            <Link to="/" className="hover:text-white transition">Home</Link>
            <span className="text-white/20">/</span>
            <Link to="/explore" className="hover:text-white transition">Explore</Link>
            <span className="text-white/20">/</span>
            <span className="text-white/60 truncate max-w-[200px]">{title}</span>
          </div>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 rounded-full border border-white/10 px-3.5 py-1.5 text-[12px] text-white/60 hover:text-white hover:border-white/25 transition font-sans"
          >
            <IcoShare size={13} /> Share
          </button>
        </div>

        {/* ── Horizontal stat strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="flex flex-wrap gap-3 mb-10"
        >
          {listing.bedrooms  != null && <StatPill icon={<IcoBed size={17} className="text-brand-gold" />}        value={listing.bedrooms}  label="Bedrooms" />}
          {listing.bathrooms != null && <StatPill icon={<IcoBath size={17} className="text-brand-teallight" />}  value={listing.bathrooms} label="Bathrooms" />}
          {listing.sizeSqft  != null && <StatPill icon={<IcoRuler size={17} className="text-brand-gold" />}      value={`${listing.sizeSqft} sqft`} label="Size" />}
          {listing.floor     != null && <StatPill icon={<IcoKey size={17} className="text-brand-teallight" />}   value={listing.floor}     label="Floor" />}
          {photoCount > 0           && <StatPill icon={<IcoEye size={17} className="text-brand-gold" />}         value={`${photoCount} photos`}     label="Gallery" />}
        </motion.div>

        {/* ── Two-column grid ── */}
        <div className="grid gap-10 lg:grid-cols-3">

          {/* ─── LEFT: content ─── */}
          <div className="lg:col-span-2 space-y-14">

            {/* ── Overview ── */}
            <section ref={sectionRefs.Overview}>
              <FadeUp>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-5 w-0.5 rounded-full bg-brand-gold" />
                  <h2 className="font-display text-2xl font-bold text-white">About This Property</h2>
                </div>
                {listing.description ? (
                  <p className="text-[14px] leading-relaxed text-brand-muted font-sans whitespace-pre-line">
                    {listing.description}
                  </p>
                ) : (
                  <p className="text-[14px] text-brand-muted/50 italic font-sans">No description available.</p>
                )}
              </FadeUp>

              {/* Highlight chips */}
              <FadeUp delay={0.08} className="mt-6 flex flex-wrap gap-2">
                {[
                  listing.categoryName    && { label: listing.categoryName,    color: "teal" },
                  listing.subcategoryName && { label: listing.subcategoryName, color: "gold" },
                  listing.propertyType   && { label: listing.propertyType,    color: "gold" },
                  listing.listingType    && { label: listing.listingType,     color: "teal" },
                  listing.tenure && { label: TENURE_LABELS[listing.tenure] ?? listing.tenure, color: "gold" },
                  listing.isFeatured     && { label: "Featured",              color: "gold" },
                  listing.isAvailable !== false && { label: "Available",      color: "teal" },
                ].filter(Boolean).map((c: any) => (
                  <span
                    key={c.label}
                    className={`rounded-full px-3.5 py-1 text-[11px] font-sans font-semibold border ${
                      c.color === "gold"
                        ? "border-brand-gold/30 bg-brand-gold/8 text-brand-gold"
                        : "border-brand-teal/30 bg-brand-teal/8 text-brand-teallight"
                    }`}
                  >
                    {c.label}
                  </span>
                ))}
              </FadeUp>
            </section>

            {/* ── Details ── */}
            <section ref={sectionRefs.Details}>
              <FadeUp>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-5 w-0.5 rounded-full bg-brand-teal" />
                  <h2 className="font-display text-2xl font-bold text-white">Property Details</h2>
                </div>
              </FadeUp>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {keyDetails.map(({ icon, label, value }, i) => (
                  <FadeUp key={label} delay={i * 0.06}>
                    <motion.div
                      whileHover={{ y: -3, borderColor: "rgba(201,162,39,0.3)" }}
                      className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 transition-all duration-300 hover:bg-white/[0.06]"
                    >
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-brand-gold/[0.04] to-transparent" />
                      <div className="relative flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/5 border border-white/[0.07]">
                          {icon}
                        </div>
                        <div>
                          <div className="text-[10px] uppercase tracking-wider text-brand-muted font-sans">{label}</div>
                          <div className="text-sm font-semibold text-white font-sans mt-0.5">{String(value)}</div>
                        </div>
                      </div>
                    </motion.div>
                  </FadeUp>
                ))}
              </div>
            </section>

            {/* ── Floor Plan ── */}
            {listing.floorPlan && (
              <section ref={sectionRefs["Floor Plan"]}>
                <FadeUp>
                  <div className="flex items-center gap-3 mb-5">
                    <div className="h-5 w-0.5 rounded-full bg-brand-gold" />
                    <h2 className="font-display text-2xl font-bold text-white">Floor Plan</h2>
                  </div>
                </FadeUp>
                <FadeUp delay={0.06}>
                  <FloorPlanSection listing={listing} />
                </FadeUp>
              </section>
            )}

            {/* ── Amenities ── */}
            {listing.amenities && listing.amenities.length > 0 && (
              <section ref={sectionRefs.Amenities}>
                <FadeUp>
                  <DetailSection title="Amenities & Features">
                    <div className="flex flex-wrap gap-2.5">
                      {listing.amenities.map((a, i) => (
                        <FadeUp key={a} delay={i * 0.04}>
                          <motion.div
                            whileHover={{ scale: 1.04, y: -2 }}
                            whileTap={{ scale: 0.97 }}
                            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-2.5 text-[13px] text-white font-sans hover:border-brand-teal/30 hover:bg-brand-teal/[0.06] transition-all duration-200 cursor-default"
                          >
                            <span className="text-brand-teallight">{getAmenityIcon(a)}</span>
                            {a}
                          </motion.div>
                        </FadeUp>
                      ))}
                    </div>
                  </DetailSection>
                </FadeUp>
              </section>
            )}

            {/* ── Location ── */}
            <section ref={sectionRefs.Location}>
              <FadeUp>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-5 w-0.5 rounded-full bg-brand-teal" />
                  <h2 className="font-display text-2xl font-bold text-white">Location</h2>
                </div>
              </FadeUp>
              <FadeUp delay={0.06}>
                {(() => {
                  const r = resolveLocation(listing);
                  const fields = [
                    { label: "Street",  value: r.street  },
                    { label: "Area",    value: r.suburb  },
                    { label: "City",    value: r.city    },
                    { label: "County",  value: r.county  },
                    { label: "Country", value: r.country },
                  ].filter((f) => f.value);
                  return (
                    <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03]">
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-teal/30 to-transparent" />
                      <div className="absolute -bottom-8 -right-8 h-28 w-28 rounded-full bg-brand-teal/8 blur-2xl pointer-events-none" />
                      <div className="relative p-5 grid grid-cols-2 gap-x-8 gap-y-4">
                        {fields.map(({ label, value }) => (
                          <div key={label}>
                            <div className="text-[10px] uppercase tracking-wider text-brand-muted font-sans mb-0.5">{label}</div>
                            <div className="text-[13px] font-sans font-medium text-white flex items-center gap-1.5">
                              <IcoLocation size={11} className="text-brand-teal shrink-0" /> {value}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </FadeUp>
            </section>

            {/* ── How it works ── */}
            <FadeUp>
              <DetailSection title="How to Rent / Buy">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { icon: <IcoEye size={20} className="text-brand-gold" />,    num: "01", title: "Browse & Save",    desc: "Explore listings, save favourites." },
                    { icon: <IcoCalendar size={20} className="text-brand-teallight" />, num: "02", title: "Book a Viewing", desc: "Schedule a physical or virtual tour." },
                    { icon: <IcoKey size={20} className="text-brand-gold" />,     num: "03", title: "Sign Lease",       desc: "Digital contract from anywhere." },
                    { icon: <IcoWallet size={20} className="text-brand-teallight" />,   num: "04", title: "Pay & Move In",  desc: "M-Pesa or card. Get your keys." },
                  ].map((s, i) => (
                    <FadeUp key={s.num} delay={i * 0.08}>
                      <div className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 text-center hover:border-brand-gold/20 transition-all duration-300">
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-b from-brand-gold/[0.04] to-transparent transition-opacity duration-300" />
                        <div className="relative">
                          <div className="flex h-10 w-10 mx-auto items-center justify-center rounded-xl bg-white/5 border border-white/[0.07] mb-3">
                            {s.icon}
                          </div>
                          <div className="absolute -top-1 -right-1 text-[9px] font-sans font-bold text-brand-muted/50">{s.num}</div>
                          <div className="text-[12px] font-sans font-semibold text-white mb-1">{s.title}</div>
                          <div className="text-[11px] text-brand-muted font-sans leading-snug">{s.desc}</div>
                        </div>
                      </div>
                    </FadeUp>
                  ))}
                </div>
              </DetailSection>
            </FadeUp>

            {/* ── Reviews & rating ── */}
            <section ref={sectionRefs.Reviews}>
              <FadeUp>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-5 w-0.5 rounded-full bg-brand-teal" />
                  <h2 className="font-display text-2xl font-bold text-white">Reviews</h2>
                </div>
              </FadeUp>
              <FadeUp delay={0.06}>
                <div className="relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-5">
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/25 to-transparent" />
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Current score */}
                    <div className="text-center shrink-0">
                      <div className="font-display text-5xl font-bold text-brand-gold leading-none">
                        {Number(listing.rating ?? 0).toFixed(1)}
                      </div>
                      <StarRating value={listing.rating} size={14} className="mt-2 justify-center" />
                      <div className="text-[11px] text-brand-muted mt-1 font-sans">Overall rating</div>
                    </div>
                    <div className="h-px w-full sm:h-16 sm:w-px bg-white/[0.07]" />
                    {/* Rate this */}
                    <div className="flex-1">
                      {rated ? (
                        <div className="flex items-center gap-2 text-emerald-400">
                          <IcoCheck size={18} />
                          <span className="text-[13px] font-sans">Thanks for rating!</span>
                          <StarRating value={userRating} size={14} />
                        </div>
                      ) : (
                        <div>
                          <div className="text-[13px] text-brand-muted mb-3 font-sans">Share your experience with this property</div>
                          <InteractiveStars value={userRating} onRate={handleRate} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </FadeUp>
            </section>

          </div>

          {/* ─── RIGHT: sticky panel ─── */}
          <div>
            <EnquiryPanel listing={listing} isActiveTenant={isActiveTenant} />
          </div>
        </div>

        {/* ── Similar listings ── */}
        {similar.length > 0 && (
          <div className="mt-20">
            <FadeUp>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="h-5 w-0.5 rounded-full bg-brand-gold" />
                    <h2 className="font-display text-2xl font-bold text-white">Similar Properties</h2>
                  </div>
                  <p className="text-[13px] text-brand-muted font-sans ml-3.5">AI-powered recommendations based on your location and preferences.</p>
                </div>
                <Link to="/explore" className="hidden sm:flex items-center gap-1.5 text-[12px] text-brand-muted hover:text-brand-gold transition font-sans font-semibold">
                  Explore all <IcoArrowRight size={13} />
                </Link>
              </div>
            </FadeUp>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {similar.map((l, i) => (
                <FadeUp key={l.id} delay={i * 0.07}>
                  <ListingCard listing={l} index={i} showSaveButton />
                </FadeUp>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
