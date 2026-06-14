import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { listingsApi, asListingArray, type Listing } from "../lib/api";
import { ListingCard } from "../components/ListingCard";
import { GrainLayer, MarqueeStrip, Reveal, SectionHeading } from "../components/ui";
import {
  IcoArrowRight, IcoBed, IcoBuilding, IcoCalendar,
  IcoChevLeft, IcoChevRight, IcoKey, IcoLocation,
  IcoSearch, IcoSparkle, IcoStar, IcoWallet, IcoEye,
} from "../components/icons";

/* ── Hero background images ──────────────────────────────────────── */
const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=85",
  "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1920&q=85",
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1920&q=85",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1920&q=85",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1920&q=85",
];

/* ── Constants ───────────────────────────────────────────────────── */
const MARQUEE_ITEMS = [
  "Nairobi", "4,200+ Active Listings", "Mombasa", "Verified Properties",
  "Kisumu", "AI-Powered Search", "Nakuru", "Digital Lease Signing",
  "Eldoret", "M-Pesa Payments", "Thika", "24/7 Support",
];

const QUICK_CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];

const PROPERTY_TYPES = [
  { label: "Apartments", icon: <IcoBuilding size={26} className="text-brand-gold" />,     count: "1,200+", query: "Apartment" },
  { label: "Houses",     icon: <IcoKey size={26} className="text-brand-teallight" />,      count: "800+",   query: "House" },
  { label: "Studios",    icon: <IcoBed size={26} className="text-brand-gold" />,           count: "350+",   query: "Studio" },
  { label: "Villas",     icon: <IcoStar size={26} className="text-brand-teallight" />,     count: "120+",   query: "Villa" },
  { label: "Offices",    icon: <IcoBuilding size={26} className="text-brand-gold" />,      count: "240+",   query: "Office" },
  { label: "AirBnBs",   icon: <IcoCalendar size={26} className="text-brand-teallight" />, count: "90+",    query: "AirBnB" },
];

const HOW_STEPS = [
  { num: "01", icon: <IcoSearch size={22} className="text-brand-gold" />,     title: "Search & Explore", desc: "Browse thousands of verified listings with AI-driven filters." },
  { num: "02", icon: <IcoEye size={22} className="text-brand-teallight" />,   title: "Book a Viewing",   desc: "Schedule a physical visit or virtual tour at your convenience." },
  { num: "03", icon: <IcoKey size={22} className="text-brand-gold" />,        title: "Sign & Secure",    desc: "Digital lease signing, no paperwork, secure deposit." },
  { num: "04", icon: <IcoWallet size={22} className="text-brand-teallight" />, title: "Pay & Move In",   desc: "Pay via M-Pesa or card. Collect your keys and move in." },
];

const TESTIMONIALS = [
  { name: "Amara W.",    location: "Nairobi",  rating: 5, text: "Found my apartment in 2 days! The AI search was unbelievably accurate — it knew exactly what I needed before I finished typing." },
  { name: "Brian K.",    location: "Mombasa",  rating: 5, text: "The whole process from search to lease was seamless. No agents calling me 10 times a day. Everything just worked." },
  { name: "Christine M.", location: "Kisumu", rating: 5, text: "Listings have real photos and honest descriptions. No more showing up to find a property looks nothing like the ad." },
  { name: "David O.",    location: "Nakuru",   rating: 4, text: "Sage AI is brilliant. I asked it to find a 2-bedroom near a good school under 30k and it delivered in under a minute." },
];

/* ── Mouse parallax hook ─────────────────────────────────────────── */
function useMouseParallax(intensity = 12) {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setPos({
        x: (e.clientX / window.innerWidth  - 0.5) * intensity,
        y: (e.clientY / window.innerHeight - 0.5) * intensity,
      });
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [intensity]);
  return pos;
}

/* ── Hero search ─────────────────────────────────────────────────── */
function HeroSearch() {
  const navigate = useNavigate();
  const [query, setQuery]             = useState("");
  const [listingType, setListingType] = useState("Rent");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (query.trim()) p.set("q", query.trim());
    navigate(`/explore?${p.toString()}`);
  }

  return (
    <div className="w-full max-w-xl">
      <div className="mb-3 flex gap-2">
        {["Rent", "Buy", "AirBnB"].map((t) => (
          <button
            key={t}
            onClick={() => setListingType(t)}
            className={`rounded-lg px-5 py-2 text-xs font-hero font-semibold tracking-wide transition-all duration-200 ${
              listingType === t
                ? "bg-brand-gold text-brand-dark shadow-glow-gold"
                : "bg-white/10 text-white/60 hover:text-white hover:bg-white/15"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <form
        onSubmit={handleSearch}
        className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-xl border border-white/15 p-1.5"
      >
        <div className="flex flex-1 items-center gap-2 px-3">
          <IcoSearch size={15} className="shrink-0 text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="City, area, or property type…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/35 outline-none font-sans"
          />
        </div>
        <button type="submit" className="btn-gold text-xs py-2.5 px-5 rounded-lg shrink-0 font-hero font-semibold tracking-wide">
          Search <IcoArrowRight size={14} />
        </button>
      </form>
      <div className="mt-2.5 flex flex-wrap gap-1.5 items-center">
        <span className="text-[10px] text-white/30 uppercase tracking-wider font-hero">Popular:</span>
        {QUICK_CITIES.map((c) => (
          <button
            key={c}
            onClick={() => navigate(`/explore?q=${encodeURIComponent(c)}`)}
            className="rounded-full border border-white/10 px-3 py-0.5 text-[11px] text-white/50 hover:border-brand-gold/40 hover:text-brand-goldlight transition-all duration-200 font-sans"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Cinematic hero with rotating images ─────────────────────────── */
function CinematicHero() {
  const [imgIdx,    setImgIdx]    = useState(0);
  const [paused,    setPaused]    = useState(false);
  const intervalRef               = useRef<ReturnType<typeof setInterval> | null>(null);
  const { x: mx,   y: my }       = useMouseParallax(10);

  const advance = useCallback((dir: 1 | -1) => {
    setImgIdx((i) => (i + dir + HERO_IMAGES.length) % HERO_IMAGES.length);
  }, []);

  /* Auto-advance every 3 seconds unless paused */
  useEffect(() => {
    if (paused) return;
    intervalRef.current = setInterval(() => advance(1), 3000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [paused, advance]);

  const letters = "STAYHERE".split("");

  return (
    <section
      className="relative h-screen min-h-[680px] overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* ── Rotating background images (crossfade) ── */}
      <div className="absolute inset-0">
        <AnimatePresence mode="sync">
          <motion.div
            key={imgIdx}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            {/* Mouse parallax on the image — moves opposite to content */}
            <motion.img
              src={HERO_IMAGES[imgIdx]}
              alt=""
              animate={{ x: -mx * 0.4, y: -my * 0.4, scale: 1.08 }}
              transition={{ type: "spring", stiffness: 40, damping: 25 }}
              className="h-full w-full object-cover"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = HERO_IMAGES[0];
              }}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Cinematic overlay ── */}
      <div className="cinematic-overlay absolute inset-0" />
      <GrainLayer opacity={0.04} />

      {/* ── Giant outlined brand text (right-anchored) ── */}
      <div className="absolute right-0 bottom-[90px] overflow-hidden pointer-events-none select-none">
        <div className="hero-outline-text flex" style={{ fontSize: "clamp(2.8rem, 8vw, 10rem)" }}>
          {letters.map((l, i) => (
            <motion.span
              key={`${l}-${i}`}
              initial={{ opacity: 0, y: 70 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.75, delay: 0.8 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block"
            >
              {l}
            </motion.span>
          ))}
        </div>
      </div>

      {/* ── Main content (parallax with mouse) ── */}
      <motion.div
        animate={{ x: mx * 0.6, y: my * 0.6 }}
        transition={{ type: "spring", stiffness: 40, damping: 25 }}
        className="relative z-10 h-full flex flex-col justify-between px-6 py-6 sm:px-10 lg:px-16 max-w-screen-2xl mx-auto"
      >
        {/* TOP: headline + stats */}
        <div className="flex items-start justify-between pt-24 lg:pt-28">

          {/* Left: text stack */}
          <div className="max-w-lg">
            {/* Line-by-line clip reveal */}
            <div className="hero-solid-text text-white">
              {[
                { text: "Discover Your",       gold: false },
                { text: "Perfect Home",        gold: false },
                { text: "in Kenya.",           gold: true  },
              ].map(({ text, gold }, li) => (
                <div key={li} className="clip-parent">
                  <motion.div
                    initial={{ y: "110%" }}
                    animate={{ y: 0 }}
                    transition={{ duration: 0.85, delay: 0.22 + li * 0.14, ease: [0.16, 1, 0.3, 1] }}
                    className={`text-4xl sm:text-5xl lg:text-[3.8rem] leading-[0.95] ${
                      gold ? "text-gradient-gold" : "text-white"
                    }`}
                  >
                    {text}
                  </motion.div>
                </div>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.72, duration: 0.6 }}
              className="mt-5 text-[13px] text-white/45 max-w-xs leading-relaxed font-sans"
            >
              Thousands of verified rentals, sales, and short-stay listings — powered by AI.
            </motion.p>
          </div>

          {/* Right: floating stats */}
          <div className="hidden lg:flex flex-col gap-10 text-right">
            {[
              { value: "4,200+", desc: "Verified listings\ndelivered across Kenya" },
              { value: "8,500+", desc: "Happy tenants placed\nin their dream homes" },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 28 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="group"
              >
                <p className="font-hero font-bold text-white text-5xl leading-none group-hover:text-brand-gold transition-colors duration-300">
                  {s.value}
                </p>
                <p className="text-[11px] text-white/35 mt-2 leading-relaxed max-w-[150px] ml-auto whitespace-pre-line font-sans">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* BOTTOM: search + controls */}
        <div className="pb-1">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.88, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          >
            <HeroSearch />
          </motion.div>
        </div>
      </motion.div>

      {/* ── Image counter (top-right) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute top-20 right-6 sm:right-10 lg:right-16 z-20 flex items-center gap-3"
      >
        <span className="text-[11px] font-hero font-semibold text-white/60 tabular-nums">
          {String(imgIdx + 1).padStart(2, "0")}
          <span className="text-white/25 mx-1">/</span>
          {String(HERO_IMAGES.length).padStart(2, "0")}
        </span>
      </motion.div>

      {/* ── Image progress bars (bottom-center above brand text) ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-[152px] left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
      >
        {HERO_IMAGES.map((_, i) => (
          <button
            key={i}
            onClick={() => setImgIdx(i)}
            className="relative h-[3px] overflow-hidden rounded-full bg-white/20 transition-all duration-300"
            style={{ width: i === imgIdx ? 40 : 12 }}
            aria-label={`Image ${i + 1}`}
          >
            {i === imgIdx && (
              <motion.div
                key={imgIdx}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: paused ? 9999 : 3, ease: "linear" }}
                style={{ originX: 0 }}
                className="absolute inset-0 bg-white rounded-full"
              />
            )}
          </button>
        ))}
      </motion.div>

      {/* ── Prev / Next arrows ── */}
      {[
        { dir: -1 as const, side: "left-4  sm:left-8", Icon: IcoChevLeft  },
        { dir:  1 as const, side: "right-4 sm:right-8", Icon: IcoChevRight },
      ].map(({ dir, side, Icon }) => (
        <button
          key={dir}
          onClick={() => advance(dir)}
          className={`absolute ${side} top-1/2 -translate-y-1/2 z-20 flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20 hover:border-white/30 transition-all duration-200 opacity-0 group-hover:opacity-100`}
          style={{ opacity: 1 }} /* always visible */
          aria-label={dir === -1 ? "Previous" : "Next"}
        >
          <Icon size={16} />
        </button>
      ))}

      {/* ── Bottom edge micro-labels ── */}
      <div className="absolute bottom-5 left-6 sm:left-10 lg:left-16 text-[9px] text-white/20 uppercase tracking-[0.3em] z-10 pointer-events-none font-hero">
        Redefine How You Experience Living
      </div>
      <div className="absolute bottom-5 right-6 sm:right-10 lg:right-16 text-[9px] text-white/20 uppercase tracking-[0.3em] z-10 pointer-events-none font-hero text-right">
        Welcome To The Future Of Renting
      </div>

      {/* ── Scroll indicator ── */}
      <motion.div
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2.2 }}
        className="absolute bottom-5 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/20 z-10 pointer-events-none"
      >
        <div className="h-8 w-px bg-gradient-to-b from-transparent to-white/25" />
        <span className="text-[8px] uppercase tracking-[0.4em] font-hero">Scroll</span>
      </motion.div>
    </section>
  );
}

/* ── Featured carousel ───────────────────────────────────────────── */
function FeaturedCarousel({ listings }: { listings: Listing[] }) {
  const [start, setStart] = useState(0);
  const visible = Math.min(3, listings.length);
  if (!listings.length) return null;
  return (
    <div>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.slice(start, start + visible).map((l, i) => (
          <ListingCard key={l.id} listing={l} index={i} showSaveButton />
        ))}
      </div>
      {listings.length > visible && (
        <div className="mt-8 flex justify-center gap-3">
          {[
            { fn: () => setStart((s) => Math.max(0, s - visible)), can: start > 0, Icon: IcoChevLeft },
            { fn: () => setStart((s) => Math.min(listings.length - visible, s + visible)), can: start + visible < listings.length, Icon: IcoChevRight },
          ].map(({ fn, can, Icon }, i) => (
            <button
              key={i} onClick={fn} disabled={!can}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-white disabled:opacity-20 hover:border-brand-gold/50 hover:bg-brand-gold/10 transition-all duration-200"
            >
              <Icon size={17} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── AI Sage section ─────────────────────────────────────────────── */
function AiSection() {
  const [typed, setTyped] = useState("");
  const response = "Found 12 matching apartments! Top pick: Modern 2BR in Parklands, 42k/mo — Wi-Fi, parking, gym access included. Want more options?";
  const idxRef   = useRef(0);

  useEffect(() => {
    if (idxRef.current >= response.length) return;
    const t = setTimeout(() => {
      setTyped(response.slice(0, idxRef.current + 1));
      idxRef.current += 1;
    }, 22);
    return () => clearTimeout(t);
  }, [typed]);

  return (
    <section className="mx-auto max-w-5xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-smoke via-brand-card to-brand-dark" />
        <div className="absolute inset-0 bg-dot-pattern opacity-35" />
        <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full bg-brand-gold/12 blur-3xl" />
        <div className="pointer-events-none absolute -left-6 bottom-0 h-48 w-48 rounded-full bg-brand-teal/18 blur-3xl" />
        <GrainLayer opacity={0.02} />

        <div className="relative z-10 flex flex-col sm:flex-row items-center gap-10 p-8 sm:p-12">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-teal/30 bg-brand-teal/10 px-3 py-1.5 text-[10px] font-hero font-semibold uppercase tracking-widest text-brand-teallight mb-4">
              <IcoSparkle size={11} /> Powered by AI
            </div>
            <h2 className="font-hero font-bold text-3xl sm:text-4xl text-white leading-tight">
              Meet <span className="text-gradient-aurora">Sage</span>,<br />Your AI Property Assistant
            </h2>
            <p className="mt-4 text-[13px] text-brand-muted leading-relaxed font-sans">
              Describe your ideal home in plain language. Sage understands your needs, budget, and lifestyle to find you the perfect match instantly.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["Find 2BR near Westlands under 45k", "I need a pet-friendly apartment", "Best AirBnBs in Mombasa this weekend"].map((q) => (
                <button
                  key={q}
                  onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))}
                  className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55 hover:border-brand-gold/30 hover:text-white hover:bg-white/[0.08] transition-all duration-200 font-sans"
                >
                  "{q}"
                </button>
              ))}
            </div>
            <button onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))} className="btn-gold mt-6">
              <IcoSparkle size={15} /> Ask Sage Now
            </button>
          </div>

          <div className="w-full sm:w-72 shrink-0 space-y-3">
            <div className="flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-br-sm border border-brand-gold/15 bg-brand-gold/15 px-4 py-2.5 text-[13px] text-white leading-relaxed font-sans">
                Find me a 2BR near Westlands, max 45k/mo
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-sm border border-white/[0.06] bg-white/[0.07] px-4 py-2.5 text-[13px] text-white leading-relaxed font-sans">
                <span className="block text-[10px] text-brand-teallight font-hero font-semibold mb-1 uppercase tracking-wider">Sage AI</span>
                {typed}
                {typed.length < response.length && (
                  <span className="inline-block w-0.5 h-3.5 bg-brand-teallight ml-0.5 animate-pulse align-text-bottom" />
                )}
              </div>
            </div>
            {typed.length >= response.length && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
                <div className="flex gap-1.5 rounded-2xl bg-white/[0.06] border border-white/[0.05] px-4 py-3 rounded-bl-sm">
                  {[0, 1, 2].map((i) => (
                    <span key={i} className="h-1.5 w-1.5 rounded-full bg-white/35 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export function HomePage() {
  const navigate = useNavigate();
  const [featured,        setFeatured]        = useState<Listing[]>([]);
  const [recent,          setRecent]          = useState<Listing[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [testimonialIdx,  setTestimonialIdx]  = useState(0);

  const { scrollY } = useScroll();
  useTransform(scrollY, [0, 600], [0, -30]);

  useEffect(() => {
    listingsApi.getFeatured(6)
      .then((d) => setFeatured(asListingArray(d)))
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));
    listingsApi.getAvailable(1, 6)
      .then((d) => setRecent(asListingArray(d)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const allFeatured = featured.length ? featured : recent;

  return (
    <div className="overflow-x-hidden">

      {/* ── 1. Cinematic hero ── */}
      <CinematicHero />

      {/* ── 2. Marquee ── */}
      <MarqueeStrip items={MARQUEE_ITEMS} />

      {/* ── 3. Property types ── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading
          title="Browse by Type"
          subtitle="Whatever you're looking for — city studio, seaside villa, or office space."
          tag="Property Categories"
        />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PROPERTY_TYPES.map((pt, i) => (
            <Reveal key={pt.label} delay={i * 0.07}>
              <motion.button
                whileHover={{ y: -5, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => navigate(`/explore?q=${encodeURIComponent(pt.query)}`)}
                className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.08] bg-brand-card py-7 px-3 text-center transition-all duration-300 hover:border-brand-gold/30 hover:shadow-glow-gold"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-b from-brand-gold/[0.05] to-transparent" />
                <div className="relative flex flex-col items-center gap-3">
                  <div className="flex h-13 w-13 items-center justify-center rounded-xl bg-white/5 group-hover:bg-white/10 transition-colors duration-300">
                    {pt.icon}
                  </div>
                  <span className="font-hero font-semibold text-white text-[12px] tracking-wide">{pt.label}</span>
                  <span className="text-[11px] text-brand-muted font-sans">{pt.count}</span>
                </div>
              </motion.button>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── 4. Featured listings ── */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-10">
          <SectionHeading title="Featured Properties" subtitle="Hand-picked premium listings across Kenya." tag="Editor's Choice" />
          <Link to="/explore" className="hidden sm:flex items-center gap-1.5 text-[12px] text-brand-muted hover:text-brand-gold transition-colors group font-hero font-semibold">
            View All <IcoArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
        {loadingFeatured ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-dark overflow-hidden">
                <div className="h-52 skeleton" />
                <div className="p-4 space-y-3"><div className="h-4 skeleton w-3/4" /><div className="h-3 skeleton w-1/2" /></div>
              </div>
            ))}
          </div>
        ) : (
          <FeaturedCarousel listings={allFeatured} />
        )}
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="section-divider" /></div>

      {/* ── 5. How it works ── */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-brand-smoke/25 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-dot-pattern opacity-20 pointer-events-none" />
        <div className="relative mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading title="How It Works" subtitle="From search to move-in in 4 simple steps." tag="The Process" center />
          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 relative">
            <div className="hidden lg:block absolute top-[54px] left-[calc(12.5%+24px)] right-[calc(12.5%+24px)] h-px bg-gradient-to-r from-transparent via-brand-gold/25 to-transparent" />
            {HOW_STEPS.map((s, i) => (
              <Reveal key={s.num} delay={i * 0.1}>
                <div className="group relative rounded-2xl border border-white/[0.07] bg-brand-card p-6 text-center hover:border-brand-gold/25 hover:shadow-card-hover transition-all duration-300 overflow-hidden">
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-b from-brand-gold/[0.04] to-transparent" />
                  <div className="relative flex justify-center mb-5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/5 border border-white/[0.07] group-hover:border-brand-gold/25 transition-colors duration-300">
                      {s.icon}
                    </div>
                    <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-dark border border-white/10 text-[9px] font-hero font-bold text-brand-muted">
                      {s.num}
                    </div>
                  </div>
                  <h3 className="font-hero font-semibold text-white text-[13px] mb-2 tracking-wide">{s.title}</h3>
                  <p className="text-[12px] text-brand-muted leading-relaxed font-sans">{s.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link to="/explore" className="btn-gold font-hero font-semibold">
              Start Searching <IcoArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 6. AI Sage ── */}
      <AiSection />

      {/* ── 7. Latest available ── */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-10">
            <SectionHeading title="Latest Available" subtitle="Freshly listed — be the first to enquire." tag="New Today" />
            <Link to="/explore" className="hidden sm:flex items-center gap-1.5 text-[12px] text-brand-muted hover:text-brand-gold transition-colors font-hero font-semibold">
              Explore All <IcoArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((l, i) => <ListingCard key={l.id} listing={l} index={i} showSaveButton />)}
          </div>
        </section>
      )}

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="section-divider" /></div>

      {/* ── 8. Testimonials ── */}
      <section className="mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
        <SectionHeading title="What Our Tenants Say" tag="Real Stories" center />
        <div className="mt-12 relative overflow-hidden min-h-[220px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, x: 50, scale: 0.98 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -50, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="relative overflow-hidden rounded-3xl border border-white/[0.06] p-8 sm:p-10 text-center mx-auto max-w-2xl"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-smoke via-brand-card to-brand-dark" />
              <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-48 bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />
              <GrainLayer opacity={0.02} />
              <div className="relative z-10">
                <div className="flex justify-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <IcoStar key={i} size={15} className={i < TESTIMONIALS[testimonialIdx].rating ? "text-brand-gold" : "text-white/15"} />
                  ))}
                </div>
                <div className="text-4xl text-brand-gold/20 font-accent leading-none mb-1">"</div>
                <p className="text-sm sm:text-[15px] text-white/80 leading-relaxed font-sans">
                  {TESTIMONIALS[testimonialIdx].text}
                </p>
                <div className="mt-6 flex items-center justify-center gap-3">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-gold/25 font-hero font-bold text-brand-gold text-sm"
                    style={{ background: "linear-gradient(135deg,rgba(232,212,139,0.12),rgba(201,162,39,0.06))" }}
                  >
                    {TESTIMONIALS[testimonialIdx].name[0]}
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-hero font-semibold text-white">{TESTIMONIALS[testimonialIdx].name}</p>
                    <p className="text-[11px] text-brand-muted flex items-center gap-1 font-sans">
                      <IcoLocation size={10} className="text-brand-teal" />{TESTIMONIALS[testimonialIdx].location}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          <div className="mt-6 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                className={`rounded-full transition-all duration-300 ${i === testimonialIdx ? "h-1.5 w-7 bg-brand-gold" : "h-1.5 w-1.5 bg-white/15 hover:bg-white/30"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── 9. CTA banner ── */}
      <section className="mx-auto max-w-5xl px-4 pb-24 sm:px-6 lg:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl border border-white/[0.06]">
            <div className="absolute inset-0">
              <img
                src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1200&q=80"
                alt=""
                className="h-full w-full object-cover opacity-20"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-br from-brand-dark/90 via-brand-dark/75 to-brand-dark/90" />
            <div className="absolute inset-0 bg-dot-pattern opacity-20" />
            <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-brand-gold/18 blur-3xl" />
            <div className="pointer-events-none absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-brand-teal/22 blur-3xl" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-64 bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />
            <GrainLayer opacity={0.025} />

            <div className="relative z-10 p-10 sm:p-14 text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/25 bg-brand-gold/10 px-4 py-1.5 text-[10px] font-hero font-semibold uppercase tracking-widest text-brand-gold mb-5">
                <IcoSparkle size={11} /> Join StayHere Today
              </span>
              <h2 className="font-hero font-bold text-4xl sm:text-5xl text-white leading-tight">
                Ready To Find<br />
                <span className="text-gradient-gold">Your Dream Home?</span>
              </h2>
              <p className="mt-4 text-[13px] text-brand-muted max-w-sm mx-auto leading-relaxed font-sans">
                Join thousands of Kenyans who found their perfect space on StayHere. It's free to start.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-4">
                <Link to="/signup" className="btn-gold px-8 font-hero font-semibold">Create Account <IcoArrowRight size={16} /></Link>
                <Link to="/explore" className="btn-ghost px-8 font-hero font-semibold">Browse Listings</Link>
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-6 text-[12px] text-brand-muted font-sans">
                {[["4,200+", "Active Listings"], ["1,200+", "Verified Owners"], ["8,500+", "Happy Tenants"]].map(([v, l]) => (
                  <div key={l} className="flex items-center gap-1.5">
                    <span className="font-hero font-bold text-white text-sm">{v}</span> {l}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
