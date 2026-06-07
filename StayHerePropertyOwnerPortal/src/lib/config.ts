const LS = {
  authToken:    "sh_owner_auth_token",
  ownerProfile: "sh_owner_profile",
  authApi:      "sh_owner_auth_api",
  ownerApi:     "sh_owner_api_base",
  propertyApi:  "sh_owner_property_api",
  customerApi:  "sh_owner_customer_api",
  staticApi:    "sh_owner_static_api",
  aiApi:        "sh_owner_ai_api",
} as const;

const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export type OwnerPortalConfig = {
  authApiBase:     string;
  ownerApiBase:    string;
  propertyApiBase: string;
  customerApiBase: string;
  staticApiBase:   string;
  aiApiBase:       string;
  authToken:       string;
};

export function loadConfig(): OwnerPortalConfig {
  const stored = (key: string, devProxy: string, prodDefault: string) => {
    const s = localStorage.getItem(key);
    if (import.meta.env.DEV) return devProxy;
    return s?.trim() || prodDefault;
  };
  return {
    authApiBase:     stored(LS.authApi,     "/api/auth",     `${APIM}/auth`),
    ownerApiBase:    stored(LS.ownerApi,    "/api/owner",    `${APIM}/propertyowner`),
    propertyApiBase: stored(LS.propertyApi, "/api/property", `${APIM}/property`),
    customerApiBase: stored(LS.customerApi, "/api/customer", `${APIM}/customers`),
    staticApiBase:   stored(LS.staticApi,   "/api/static",   `${APIM}/staticdata`),
    aiApiBase:       stored(LS.aiApi,       "/api/ai",       `${APIM}/aiagent`),
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
