import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { listingsApi, type Listing } from "../lib/api";
import { formatKes, listingLocation, listingPrice, listingTitle, isRent, primaryImage } from "../lib/format";
import { useApp } from "../context/AppContext";
import { SkeletonGrid, SectionHeading } from "../components/ui";
import { IcoArrowRight, IcoBath, IcoBed, IcoBell, IcoCheck, IcoLocation, IcoX } from "../components/icons";

export function CartPage() {
  const { cart, removeFromCart, toast } = useApp();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!cart.length) { setListings([]); return; }
    setLoading(true);
    Promise.all(cart.map((id) => listingsApi.getById(id).catch(() => null)))
      .then((res) => setListings(res.filter(Boolean) as Listing[]))
      .catch(() => toast("Failed to load enquiries", "error"))
      .finally(() => setLoading(false));
  }, [cart]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8 flex items-center justify-between">
          <SectionHeading
            title="My Enquiries"
            subtitle={cart.length ? `${cart.length} ${cart.length === 1 ? "property" : "properties"} in your enquiry list` : undefined}
          />
          <IcoBell size={28} className="text-brand-teallight" />
        </div>

        {loading ? (
          <SkeletonGrid count={2} />
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <IcoBell size={36} className="text-white/20" />
            </div>
            <h3 className="font-display text-xl font-semibold text-white">No enquiries yet</h3>
            <p className="mt-2 text-brand-muted">Add listings you're interested in to enquire about them.</p>
            <Link to="/explore" className="btn-gold mt-6">
              Browse Listings <IcoArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {listings.map((l, i) => (
                <motion.div
                  key={l.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-dark flex flex-col gap-4 overflow-hidden p-4 sm:flex-row"
                >
                  {/* Image */}
                  <div className="h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-48 cursor-pointer" onClick={() => navigate(`/listing/${l.id}`)}>
                    <img src={primaryImage(l)} alt={listingTitle(l)} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-white cursor-pointer hover:text-brand-gold transition" onClick={() => navigate(`/listing/${l.id}`)}>
                        {listingTitle(l)}
                      </h3>
                      <button
                        onClick={() => { removeFromCart(l.id); setListings((ls) => ls.filter((x) => x.id !== l.id)); }}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white/40 hover:bg-red-500/15 hover:text-red-400 transition"
                      >
                        <IcoX size={15} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-brand-muted">
                      <IcoLocation size={14} className="text-brand-teal" />
                      {listingLocation(l)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span className="flex items-center gap-1"><IcoBed size={14} className="text-brand-muted" /> {l.bedrooms ?? 0} BR</span>
                      <span className="flex items-center gap-1"><IcoBath size={14} className="text-brand-muted" /> {l.bathrooms ?? 0} BA</span>
                    </div>
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="text-xl font-bold text-gradient-gold">
                        {formatKes(listingPrice(l))}{isRent(l) ? <span className="text-sm text-brand-muted">/mo</span> : null}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/listing/${l.id}`)}
                          className="btn-ghost text-xs py-2 px-3"
                        >
                          View Details
                        </button>
                        <button className="btn-teal text-xs py-2 px-3">
                          <IcoCheck size={14} /> Contact Agent
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Summary */}
            <div className="card-dark p-5 mt-6">
              <h4 className="font-display text-lg text-white mb-1">Next Steps</h4>
              <p className="text-sm text-brand-muted mb-4">Contact agents for the properties you're interested in to schedule viewings.</p>
              <div className="flex flex-wrap gap-3">
                <Link to="/contact" className="btn-gold text-sm">
                  <IcoArrowRight size={16} /> Contact Support
                </Link>
                <Link to="/explore" className="btn-ghost text-sm">
                  Browse More
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
