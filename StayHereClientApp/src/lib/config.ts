/* ── localStorage keys (prefixed sh_client_) ─────────────────────── */
const LS = {
  authApi:     "sh_client_auth_api",
  propertyApi: "sh_client_property_api",
  customerApi: "sh_client_customer_api",
  staticApi:   "sh_client_static_api",
  aiApi:       "sh_client_ai_api",
  authToken:   "sh_client_auth_token",
  profile:     "sh_client_customer_profile",
  favorites:   "sh_client_favorites",
  cart:        "sh_client_cart",
} as const;

const DEV_PROXY = {
  authApiBase:     "/api/auth",
  propertyApiBase: "/api/property",
  customerApiBase: "/api/customer",
  staticApiBase:   "/api/static",
  aiApiBase:       "/api/ai",
} as const;

const APIM_ROOT = "https://apim-dev-5c27bcf3.azure-api.net";

const PROD_DEFAULTS = {
  authApiBase:     import.meta.env.VITE_AUTH_API     ?? `${APIM_ROOT}/auth`,
  propertyApiBase: import.meta.env.VITE_PROPERTY_API ?? `${APIM_ROOT}/property`,
  customerApiBase: import.meta.env.VITE_CUSTOMER_API ?? `${APIM_ROOT}/customers`,
  staticApiBase:   import.meta.env.VITE_STATIC_API   ?? `${APIM_ROOT}/staticdata`,
  aiApiBase:       import.meta.env.VITE_AI_API       ?? `${APIM_ROOT}/aiagent`,
} as const;

function readBase(prodKey: keyof typeof PROD_DEFAULTS, devProxy: string): string {
  // DEV mode always uses the /api/* proxy paths.
  if (import.meta.env.DEV) return devProxy;
  return PROD_DEFAULTS[prodKey];
}

export type AppConfig = {
  authApiBase:     string;
  propertyApiBase: string;
  customerApiBase: string;
  staticApiBase:   string;
  aiApiBase:       string;
  authToken:       string;
};

export function loadConfig(): AppConfig {
  return {
    authApiBase:     readBase("authApiBase",     DEV_PROXY.authApiBase),
    propertyApiBase: readBase("propertyApiBase", DEV_PROXY.propertyApiBase),
    customerApiBase: readBase("customerApiBase", DEV_PROXY.customerApiBase),
    staticApiBase:   readBase("staticApiBase",   DEV_PROXY.staticApiBase),
    aiApiBase:       readBase("aiApiBase",        DEV_PROXY.aiApiBase),
    authToken:       localStorage.getItem(LS.authToken) ?? "",
  };
}

export function getAuthToken(): string {
  return localStorage.getItem(LS.authToken) ?? "";
}

export function setAuthToken(token: string): void {
  localStorage.setItem(LS.authToken, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(LS.authToken);
}

/* ── JWT decode (no verification — display only) ─────────────────── */
export type JwtClaims = Record<string, unknown> & {
  sub?: string;
  email?: string;
  name?: string;
  role?: string | string[];
  exp?: number;
};

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(json) as JwtClaims;
  } catch {
    return null;
  }
}

/** Extract roles as a normalized lowercase string array from JWT claims. */
export function rolesFromClaims(claims: JwtClaims | null): string[] {
  if (!claims) return [];
  const raw =
    claims.role ??
    (claims as Record<string, unknown>)[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ];
  if (Array.isArray(raw)) return raw.map((r) => String(r).toLowerCase());
  if (typeof raw === "string") return [raw.toLowerCase()];
  return [];
}

/* ── Customer profile persistence ────────────────────────────────── */
export type CustomerProfile = {
  id?: string;
  customerId?: string;
  fullName?: string;
  email?: string;
  phoneNumber?: string;
  [key: string]: unknown;
};

export function saveCustomerProfile(profile: CustomerProfile): void {
  localStorage.setItem(LS.profile, JSON.stringify(profile));
}

export function loadCustomerProfile(): CustomerProfile | null {
  try {
    const raw = localStorage.getItem(LS.profile);
    return raw ? (JSON.parse(raw) as CustomerProfile) : null;
  } catch {
    return null;
  }
}

export function clearCustomerProfile(): void {
  localStorage.removeItem(LS.profile);
}

/* ── Favorites & cart persistence ────────────────────────────────── */
function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}

export const loadFavorites = (): string[] => readIds(LS.favorites);
export const saveFavorites = (ids: string[]): void =>
  localStorage.setItem(LS.favorites, JSON.stringify(ids));
export const loadCart = (): string[] => readIds(LS.cart);
export const saveCart = (ids: string[]): void =>
  localStorage.setItem(LS.cart, JSON.stringify(ids));
