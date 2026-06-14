import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { listingsApi, asListingArray, type SearchBody, type Listing } from "../lib/api";
import { listingLocation as getListingLocation } from "../lib/format";
import { useApp } from "../context/AppContext";
import { ListingCard } from "../components/ListingCard";
import { SkeletonGrid } from "../components/ui";
import {
  IcoFilter, IcoGrid, IcoList, IcoLoader, IcoSearch, IcoX,
  IcoBed, IcoLocation,
} from "../components/icons";

const PROPERTY_TYPES = ["Apartment", "House", "Villa", "Studio", "Townhouse", "Penthouse", "Office", "Commercial"];
const LISTING_TYPES = ["Rent", "Sale", "AirBnB"];
const CITIES = ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Thika"];

function FiltersPanel({
  filters, onChange, onReset,
}: {
  filters: SearchBody;
  onChange: (k: keyof SearchBody, v: unknown) => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Listing type */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-muted">Listing Type</label>
        <div className="flex flex-wrap gap-2">
          {LISTING_TYPES.map((t) => (
            <button
              key={t}
              onClick={() => onChange("listingType", filters.listingType === t ? undefined : t)}
              className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${filters.listingType === t ? "border-brand-gold bg-brand-gold/15 text-brand-gold" : "border-white/10 text-brand-muted hover:border-brand-gold/40 hover:text-white"}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* City */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-muted">City</label>
        <select
          value={(filters.city as string) ?? ""}
          onChange={(e) => onChange("city", e.target.value || undefined)}
          className="input-dark text-sm"
        >
          <option value="">Any City</option>
          {CITIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Property type */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-muted">Property Type</label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPES.map((t) => {
            const types = (filters.propertyTypes as string[] | undefined) ?? [];
            const sel = types.includes(t);
            return (
              <button
                key={t}
                onClick={() => onChange("propertyTypes", sel ? types.filter((x) => x !== t) : [...types, t])}
                className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${sel ? "border-brand-teal bg-brand-teal/15 text-brand-teallight" : "border-white/10 text-brand-muted hover:border-brand-teal/40 hover:text-white"}`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bedrooms */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-muted">Min Bedrooms</label>
        <div className="flex gap-2">
          {[0, 1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => onChange("bedrooms", filters.bedrooms === n ? undefined : n)}
              className={`flex h-9 w-9 items-center justify-center rounded-xl border text-sm font-medium transition ${filters.bedrooms === n ? "border-brand-gold bg-brand-gold/15 text-brand-gold" : "border-white/10 text-brand-muted hover:border-brand-gold/40 hover:text-white"}`}
            >
              {n === 0 ? "Any" : n === 5 ? "5+" : n}
            </button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-widest text-brand-muted">Price Range (KES)</label>
        <div className="grid grid-cols-2 gap-3">
          <input
            type="number"
            placeholder="Min"
            value={(filters.minPrice as number | undefined) ?? ""}
            onChange={(e) => onChange("minPrice", e.target.value ? Number(e.target.value) : undefined)}
            className="input-dark text-sm"
          />
          <input
            type="number"
            placeholder="Max"
            value={(filters.maxPrice as number | undefined) ?? ""}
            onChange={(e) => onChange("maxPrice", e.target.value ? Number(e.target.value) : undefined)}
            className="input-dark text-sm"
          />
        </div>
      </div>

      <button onClick={onReset} className="btn-ghost w-full justify-center text-sm">
        <IcoX size={14} /> Clear Filters
      </button>
    </div>
  );
}

const EMPTY_FILTERS: SearchBody = {
  listingType: undefined,
  city: undefined,
  propertyTypes: undefined,
  bedrooms: undefined,
  minPrice: undefined,
  maxPrice: undefined,
  location: undefined,
};

export function ExplorePage() {
  const { toast } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [filters, setFilters] = useState<SearchBody>(EMPTY_FILTERS);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showFilters, setShowFilters] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const activeFilterCount = Object.values(filters).filter((v) =>
    Array.isArray(v) ? v.length > 0 : v !== undefined && v !== ""
  ).length + (query.trim() ? 1 : 0);

  const fetchListings = useCallback(async (pg: number, append = false) => {
    const isSearch = query.trim() || Object.values(filters).some((v) => v !== undefined && (!Array.isArray(v) || v.length));
    try {
      let data: unknown;
      if (isSearch) {
        const body: SearchBody = {
          ...filters,
          ...(query.trim() ? { location: query.trim() } : {}),
          page: pg,
          pageSize: 12,
        };
        data = await listingsApi.search(body);
      } else {
        data = await listingsApi.getAvailable(pg, 12);
      }
      const items = asListingArray(data);
      const tot = (data as Record<string, unknown>)?.totalCount;
      if (typeof tot === "number") setTotal(tot);
      setHasMore(items.length === 12);
      setListings((prev) => append ? [...prev, ...items] : items);
    } catch {
      toast("Failed to load listings", "error");
    }
  }, [query, filters]);

  // Initial + filter change
  useEffect(() => {
    setPage(1);
    setListings([]);
    setHasMore(true);
    setLoading(true);
    fetchListings(1, false).finally(() => setLoading(false));
  }, [fetchListings]);

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loadingMore && hasMore) {
        const next = page + 1;
        setPage(next);
        setLoadingMore(true);
        fetchListings(next, true).finally(() => setLoadingMore(false));
      }
    }, { rootMargin: "200px" });
    observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, loadingMore, page, fetchListings]);

  function updateFilter(k: keyof SearchBody, v: unknown) {
    setFilters((f) => ({ ...f, [k]: v }));
  }

  function resetFilters() {
    setFilters(EMPTY_FILTERS);
    setQuery("");
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchParams(query ? { q: query } : {});
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Search bar */}
      <div className="sticky top-16 z-30 border-b border-white/5 bg-brand-dark/90 backdrop-blur-lg px-4 py-3">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <form onSubmit={handleSearch} className="relative flex-1">
            <IcoSearch size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by location, city, or keyword…"
              className="input-dark pl-9 pr-4 text-sm w-full"
            />
          </form>

          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition ${showFilters ? "border-brand-gold bg-brand-gold/15 text-brand-gold" : "border-white/10 text-brand-muted hover:text-white"}`}
          >
            <IcoFilter size={16} />
            <span className="hidden sm:block">Filters</span>
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-brand-gold text-[10px] font-bold text-brand-dark">{activeFilterCount}</span>
            )}
          </button>

          <div className="hidden sm:flex gap-1 rounded-xl bg-white/5 p-1">
            <button onClick={() => setViewMode("grid")} className={`rounded-lg p-1.5 transition ${viewMode === "grid" ? "bg-brand-gold/20 text-brand-gold" : "text-brand-muted hover:text-white"}`}><IcoGrid size={16} /></button>
            <button onClick={() => setViewMode("list")} className={`rounded-lg p-1.5 transition ${viewMode === "list" ? "bg-brand-gold/20 text-brand-gold" : "text-brand-muted hover:text-white"}`}><IcoList size={16} /></button>
          </div>
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="mx-auto max-w-7xl pt-4 pb-2">
                <div className="glass rounded-2xl p-5">
                  <FiltersPanel filters={filters} onChange={updateFilter} onReset={resetFilters} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Result meta */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-2xl font-bold text-white">
              {query ? `Results for "${query}"` : "Explore Listings"}
            </h1>
            {total !== null && !loading && (
              <p className="mt-0.5 text-sm text-brand-muted">{total.toLocaleString()} properties found</p>
            )}
          </div>
          {activeFilterCount > 0 && (
            <button onClick={resetFilters} className="flex items-center gap-1.5 text-sm text-brand-muted hover:text-white transition">
              <IcoX size={14} /> Clear all
            </button>
          )}
        </div>

        {loading ? (
          <SkeletonGrid count={12} />
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <IcoLocation size={36} className="text-white/20" />
            </div>
            <h3 className="font-display text-xl font-semibold text-white">No listings found</h3>
            <p className="mt-2 text-brand-muted">Try adjusting your search or filters.</p>
            <button onClick={resetFilters} className="btn-ghost mt-5">Clear Filters</button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} showSaveButton />
            ))}
          </div>
        ) : (
          /* List view */
          <div className="space-y-4">
            {listings.map((l, i) => (
              <motion.div
                key={l.id}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(i, 5) * 0.04 }}
                className="card-dark flex gap-4 p-4 overflow-hidden"
              >
                <div className="h-28 w-40 shrink-0 overflow-hidden rounded-xl">
                  <img
                    src={l.primaryImageUrl || (l.images?.[0]) || ""}
                    alt={l.title ?? "Listing"}
                    className="h-full w-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400&q=80"; }}
                  />
                </div>
                <div className="flex flex-1 flex-col justify-between min-w-0">
                  <div>
                    <h3 className="font-display text-lg font-semibold text-white truncate">{l.title ?? "Property Listing"}</h3>
                    <div className="flex items-center gap-1.5 text-sm text-brand-muted mt-0.5">
                      <IcoLocation size={13} className="text-brand-teal shrink-0" />
                      {getListingLocation(l)}
                    </div>
                    <div className="flex gap-3 text-sm text-white/60 mt-2">
                      {l.bedrooms != null && <span className="flex items-center gap-1"><IcoBed size={13} /> {l.bedrooms} BR</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="font-bold text-gradient-gold">
                      KES {Number(l.rentPrice ?? l.price ?? 0).toLocaleString()}
                      {l.listingType?.toLowerCase().includes("rent") && <span className="text-xs text-brand-muted">/mo</span>}
                    </span>
                    <a href={`/listing/${l.id}`} className="btn-ghost text-xs py-1.5 px-3">View Details</a>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Infinite scroll sentinel */}
        <div ref={sentinelRef} className="h-1" />
        {loadingMore && (
          <div className="flex justify-center py-8">
            <IcoLoader size={24} className="text-brand-gold animate-spin" />
          </div>
        )}
      </div>
    </div>
  );
}
