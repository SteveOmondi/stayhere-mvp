import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listingsApi } from "../lib/api";
import { IcoLoader } from "../components/icons";

/** Resolves a short share link (/l/:code, e.g. /l/L1002) to its listing and redirects - listingCode
 * is already unique per listing, so no separate short-link table/backend is needed. */
export function ShortLinkRedirectPage() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) { navigate("/", { replace: true }); return; }
    listingsApi.getByCode(code)
      .then((l) => navigate(`/listing/${l.id}`, { replace: true }))
      .catch(() => navigate("/explore", { replace: true }));
  }, [code]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <IcoLoader size={28} className="text-brand-gold animate-spin" />
    </div>
  );
}
