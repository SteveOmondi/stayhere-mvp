import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, customersApi } from "../lib/api";
import { usePortal } from "../context/PortalContext";

export function CustomersPage() {
  const { toast, reloadKey } = usePortal();
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await customersApi.list();
        if (!c) setRows(Array.isArray(data) ? (data as Record<string, unknown>[]) : []);
      } catch (e) {
        if (!c) toast(e instanceof ApiError ? e.message : "Failed to load customers", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [reloadKey, toast]);

  return (
    <div>
      <h2 className="font-display text-2xl text-brand-950 mb-2">Customers</h2>
      <p className="text-sm text-brand-700 mb-6">
        Universal renter directory from CustomerService.
      </p>
      <div
        className="h-28 rounded-xl mb-6 bg-cover bg-center"
        style={{
          backgroundImage:
            "url(https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80)",
        }}
      />
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-brand-950 text-brand-cream/90 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Email</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-brand-600">
                  Loading…
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={String(r.id)}>
                  <td className="px-3 py-2">{String(r.email)}</td>
                  <td className="px-3 py-2">
                    {String(r.firstName ?? "")} {String(r.lastName ?? "")}
                  </td>
                  <td className="px-3 py-2">{String(r.accountStatus ?? "")}</td>
                  <td className="px-3 py-2 text-right">
                    <Link to={`/customers/${String(r.id)}`} className="text-brand-gold font-semibold text-xs">
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
