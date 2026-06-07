const LS = {
  ownerApi:      "sh_mgmt_owner_api",
  propertyApi:   "sh_mgmt_property_api",
  customerApi:   "sh_mgmt_customer_api",
  staticApi:     "sh_mgmt_static_api",
  authApi:       "sh_mgmt_auth_api",
  aiApi:         "sh_mgmt_ai_api",
  xUserId:       "sh_mgmt_x_user_id",
  staticBearer:  "sh_mgmt_static_bearer",
  authToken:     "sh_mgmt_auth_token",
} as const;

const DEV_PROXY = {
  propertyOwnerApiBase: "/stayhere-api/owner",
  propertyApiBase:      "/stayhere-api/property",
  customerApiBase:      "/stayhere-api/customer",
  staticApiBase:        "/stayhere-api/static",
  authApiBase:          "/stayhere-api/auth",
  aiAgentApiBase:       "/stayhere-api/ai",
} as const;

const APIM_ROOT = "https://apim-dev-5c27bcf3.azure-api.net";

const PROD_DEFAULTS = {
  propertyOwnerApiBase: import.meta.env.VITE_PROPERTY_OWNER_API ?? `${APIM_ROOT}/propertyowner`,
  propertyApiBase:      import.meta.env.VITE_PROPERTY_API      ?? `${APIM_ROOT}/property`,
  customerApiBase:      import.meta.env.VITE_CUSTOMER_API      ?? `${APIM_ROOT}/customers`,
  staticApiBase:        import.meta.env.VITE_STATIC_API        ?? `${APIM_ROOT}/staticdata`,
  authApiBase:          import.meta.env.VITE_AUTH_API          ?? `${APIM_ROOT}/auth`,
  aiAgentApiBase:       import.meta.env.VITE_AI_API            ?? `${APIM_ROOT}/aiagent`,
};

function isCrossOriginLocalhost(url: string | null): boolean {
  if (!url || !import.meta.env.DEV) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+/i.test(url.trim());
}

function readBase(
  key: (typeof LS)[keyof typeof LS],
  prodKey: keyof typeof PROD_DEFAULTS,
  devProxy: string
): string {
  const stored = localStorage.getItem(key);
  if (import.meta.env.DEV) {
    if (isCrossOriginLocalhost(stored)) return devProxy;
    if (stored?.trim()) return stored.trim();
    return devProxy;
  }
  if (stored?.trim()) return stored.trim();
  return PROD_DEFAULTS[prodKey];
}

export type PortalConfig = {
  propertyOwnerApiBase: string;
  propertyApiBase:      string;
  customerApiBase:      string;
  staticApiBase:        string;
  authApiBase:          string;
  aiAgentApiBase:       string;
  defaultOwnerUserId:   string;
  staticDataBearer:     string;
  authToken:            string;
};

export function loadConfig(): PortalConfig {
  return {
    propertyOwnerApiBase: readBase(LS.ownerApi,    "propertyOwnerApiBase", DEV_PROXY.propertyOwnerApiBase),
    propertyApiBase:      readBase(LS.propertyApi, "propertyApiBase",      DEV_PROXY.propertyApiBase),
    customerApiBase:      readBase(LS.customerApi, "customerApiBase",      DEV_PROXY.customerApiBase),
    staticApiBase:        readBase(LS.staticApi,   "staticApiBase",        DEV_PROXY.staticApiBase),
    authApiBase:          readBase(LS.authApi,     "authApiBase",          DEV_PROXY.authApiBase),
    aiAgentApiBase:       readBase(LS.aiApi,       "aiAgentApiBase",       DEV_PROXY.aiAgentApiBase),
    defaultOwnerUserId:   localStorage.getItem(LS.xUserId)      ?? "",
    staticDataBearer:     localStorage.getItem(LS.staticBearer) ?? "mock-jwt-token",
    authToken:            localStorage.getItem(LS.authToken)    ?? "",
  };
}

export function saveConfig(c: Partial<PortalConfig>): void {
  const set = (key: string, val?: string) => {
    if (val != null) localStorage.setItem(key, val.trim());
  };
  set(LS.ownerApi,      c.propertyOwnerApiBase);
  set(LS.propertyApi,   c.propertyApiBase);
  set(LS.customerApi,   c.customerApiBase);
  set(LS.staticApi,     c.staticApiBase);
  set(LS.authApi,       c.authApiBase);
  set(LS.aiApi,         c.aiAgentApiBase);
  set(LS.xUserId,       c.defaultOwnerUserId);
  set(LS.staticBearer,  c.staticDataBearer);
  set(LS.authToken,     c.authToken);
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
