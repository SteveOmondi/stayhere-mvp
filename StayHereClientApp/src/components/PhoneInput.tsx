import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IcoChevDown } from "./icons";

export type CountryCode = { code: string; dial: string; flag: string; name: string; digits: number };

/** East Africa first (StayHere's home market), then a handful of common diaspora destinations. */
export const COUNTRY_CODES: CountryCode[] = [
  { code: "KE", dial: "+254", flag: "🇰🇪", name: "Kenya", digits: 9 },
  { code: "UG", dial: "+256", flag: "🇺🇬", name: "Uganda", digits: 9 },
  { code: "TZ", dial: "+255", flag: "🇹🇿", name: "Tanzania", digits: 9 },
  { code: "RW", dial: "+250", flag: "🇷🇼", name: "Rwanda", digits: 9 },
  { code: "NG", dial: "+234", flag: "🇳🇬", name: "Nigeria", digits: 10 },
  { code: "GH", dial: "+233", flag: "🇬🇭", name: "Ghana", digits: 9 },
  { code: "ZA", dial: "+27", flag: "🇿🇦", name: "South Africa", digits: 9 },
  { code: "GB", dial: "+44", flag: "🇬🇧", name: "United Kingdom", digits: 10 },
  { code: "US", dial: "+1", flag: "🇺🇸", name: "United States", digits: 10 },
];

/** Strips everything but digits, then strips a redundant leading 0 or the country's own dial
 * code if the user types/pastes a full number, and caps to that country's expected digit count -
 * e.g. typing "0712345678" or "254712345678" for Kenya both collapse to "712345678". */
export function normalizePhoneDigits(raw: string, country: CountryCode): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith(country.dial.replace("+", ""))) digits = digits.slice(country.dial.length - 1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, country.digits);
}

/** Splits a full phone value (e.g. "+254712345678") into its country + local digits, defaulting
 * to Kenya when no dial code is recognised (including a bare "0712345678"/"712345678"). Longer
 * dial codes are matched first so e.g. "+255..." (Tanzania) isn't mistaken for a shorter prefix. */
export function splitPhone(value: string): { country: CountryCode; digits: string } {
  const trimmed = (value ?? "").trim();
  const byLength = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of byLength) {
    if (trimmed.startsWith(c.dial)) return { country: c, digits: normalizePhoneDigits(trimmed.slice(c.dial.length), c) };
  }
  const fallback = COUNTRY_CODES[0];
  return { country: fallback, digits: normalizePhoneDigits(trimmed, fallback) };
}

/** True once the local digit count matches the selected country's expected length - use this for
 * form validation instead of a generic "non-empty" check. */
export function isPhoneComplete(value: string): boolean {
  const { country, digits } = splitPhone(value);
  return digits.length === country.digits;
}

type Props = {
  /** Full value, e.g. "+254712345678" (or "" when empty). Always composed with a leading dial
   * code - this is the one shape every phone field in the app should store and send. */
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/** Standardized phone input used everywhere a customer/user types a mobile number: a country
 * code dropdown (flag + dial code) on the left, digits-only entry on the right. Always composes
 * to a single "+<dial><digits>" string via onChange, so every caller stores and sends phone
 * numbers in exactly the same country-code-first shape - originally built inline in LoginPage,
 * extracted here so every other phone field in the app shares the exact same behavior instead of
 * each reinventing (or skipping) digit normalization. */
export function PhoneInput({ value, onChange, placeholder, autoFocus }: Props) {
  const [country, setCountry] = useState<CountryCode>(() => splitPhone(value).country);
  const [digits, setDigits] = useState<string>(() => splitPhone(value).digits);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Re-sync from an externally-set value (e.g. prefilled from the signed-in user's profile once
  // it loads asynchronously) without fighting the user's own typing - only when it actually
  // differs from what this component would itself compose right now.
  useEffect(() => {
    const composed = `${country.dial}${digits}`;
    if (value && value !== composed) {
      const parsed = splitPhone(value);
      setCountry(parsed.country);
      setDigits(parsed.digits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function selectCountry(c: CountryCode) {
    setCountry(c);
    const next = normalizePhoneDigits(digits, c);
    setDigits(next);
    // Empty digits compose to "" (not a bare dial code) - several fields using this component are
    // optional, and `phoneNumber.trim() || undefined` style checks need an actually-empty string.
    onChange(next ? `${c.dial}${next}` : "");
    setOpen(false);
  }

  function handleDigitsChange(raw: string) {
    const next = normalizePhoneDigits(raw, country);
    setDigits(next);
    onChange(next ? `${country.dial}${next}` : "");
  }

  return (
    <div className="flex">
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-full items-center gap-1.5 rounded-l-xl border border-r-0 border-white/10 bg-white/5 px-3 text-sm text-white transition hover:bg-white/10"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium tabular-nums">{country.dial}</span>
          <IcoChevDown size={13} className={`text-brand-muted transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
              className="glass-strong absolute left-0 top-full z-20 mt-2 max-h-64 w-64 overflow-y-auto rounded-xl border border-white/10 p-1.5 shadow-elevated"
            >
              {COUNTRY_CODES.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => selectCountry(c)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                    c.code === country.code ? "bg-white/10 text-white" : "text-brand-muted hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <span className="text-base leading-none">{c.flag}</span>
                  <span className="flex-1">{c.name}</span>
                  <span className="tabular-nums text-xs opacity-70">{c.dial}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <input
        type="tel"
        inputMode="numeric"
        autoFocus={autoFocus}
        value={digits}
        onChange={(e) => handleDigitsChange(e.target.value)}
        placeholder={placeholder ?? "7".padEnd(country.digits, "0")}
        className="input-dark rounded-l-none border-l-0 flex-1"
      />
    </div>
  );
}
