import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, ownersApi } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";

type OwnerRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  walletBalance?: number;
};

function mapOwner(o: unknown): OwnerRow | null {
  if (!o || typeof o !== "object") return null;
  const r = o as Record<string, unknown>;
  const id = r.id as string | undefined;
  if (!id) return null;
  return {
    id,
    fullName: String(r.fullName ?? ""),
    phone: String(r.phone ?? ""),
    email: String(r.email ?? ""),
    walletBalance: typeof r.walletBalance === "number" ? r.walletBalance : undefined,
  };
}

export function OwnersPage() {
  const { reloadKey, toast, bumpReload, setConfig } = usePortal();
  const [rows, setRows] = useState<OwnerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    userId: "",
  });

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      try {
        const data = await ownersApi.list(page, 15);
        const p = asPaginated<unknown>(data);
        if (c) return;
        if (p) {
          setRows(p.items.map(mapOwner).filter(Boolean) as OwnerRow[]);
          setTotal(p.totalCount);
        } else if (Array.isArray(data)) {
          setRows(data.map(mapOwner).filter(Boolean) as OwnerRow[]);
          setTotal(data.length);
        }
      } catch (e) {
        if (!c)
          toast(e instanceof ApiError ? e.message : "Failed to load owners", "error");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [page, reloadKey, toast]);

  async function createOwner(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body: Record<string, unknown> = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
      };
      if (form.userId.trim()) body.userId = form.userId.trim();
      const created = await ownersApi.create(body) as Record<string, unknown>;
      setModal(false);
      setForm({ fullName: "", phone: "", email: "", userId: "" });
      toast("Property owner created.", "success");
      if (created?.id) {
        setConfig({ defaultOwnerUserId: String(created.id) });
      }
      bumpReload();
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Create failed", "error");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="font-display text-2xl text-brand-950">Property owners</h2>
          <p className="text-sm text-brand-700 mt-1">
            Universal directory · {total} registered
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModal(true)}
          className="px-5 py-2.5 rounded-xl bg-brand-950 text-brand-goldlight text-sm font-semibold hover:bg-brand-800 transition"
        >
          + New property owner
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-brand-800/10">
        <table className="w-full text-sm text-left">
          <thead className="bg-brand-950 text-brand-cream/90 uppercase text-xs tracking-wider">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Wallet</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-800/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-600">
                  Loading…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-brand-600">
                  No owners yet. Create one to begin.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="hover:bg-brand-cream">
                  <td className="px-4 py-3 font-medium text-brand-950">{r.fullName}</td>
                  <td className="px-4 py-3 text-brand-800">{r.phone}</td>
                  <td className="px-4 py-3 text-brand-800">{r.email}</td>
                  <td className="px-4 py-3 text-brand-800">
                    {r.walletBalance != null ? `${r.walletBalance} KES` : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/owners/${r.id}`}
                      className="text-brand-gold font-semibold hover:underline"
                    >
                      Manage →
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {total > 15 && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-brand-700 py-1">Page {page}</span>
          <button
            type="button"
            disabled={page * 15 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1 rounded-lg border text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-brand-800/10">
            <h3 className="font-display text-xl text-brand-950 mb-4">New property owner</h3>
            <form onSubmit={createOwner} className="space-y-3">
              <label className="block text-xs font-semibold text-brand-800 uppercase">
                Full name
                <input
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-brand-800 uppercase">
                Phone
                <input
                  required
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-brand-800 uppercase">
                Email
                <input
                  required
                  type="email"
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </label>
              <label className="block text-xs font-semibold text-brand-800 uppercase">
                Auth user id (optional)
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Link to StayHere user GUID"
                  value={form.userId}
                  onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                />
              </label>
              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setModal(false)}
                  className="flex-1 py-2 rounded-xl border text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-brand-950 text-brand-goldlight text-sm font-semibold"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
