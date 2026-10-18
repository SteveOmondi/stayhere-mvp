import { useMemo, useState } from "react";
import { IcoChevLeft, IcoChevRight } from "./icons";
import type { BlockedDateRange } from "../lib/api";

type Props = {
  checkIn: string | null;
  checkOut: string | null;
  blockedRanges: BlockedDateRange[];
  onChange: (next: { checkIn: string | null; checkOut: string | null }) => void;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Expands each [checkInDate, checkOutDate) range into the individual ISO dates it occupies -
 * the checkout day itself is NOT occupied (a new guest can check in the same day a previous one
 * checks out), matching standard hotel/short-let semantics. */
function expandBlockedDates(ranges: BlockedDateRange[]): Set<string> {
  const set = new Set<string>();
  for (const r of ranges) {
    let cursor = startOfDay(new Date(r.checkInDate));
    const end = startOfDay(new Date(r.checkOutDate));
    while (cursor < end) {
      set.add(toIso(cursor));
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
  }
  return set;
}

/** Hand-rolled single-month calendar for picking a check-in/check-out range - no new dependency,
 * styled to match the app's existing dark glass theme. Interaction: first click sets check-in and
 * clears check-out; a second click after check-in (with no blocked day in between) sets check-out;
 * clicking at or before the current check-in (or through a blocked day) starts a fresh range. */
export function AvailabilityCalendar({ checkIn, checkOut, blockedRanges, onChange }: Props) {
  const today = useMemo(() => startOfDay(new Date()), []);
  const [viewMonth, setViewMonth] = useState(() => {
    const base = checkIn ? new Date(checkIn) : today;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });
  const blocked = useMemo(() => expandBlockedDates(blockedRanges), [blockedRanges]);

  function isDisabled(d: Date): boolean {
    return d < today || blocked.has(toIso(d));
  }

  function hasBlockedBetween(from: Date, to: Date): boolean {
    let cursor = new Date(from.getTime() + DAY_MS);
    while (cursor < to) {
      if (blocked.has(toIso(cursor))) return true;
      cursor = new Date(cursor.getTime() + DAY_MS);
    }
    return false;
  }

  function handleClick(d: Date) {
    if (isDisabled(d)) return;
    const iso = toIso(d);

    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }

    const inDate = startOfDay(new Date(checkIn));
    if (d <= inDate || hasBlockedBetween(inDate, d)) {
      onChange({ checkIn: iso, checkOut: null });
      return;
    }
    onChange({ checkIn, checkOut: iso });
  }

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = firstOfMonth.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];

  const canGoBack = new Date(year, month, 1) > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="glass rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => canGoBack && setViewMonth(new Date(year, month - 1, 1))}
          disabled={!canGoBack}
          className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition disabled:opacity-20 disabled:cursor-not-allowed"
        >
          <IcoChevLeft size={16} />
        </button>
        <span className="font-display text-sm font-semibold text-white">
          {viewMonth.toLocaleDateString("en-KE", { month: "long", year: "numeric" })}
        </span>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-white/10 transition"
        >
          <IcoChevRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-brand-muted mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <div key={i}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toIso(d);
          const disabled = isDisabled(d);
          const isCheckIn = iso === checkIn;
          const isCheckOut = iso === checkOut;
          const inRange = checkIn && checkOut && iso > checkIn && iso < checkOut;

          return (
            <button
              key={i}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(d)}
              className={`h-9 rounded-lg text-xs font-medium transition ${
                disabled
                  ? "text-white/15 line-through cursor-not-allowed"
                  : isCheckIn || isCheckOut
                  ? "bg-brand-gold text-brand-dark font-bold"
                  : inRange
                  ? "bg-brand-gold/20 text-brand-gold"
                  : "text-white/80 hover:bg-white/10"
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-4 mt-3 text-[11px] text-brand-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-brand-gold" /> Selected</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-white/15" /> Unavailable</span>
      </div>
    </div>
  );
}
