import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ApiError, customersApi } from "../lib/api";
import { usePortal } from "../context/PortalContext";

export function CustomerDetailPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const { toast } = usePortal();
  const [c, setC] = useState<Record<string, unknown> | null>(null);
  const [docs, setDocs] = useState<unknown[]>([]);

  useEffect(() => {
    if (!customerId) return;
    let x = false;
    (async () => {
      try {
        const [cust, d] = await Promise.all([
          customersApi.get(customerId),
          customersApi.documents(customerId),
        ]);
        if (x) return;
        setC(cust as Record<string, unknown>);
        setDocs(Array.isArray(d) ? d : []);
      } catch (e) {
        if (!x) toast(e instanceof ApiError ? e.message : "Load failed", "error");
      }
    })();
    return () => {
      x = true;
    };
  }, [customerId, toast]);

  if (!customerId) return null;

  return (
    <div>
      <Link to="/customers" className="text-xs text-brand-gold font-semibold hover:underline">
        ← Customers
      </Link>
      <h2 className="font-display text-2xl text-brand-950 mt-2 mb-6">Customer detail</h2>
      {c && (
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="border rounded-xl p-4 bg-white/70">
            <h3 className="font-semibold text-sm mb-2">Profile</h3>
            <dl className="text-sm space-y-1">
              <dt className="text-brand-600">Email</dt>
              <dd>{String(c.email)}</dd>
              <dt className="text-brand-600">Phone</dt>
              <dd>{String(c.phone ?? "—")}</dd>
              <dt className="text-brand-600">KYC</dt>
              <dd>{String(c.kycStatus ?? "—")}</dd>
            </dl>
          </div>
          <div className="border rounded-xl p-4 bg-white/70">
            <h3 className="font-semibold text-sm mb-2">Documents</h3>
            <ul className="text-sm space-y-1">
              {docs.length === 0 && <li className="text-brand-600">None</li>}
              {docs.map((d, i) => {
                const o = d as Record<string, unknown>;
                return (
                  <li key={String(o.id ?? i)}>
                    {String(o.documentType)} —{" "}
                    <a href={String(o.fileUrl)} className="text-brand-gold underline text-xs" target="_blank" rel="noreferrer">
                      file
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
