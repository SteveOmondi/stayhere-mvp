import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { formatKes } from "../lib/format";
import { useApp } from "../context/AppContext";
import { SectionHeading } from "../components/ui";
import { IcoArrowRight, IcoBell, IcoChat, IcoLocation } from "../components/icons";

export function CartPage() {
  const { enquiries, refreshEnquiries } = useApp();
  const navigate = useNavigate();

  // Pulls the latest list the moment this page opens - an owner may have replied, or Sage may
  // have been asked about enquiries, since this context last refreshed.
  useEffect(() => {
    void refreshEnquiries();
  }, [refreshEnquiries]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="mb-8 flex items-center justify-between">
          <SectionHeading
            title="My Enquiries"
            subtitle={enquiries.length ? `${enquiries.length} ${enquiries.length === 1 ? "property" : "properties"} in your enquiry list` : undefined}
          />
          <IcoBell size={28} className="text-brand-teallight" />
        </div>

        {enquiries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5">
              <IcoBell size={36} className="text-white/20" />
            </div>
            <h3 className="font-display text-xl font-semibold text-white">No enquiries yet</h3>
            <p className="mt-2 text-brand-muted">Enquire about listings you're interested in to start a chat with the owner.</p>
            <Link to="/explore" className="btn-gold mt-6">
              Browse Listings <IcoArrowRight size={17} />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {enquiries.map((e, i) => (
                <motion.div
                  key={e.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="card-dark flex flex-col gap-4 overflow-hidden p-4 sm:flex-row"
                >
                  {/* Image */}
                  <div
                    className="relative h-40 w-full shrink-0 overflow-hidden rounded-xl sm:h-32 sm:w-48 cursor-pointer"
                    onClick={() => navigate(`/listing/${e.listingId}`)}
                  >
                    {e.listingImageUrl ? (
                      <img src={e.listingImageUrl} alt={e.listingTitle ?? "Listing"} className="h-full w-full object-cover transition-transform duration-500 hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-white/5 text-white/20">
                        <IcoLocation size={28} />
                      </div>
                    )}
                    {e.unreadCount > 0 && (
                      <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-teal px-1.5 text-[10px] font-bold text-white">
                        {e.unreadCount}
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-lg font-semibold text-white cursor-pointer hover:text-brand-gold transition" onClick={() => navigate(`/listing/${e.listingId}`)}>
                        {e.listingTitle ?? "StayHere listing"}
                      </h3>
                    </div>
                    {e.listingLocation && (
                      <div className="flex items-center gap-1.5 text-sm text-brand-muted">
                        <IcoLocation size={14} className="text-brand-teal" />
                        {e.listingLocation}
                      </div>
                    )}
                    {e.lastMessagePreview && (
                      <p className="truncate text-sm text-white/60">{e.lastMessagePreview}</p>
                    )}
                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2">
                      <span className="text-xl font-bold text-gradient-gold">
                        {e.listingPrice != null ? formatKes(e.listingPrice) : null}
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/listing/${e.listingId}`)}
                          className="btn-ghost text-xs py-2 px-3"
                        >
                          View Details
                        </button>
                        <button
                          onClick={() => navigate(`/enquiries/${e.id}`)}
                          className="btn-teal text-xs py-2 px-3"
                        >
                          <IcoChat size={14} /> Start Chat
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
              <p className="text-sm text-brand-muted mb-4">Chat with each listing's owner right here on StayHere to schedule a viewing - no need to go anywhere else.</p>
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
