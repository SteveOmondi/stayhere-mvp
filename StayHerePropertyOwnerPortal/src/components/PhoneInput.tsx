import { useEffect, useRef, useState } from "react";
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
 * code if the user types/pastes a full number, and caps to that country's expected digit count. */
export function normalizePhoneDigits(raw: string, country: CountryCode): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith(country.dial.replace("+", ""))) digits = digits.slice(country.dial.length - 1);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, country.digits);
}

/** Splits a full phone value (e.g. "+254712345678") into its country + local digits, defaulting
 * to Kenya when no dial code is recognised. */
export function splitPhone(value: string): { country: CountryCode; digits: string } {
  const trimmed = (value ?? "").trim();
  const byLength = [...COUNTRY_CODES].sort((a, b) => b.dial.length - a.dial.length);
  for (const c of byLength) {
    if (trimmed.startsWith(c.dial)) return { country: c, digits: normalizePhoneDigits(trimmed.slice(c.dial.length), c) };
  }
  const fallback = COUNTRY_CODES[0];
  return { country: fallback, digits: normalizePhoneDigits(trimmed, fallback) };
}

/** True once the local digit count matches the selected country's expected length. */
export function isPhoneComplete(value: string): boolean {
  const { country, digits } = splitPhone(value);
  return digits.length === country.digits;
}

type Props = {
  /** Full value, e.g. "+254712345678". Always composed with a leading dial code. */
  value: string;
  onChange: (fullPhone: string) => void;
  placeholder?: string;
  required?: boolean;
};

/** Standardized phone input: a country code dropdown (flag + dial code) on the left, digits-only
 * entry on the right, always composing to a single "+<dial><digits>" string. */
export function PhoneInput({ value, onChange, placeholder, required }: Props) {
  const [country, setCountry] = useState<CountryCode>(() => splitPhone(value).country);
  const [digits, setDigits] = useState<string>(() => splitPhone(value).digits);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

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
          className="flex h-full items-center gap-1.5 rounded-l-xl border border-r-0 border-black/10 bg-brand-50 px-3 text-sm text-brand-900 transition hover:bg-brand-100"
        >
          <span className="text-base leading-none">{country.flag}</span>
          <span className="font-medium tabular-nums">{country.dial}</span>
          <IcoChevDown size={13} className={`text-brand-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-20 mt-1 max-h-64 w-60 overflow-y-auto rounded-xl border border-black/10 bg-white p-1.5 shadow-lg">
            {COUNTRY_CODES.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => selectCountry(c)}
                className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                  c.code === country.code ? "bg-brand-50 text-brand-900" : "text-brand-600 hover:bg-brand-50"
                }`}
              >
                <span className="text-base leading-none">{c.flag}</span>
                <span className="flex-1">{c.name}</span>
                <span className="tabular-nums text-xs opacity-70">{c.dial}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <input
        type="tel"
        inputMode="numeric"
        required={required}
        value={digits}
        onChange={(e) => handleDigitsChange(e.target.value)}
        placeholder={placeholder ?? "7".padEnd(country.digits, "0")}
        className="input rounded-l-none border-l-0 flex-1"
      />
    </div>
  );
}
