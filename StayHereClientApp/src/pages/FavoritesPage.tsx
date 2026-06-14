import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { listingsApi, type Listing } from "../lib/api";
import { useApp } from "../context/AppContext";
import { ListingCard } from "../components/ListingCard";
import { SkeletonGrid, SectionHeading } from "../components/ui";
import { IcoArrowRight, IcoHeartFilled } from "../components/icons";

export function FavoritesPage() {
  const { favorites, toast } = useApp();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!favorites.length) { setListings([]); return; }
    setLoading(true);
    Promise.all(favorites.map((id) => listingsApi.getById(id).catch(() => null)))
      .then((results) => setListings(results.filter(Boolean) as Listing[]))
      .catch(() => toast("Failed to load saved listings", "error"))
      .finally(() => setLoading(false));
  }, [favorites]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8 flex items-center justify-between">
          <SectionHeading
            title="Saved Properties"
            subtitle={`${listings.length} ${listings.length === 1 ? "property" : "properties"} saved`}
          />
          <IcoHeartFilled size={28} className="text-brand-gold" />
        </div>

        {loading ? (
          <SkeletonGrid count={3} />
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <IcoHeartFilled size={36} className="text-white/20" />
            </div>
            <h3 className="font-display text-xl font-semibold text-white">No saved properties yet</h3>
            <p className="mt-2 text-brand-muted">Tap the heart icon on any listing to save it here.</p>
            <Link to="/explore" className="btn-gold mt-6">
              Explore Listings <IcoArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((l, i) => (
              <ListingCard key={l.id} listing={l} index={i} showSaveButton />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
