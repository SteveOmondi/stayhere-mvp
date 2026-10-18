const LS = {
  authToken:    "sh_owner_auth_token",
  ownerProfile: "sh_owner_profile",
  authApi:      "sh_owner_auth_api",
  ownerApi:     "sh_owner_api_base",
  propertyApi:  "sh_owner_property_api",
  customerApi:  "sh_owner_customer_api",
  staticApi:    "sh_owner_static_api",
  aiApi:        "sh_owner_ai_api",
  paymentsApi:  "sh_owner_payments_api",
} as const;

const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

const PROD_DEFAULTS = {
  authApiBase:     import.meta.env.VITE_AUTH_API          ?? `${APIM}/auth`,
  ownerApiBase:    import.meta.env.VITE_PROPERTY_OWNER_API ?? `${APIM}/propertyowner`,
  propertyApiBase: import.meta.env.VITE_PROPERTY_API      ?? `${APIM}/property`,
  customerApiBase: import.meta.env.VITE_CUSTOMER_API      ?? `${APIM}/customers`,
  staticApiBase:   import.meta.env.VITE_STATIC_API        ?? `${APIM}/staticdata`,
  aiApiBase:       import.meta.env.VITE_AI_API            ?? `${APIM}/aiagent`,
  paymentsApiBase: import.meta.env.VITE_PAYMENTS_API      ?? `${APIM}/payments`,
};

// Ports match scripts/stayhere-function-ports.ps1 — keep in sync if that file changes.
// Path suffixes ("/auth", "/customers") match each Function App's own [HttpTrigger(Route = "...")]
// attributes — AuthService and CustomerService declare routes with that prefix baked in
// (e.g. "auth/login", "customers/by-owner/{id}"), the others don't.
const LOCAL_DEFAULTS = {
  authApiBase:     "http://localhost:7100/api/auth",
  ownerApiBase:    "http://localhost:7103/api",
  propertyApiBase: "http://localhost:7101/api",
  customerApiBase: "http://localhost:7102/api/customers",
  staticApiBase:   "http://localhost:7104/api",
  aiApiBase:       "http://localhost:7105/api",
  paymentsApiBase: "http://localhost:7106/api",
};

// Flip to false (or set VITE_USE_LOCAL_API=false) to point the portal back at the deployed APIM gateway.
const USE_LOCAL_API = (import.meta.env.VITE_USE_LOCAL_API ?? "true") !== "false";
const DEFAULTS = USE_LOCAL_API ? LOCAL_DEFAULTS : PROD_DEFAULTS;

export type OwnerPortalConfig = {
  authApiBase:     string;
  ownerApiBase:    string;
  propertyApiBase: string;
  customerApiBase: string;
  staticApiBase:   string;
  aiApiBase:       string;
  paymentsApiBase: string;
  authToken:       string;
};

export function loadConfig(): OwnerPortalConfig {
  const resolve = (lsKey: string, prodKey: keyof typeof PROD_DEFAULTS) => {
    const overridden = localStorage.getItem(lsKey)?.trim();
    return overridden || DEFAULTS[prodKey];
  };
  return {
    authApiBase:     resolve(LS.authApi,     "authApiBase"),
    ownerApiBase:    resolve(LS.ownerApi,    "ownerApiBase"),
    propertyApiBase: resolve(LS.propertyApi, "propertyApiBase"),
    customerApiBase: resolve(LS.customerApi, "customerApiBase"),
    staticApiBase:   resolve(LS.staticApi,   "staticApiBase"),
    aiApiBase:       resolve(LS.aiApi,       "aiApiBase"),
    paymentsApiBase: resolve(LS.paymentsApi, "paymentsApiBase"),
    authToken:       localStorage.getItem(LS.authToken) ?? "",
  };
}

export function saveConfig(c: Partial<OwnerPortalConfig>) {
  if (c.ownerApiBase)    localStorage.setItem(LS.ownerApi,    c.ownerApiBase);
  if (c.propertyApiBase) localStorage.setItem(LS.propertyApi, c.propertyApiBase);
  if (c.customerApiBase) localStorage.setItem(LS.customerApi, c.customerApiBase);
  if (c.staticApiBase)   localStorage.setItem(LS.staticApi,   c.staticApiBase);
  if (c.aiApiBase)       localStorage.setItem(LS.aiApi,       c.aiApiBase);
}

export function getAuthToken() { return localStorage.getItem(LS.authToken) ?? ""; }
export function setAuthToken(t: string) { localStorage.setItem(LS.authToken, t); }
export function clearAuthToken() { localStorage.removeItem(LS.authToken); localStorage.removeItem(LS.ownerProfile); }

export function saveOwnerProfile(p: Record<string, unknown>) {
  localStorage.setItem(LS.ownerProfile, JSON.stringify(p));
}
export function loadOwnerProfile(): Record<string, unknown> | null {
  try { const s = localStorage.getItem(LS.ownerProfile); return s ? JSON.parse(s) : null; } catch { return null; }
}

/** Decode JWT payload without verification (client-side only). */
export function decodeJwt(token: string): Record<string, unknown> {
  try {
    const [, payload] = token.split(".");
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(b64)) as Record<string, unknown>;
  } catch { return {}; }
}
