import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { customersApi, ownersApi, propertiesApi } from "../lib/api";
import { asPaginated } from "../lib/paginated";
import { usePortal } from "../context/PortalContext";
import { ApiError } from "../lib/api";

export function DashboardPage() {
  const { reloadKey, toast } = usePortal();
  const [stats, setStats] = useState({
    owners: "—",
    properties: "—",
    customers: "—",
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setStats((s) => ({ ...s, loading: true }));
      try {
        const [o, p, c] = await Promise.all([
          ownersApi.list(1, 1),
          propertiesApi.list(1, 1),
          customersApi.list(),
        ]);
        const op = asPaginated<unknown>(o);
        const pp = asPaginated<unknown>(p);
        if (cancelled) return;
        setStats({
          owners: op ? String(op.totalCount) : Array.isArray(o) ? String(o.length) : "?",
          properties: pp ? String(pp.totalCount) : "?",
          customers: Array.isArray(c) ? String(c.length) : "?",
          loading: false,
        });
      } catch (e) {
        if (!cancelled) {
          setStats((s) => ({ ...s, loading: false }));
          toast(
            e instanceof ApiError ? e.message : "Failed to load dashboard metrics",
            "error"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reloadKey, toast]);

  const cards = [
    {
      label: "Property owners",
      value: stats.owners,
      to: "/owners",
      img: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80",
    },
    {
      label: "Properties",
      value: stats.properties,
      to: "/properties",
      img: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=600&q=80",
    },
    {
      label: "Customers",
      value: stats.customers,
      to: "/customers",
      img: "https://images.unsplash.com/photo-1523217582562-09d0def993a6?auto=format&fit=crop&w=600&q=80",
    },
  ];

  return (
    <div>
      <h2 className="font-display text-2xl text-brand-950 mb-2">Operations overview</h2>
      <p className="text-brand-700 text-sm mb-8 max-w-3xl">
        Live counts from your APIs (owners &amp; properties use paginated totals;
        customers list loads in full for the MVP). Use the sidebar for deep
        management workflows.
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        {cards.map((c) => (
          <Link
            key={c.to}
            to={c.to}
            className="group relative overflow-hidden rounded-2xl border border-brand-800/10 shadow-md hover:shadow-xl transition"
          >
            <img
              src={c.img}
              alt=""
              className="h-36 w-full object-cover group-hover:scale-105 transition duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-950/90 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
              <div className="text-3xl font-display text-brand-goldlight">
                {stats.loading ? "…" : c.value}
              </div>
              <div className="text-sm font-semibold tracking-wide uppercase text-white/90">
                {c.label}
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 grid md:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-brand-800/10 bg-brand-cream/80 p-6">
          <h3 className="font-semibold text-brand-950 mb-2">Quick actions</h3>
          <ul className="text-sm text-brand-800 space-y-2">
            <li>
              <Link className="text-brand-gold hover:underline font-medium" to="/owners">
                Register a new property owner
              </Link>
            </li>
            <li>
              <Link className="text-brand-gold hover:underline font-medium" to="/properties/new">
                Register a new property (building)
              </Link>
            </li>
            <li>
              <Link className="text-brand-gold hover:underline font-medium" to="/agents-caretakers">
                Add agents / caretakers &amp; link to listings
              </Link>
            </li>
            <li>
              <Link className="text-brand-gold hover:underline font-medium" to="/listings">
                Search &amp; manage listings
              </Link>
            </li>
          </ul>
        </div>
        <div
          className="rounded-2xl border border-brand-800/10 p-6 text-white bg-cover bg-center relative overflow-hidden"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80)",
          }}
        >
          <div className="absolute inset-0 bg-brand-950/75" />
          <div className="relative z-10">
            <h3 className="font-display text-xl text-brand-goldlight mb-2">
              Nairobi-grade inventory
            </h3>
            <p className="text-sm text-white/85 leading-relaxed">
              This portal is tuned for StayHere Function Apps: property owners on
              port <strong>7103</strong>, inventory on <strong>7101</strong>,
              renters on <strong>7102</strong>. Confirm every host is running
              before operations.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
