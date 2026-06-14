import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useScroll, useTransform, AnimatePresence } from "framer-motion";
import { listingsApi, asListingArray, type Listing } from "../lib/api";
import { ListingCard } from "../components/ListingCard";
import { AnimatedCounter, GradientBlobs, SectionHeading } from "../components/ui";
import {
  IcoArrowRight, IcoBed, IcoBuilding, IcoCalendar,
  IcoChevLeft, IcoChevRight, IcoKey, IcoLocation,
  IcoSearch, IcoSparkle, IcoStar, IcoWallet, IcoEye,
} from "../components/icons";

/* ── Hero search bar ─────────────────────────────────────────────── */
const QUICK_CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret"];
function HeroSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [listingType, setListingType] = useState("Rent");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    navigate(`/explore?${params.toString()}`);
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Listing type tabs */}
      <div className="mb-4 flex gap-2">
        {["Rent", "Buy", "AirBnB"].map((t) => (
          <button
            key={t}
            onClick={() => setListingType(t)}
            className={`rounded-xl px-5 py-2 text-sm font-semibold transition ${
              listingType === t
                ? "bg-brand-gold text-brand-dark shadow-lg shadow-brand-gold/25"
                : "glass text-white/70 hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search input */}
      <form onSubmit={handleSearch} className="glass-strong flex items-center gap-3 rounded-2xl p-2 shadow-elevated">
        <div className="flex flex-1 items-center gap-2 px-3">
          <IcoSearch size={18} className="shrink-0 text-brand-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search city, area, or property type…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-brand-muted outline-none"
          />
        </div>
        <button type="submit" className="btn-gold py-2.5 px-5 text-sm rounded-xl shrink-0">
          Search <IcoArrowRight size={16} />
        </button>
      </form>

      {/* Quick filters */}
      <div className="mt-3 flex flex-wrap gap-2">
        <span className="text-xs text-brand-muted self-center">Popular:</span>
        {QUICK_CITIES.map((c) => (
          <button
            key={c}
            onClick={() => navigate(`/explore?q=${encodeURIComponent(c)}`)}
            className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:border-brand-gold/40 hover:text-white transition"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Property type cards ─────────────────────────────────────────── */
const PROPERTY_TYPES = [
  { label: "Apartments", icon: <IcoBuilding size={28} className="text-brand-gold" />, count: "1,200+", query: "Apartment" },
  { label: "Houses", icon: <IcoKey size={28} className="text-brand-teallight" />, query: "House", count: "800+" },
  { label: "Studios", icon: <IcoBed size={28} className="text-brand-gold" />, query: "Studio", count: "350+" },
  { label: "Villas", icon: <IcoStar size={28} className="text-brand-teallight" />, query: "Villa", count: "120+" },
  { label: "Offices", icon: <IcoBuilding size={28} className="text-brand-gold" />, query: "Office", count: "240+" },
  { label: "AirBnBs", icon: <IcoCalendar size={28} className="text-brand-teallight" />, query: "AirBnB", count: "90+" },
];

/* ── How it works steps ──────────────────────────────────────────── */
const HOW_STEPS = [
  { num: "01", icon: <IcoSearch size={26} className="text-brand-gold" />, title: "Search & Explore", desc: "Browse thousands of verified listings with powerful filters — location, size, amenities, and price." },
  { num: "02", icon: <IcoEye size={26} className="text-brand-teallight" />, title: "Book a Viewing", desc: "Schedule a physical visit or virtual tour at a time that works for you." },
  { num: "03", icon: <IcoKey size={26} className="text-brand-gold" />, title: "Sign & Secure", desc: "Digital lease signing, no paperwork. Reserve your property with a secure deposit." },
  { num: "04", icon: <IcoWallet size={26} className="text-brand-teallight" />, title: "Pay & Move In", desc: "Pay via M-Pesa or card. Collect your keys and start your new chapter." },
];

/* ── Testimonials ────────────────────────────────────────────────── */
const TESTIMONIALS = [
  { name: "Amara W.", location: "Nairobi", rating: 5, text: "Found my apartment in 2 days! The AI search was unbelievably accurate — it knew exactly what I needed before I finished typing." },
  { name: "Brian K.", location: "Mombasa", rating: 5, text: "The whole process from search to lease was seamless. No agents calling me 10 times a day. Everything just worked." },
  { name: "Christine M.", location: "Kisumu", rating: 5, text: "I loved that the listings have real photos and honest descriptions. No more showing up to discover a property is nothing like the ad." },
  { name: "David O.", location: "Nakuru", rating: 4, text: "Sage AI is brilliant. I asked it to find a 2-bedroom near a good school under 30k and it found exactly that in under a minute." },
];

/* ── Featured carousel ───────────────────────────────────────────── */
function FeaturedCarousel({ listings }: { listings: Listing[] }) {
  const [start, setStart] = useState(0);
  const visible = Math.min(3, listings.length);
  const canPrev = start > 0;
  const canNext = start + visible < listings.length;

  if (!listings.length) return null;
  return (
    <div className="relative">
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {listings.slice(start, start + visible).map((l, i) => (
          <ListingCard key={l.id} listing={l} index={i} showSaveButton />
        ))}
      </div>
      {listings.length > visible && (
        <div className="mt-6 flex justify-center gap-3">
          <button
            onClick={() => setStart((s) => Math.max(0, s - visible))}
            disabled={!canPrev}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white disabled:opacity-30 hover:border-brand-gold/40 transition"
          >
            <IcoChevLeft size={18} />
          </button>
          <button
            onClick={() => setStart((s) => Math.min(listings.length - visible, s + visible))}
            disabled={!canNext}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 text-white disabled:opacity-30 hover:border-brand-gold/40 transition"
          >
            <IcoChevRight size={18} />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── AI section ──────────────────────────────────────────────────── */
function AiSection() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="overflow-hidden rounded-3xl glass-strong relative">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-brand-gold/15 blur-3xl" />
          <div className="absolute -left-10 bottom-0 h-48 w-48 rounded-full bg-brand-teal/20 blur-3xl" />
        </div>
        <div className="relative z-10 p-8 sm:p-12 flex flex-col sm:flex-row items-center gap-8">
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-brand-gold mb-5">
              <IcoSparkle size={14} /> Powered by AI
            </div>
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl leading-snug">
              Meet <span className="text-gradient-gold">Sage</span>,<br />Your AI Property Assistant
            </h2>
            <p className="mt-4 text-brand-muted leading-relaxed">
              Describe your ideal home in plain language. Sage understands your needs, budget, and lifestyle to find you the perfect match — instantly.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {[
                "Find 2BR near Westlands under 45k",
                "I need a pet-friendly apartment",
                "Best AirBnBs in Mombasa this weekend",
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))}
                  className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs text-white/70 hover:border-brand-gold/30 hover:text-white transition"
                >
                  "{q}"
                </button>
              ))}
            </div>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("sh:open-ai-chat"))}
              className="btn-gold mt-6"
            >
              <IcoSparkle size={16} /> Ask Sage Now
            </button>
          </div>
          {/* Mock chat bubble */}
          <div className="w-full sm:w-72 shrink-0 space-y-3">
            {[
              { role: "user", text: "Find me a 2BR near Westlands, max 45k/mo" },
              { role: "sage", text: "Found 12 matching apartments! Top pick: Modern 2BR in Parklands, 42k/mo, with Wi-Fi, parking, and a gym. Want me to show more?" },
            ].map((m) => (
              <div key={m.text} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${m.role === "user" ? "bg-brand-gold/20 text-white rounded-br-sm" : "bg-white/10 text-white rounded-bl-sm"}`}>
                  {m.role === "sage" && <span className="block text-[10px] text-brand-teallight font-semibold mb-1 uppercase tracking-wider">Sage AI</span>}
                  {m.text}
                </div>
              </div>
            ))}
            <div className="flex justify-start">
              <div className="flex gap-1 rounded-2xl bg-white/10 px-4 py-3 rounded-bl-sm">
                {[0, 1, 2].map((i) => <span key={i} className="h-2 w-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Main page ───────────────────────────────────────────────────── */
export function HomePage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState<Listing[]>([]);
  const [recent, setRecent] = useState<Listing[]>([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);
  const [testimonialIdx, setTestimonialIdx] = useState(0);

  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 500], [0, -120]);

  useEffect(() => {
    listingsApi.getFeatured(6)
      .then((d) => setFeatured(asListingArray(d)))
      .catch(() => {})
      .finally(() => setLoadingFeatured(false));

    listingsApi.getAvailable(1, 6)
      .then((d) => setRecent(asListingArray(d)))
      .catch(() => {});
  }, []);

  // Auto-cycle testimonials
  useEffect(() => {
    const t = setInterval(() => setTestimonialIdx((i) => (i + 1) % TESTIMONIALS.length), 5000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="overflow-x-hidden">
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center overflow-hidden gradient-hero">
        {/* Parallax background image */}
        <motion.div style={{ y: heroY }} className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1600&q=80')] bg-cover bg-center opacity-15" />
          <GradientBlobs />
        </motion.div>

        <div className="mx-auto max-w-7xl px-4 py-32 sm:px-6 lg:px-8 w-full">
          <div className="max-w-3xl">
            {/* Badge */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 rounded-full border border-brand-gold/30 bg-brand-gold/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-brand-gold mb-6">
                <IcoSparkle size={12} /> Kenya's #1 Real Estate Platform
              </span>
            </motion.div>

            {/* Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="font-display text-5xl font-bold text-white leading-tight sm:text-6xl lg:text-7xl"
            >
              Find Your
              <br />
              <span className="text-gradient-gold">Perfect Home</span>
              <br />
              in Kenya.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 text-lg text-brand-muted leading-relaxed max-w-xl"
            >
              Thousands of verified rental, sale, and short-stay listings across Kenya. Powered by AI, built for you.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="mt-8">
              <HeroSearch />
            </motion.div>
          </div>

          {/* Floating stats cards */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.6 }}
            className="mt-14 flex flex-wrap gap-4"
          >
            {[
              { value: 4200, suffix: "+", label: "Active Listings" },
              { value: 1200, suffix: "+", label: "Property Owners" },
              { value: 8500, suffix: "+", label: "Happy Tenants" },
            ].map((s) => (
              <div key={s.label} className="glass rounded-2xl px-5 py-3 flex items-center gap-3">
                <span className="font-display text-2xl font-bold text-brand-gold">
                  <AnimatedCounter value={s.value} suffix={s.suffix} />
                </span>
                <span className="text-sm text-brand-muted">{s.label}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ repeat: Infinity, duration: 1.8 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-white/30"
        >
          <div className="h-8 w-px bg-gradient-to-b from-transparent to-white/30" />
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
        </motion.div>
      </section>

      {/* ── Property type cards ──────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="Browse by Type" subtitle="Whatever you need, we have it." />
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {PROPERTY_TYPES.map((pt, i) => (
            <motion.button
              key={pt.label}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.04 }}
              onClick={() => navigate(`/explore?q=${encodeURIComponent(pt.query)}`)}
              className="card-dark flex flex-col items-center gap-3 py-6 px-4 text-center hover:border-brand-gold/30 transition"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                {pt.icon}
              </div>
              <span className="font-medium text-white text-sm">{pt.label}</span>
              <span className="text-xs text-brand-muted">{pt.count}</span>
            </motion.button>
          ))}
        </div>
      </section>

      {/* ── Featured listings ──────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between mb-8">
          <SectionHeading title="Featured Properties" subtitle="Hand-picked, premium listings across Kenya." />
          <Link to="/explore" className="hidden sm:flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-gold transition">
            View All <IcoArrowRight size={15} />
          </Link>
        </div>
        {loadingFeatured ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="card-dark overflow-hidden animate-pulse">
                <div className="h-48 bg-white/10" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/10 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FeaturedCarousel listings={featured.length ? featured : recent} />
        )}
      </section>

      {/* ── How it works ────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="How It Works" subtitle="From search to move-in in 4 simple steps." center />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_STEPS.map((s, i) => (
            <motion.div
              key={s.num}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-dark relative p-6 hover:border-brand-gold/25 transition"
            >
              <div className="absolute -top-3 left-5 font-display text-4xl font-bold text-white/5">{s.num}</div>
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5">
                {s.icon}
              </div>
              <h3 className="font-display text-lg font-semibold text-white mb-2">{s.title}</h3>
              <p className="text-sm text-brand-muted leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
        <div className="mt-8 flex justify-center">
          <Link to="/explore" className="btn-gold">
            Start Searching <IcoArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── AI section ────────────────────────────────────────────────── */}
      <AiSection />

      {/* ── Recent / Available listings ───────────────────────────────── */}
      {recent.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-8">
            <SectionHeading title="Latest Available" subtitle="Freshly listed properties — be the first to enquire." />
            <Link to="/explore" className="hidden sm:flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-gold transition">
              Explore All <IcoArrowRight size={15} />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recent.map((l, i) => <ListingCard key={l.id} listing={l} index={i} showSaveButton />)}
          </div>
        </section>
      )}

      {/* ── Testimonials ─────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading title="What Our Tenants Say" center />
        <div className="mt-10 relative overflow-hidden min-h-[200px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={testimonialIdx}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.4 }}
              className="glass-strong rounded-3xl p-8 text-center mx-auto max-w-2xl"
            >
              <div className="flex justify-center mb-4">
                {[...Array(TESTIMONIALS[testimonialIdx].rating)].map((_, i) => (
                  <IcoStar key={i} size={20} className="text-brand-gold" />
                ))}
              </div>
              <p className="text-lg text-white/90 leading-relaxed italic">"{TESTIMONIALS[testimonialIdx].text}"</p>
              <div className="mt-5 flex items-center justify-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-gold/20 font-bold text-brand-gold text-sm">
                  {TESTIMONIALS[testimonialIdx].name[0]}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-white">{TESTIMONIALS[testimonialIdx].name}</div>
                  <div className="text-xs text-brand-muted flex items-center gap-1">
                    <IcoLocation size={11} className="text-brand-teal" />{TESTIMONIALS[testimonialIdx].location}
                  </div>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
          {/* Dots */}
          <div className="mt-6 flex justify-center gap-2">
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => setTestimonialIdx(i)}
                className={`rounded-full transition-all ${i === testimonialIdx ? "h-2 w-6 bg-brand-gold" : "h-2 w-2 bg-white/20 hover:bg-white/40"}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 pb-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-3xl glass-strong p-10 text-center"
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-gold/20 blur-3xl" />
            <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-brand-teal/20 blur-3xl" />
          </div>
          <div className="relative z-10">
            <h2 className="font-display text-3xl font-bold text-white sm:text-4xl">Ready to Find Your Home?</h2>
            <p className="mt-3 text-brand-muted">Join thousands of Kenyans who found their perfect space on StayHere.</p>
            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link to="/signup" className="btn-gold text-base px-7">
                Create Account <IcoArrowRight size={17} />
              </Link>
              <Link to="/explore" className="btn-ghost text-base px-7">
                Browse Listings
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
