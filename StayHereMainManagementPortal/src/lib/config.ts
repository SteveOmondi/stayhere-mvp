const LS_KEYS = {
  ownerApi: "sh_mgmt_owner_api",
  propertyApi: "sh_mgmt_property_api",
  customerApi: "sh_mgmt_customer_api",
  staticApi: "sh_mgmt_static_api",
  xUserId: "sh_mgmt_x_user_id",
  staticBearer: "sh_mgmt_static_bearer",
} as const;

/** Same-origin paths used with Vite `server.proxy` (see vite.config.ts) — avoids CORS in `npm run dev`. */
const devProxyBases = {
  propertyOwnerApiBase: "/stayhere-api/owner",
  propertyApiBase: "/stayhere-api/property",
  customerApiBase: "/stayhere-api/customer",
  staticApiBase: "/stayhere-api/static",
} as const;

const prodDefaults = {
  propertyOwnerApiBase:
    import.meta.env.VITE_PROPERTY_OWNER_API ?? "http://localhost:7103/api",
  propertyApiBase:
    import.meta.env.VITE_PROPERTY_API ?? "http://localhost:7101/api",
  customerApiBase:
    import.meta.env.VITE_CUSTOMER_API ?? "http://localhost:7102/api",
  staticApiBase:
    import.meta.env.VITE_STATIC_API ?? "http://localhost:7104/api",
};

/** Saved localhost bases break dev (CORS); ignore them when using the Vite proxy. */
function isDevCrossOriginSavedBase(url: string | null): boolean {
  if (!url || !import.meta.env.DEV) return false;
  const t = url.trim();
  return /^https?:\/\/(localhost|127\.0\.0\.1):\d+/i.test(t);
}

function readApiBase(
  lsKey: (typeof LS_KEYS)[keyof typeof LS_KEYS],
  prodKey: keyof typeof prodDefaults,
  devProxy: string
): string {
  const stored = localStorage.getItem(lsKey);
  if (import.meta.env.DEV) {
    if (isDevCrossOriginSavedBase(stored)) return devProxy;
    if (stored?.trim()) return stored.trim();
    return devProxy;
  }
  if (stored?.trim()) return stored.trim();
  return prodDefaults[prodKey];
}

export type PortalConfig = {
  propertyOwnerApiBase: string;
  propertyApiBase: string;
  customerApiBase: string;
  staticApiBase: string;
  /** PropertyOwner GUID — sent as X-User-Id for PropertyService mutations when using SKIP_AUTH */
  defaultOwnerUserId: string;
  /** For StaticDataService admin routes when SKIP_AUTH is false */
  staticDataBearer: string;
};

export function loadConfig(): PortalConfig {
  return {
    propertyOwnerApiBase: readApiBase(
      LS_KEYS.ownerApi,
      "propertyOwnerApiBase",
      devProxyBases.propertyOwnerApiBase
    ),
    propertyApiBase: readApiBase(
      LS_KEYS.propertyApi,
      "propertyApiBase",
      devProxyBases.propertyApiBase
    ),
    customerApiBase: readApiBase(
      LS_KEYS.customerApi,
      "customerApiBase",
      devProxyBases.customerApiBase
    ),
    staticApiBase: readApiBase(
      LS_KEYS.staticApi,
      "staticApiBase",
      devProxyBases.staticApiBase
    ),
    defaultOwnerUserId: localStorage.getItem(LS_KEYS.xUserId) ?? "",
    staticDataBearer:
      localStorage.getItem(LS_KEYS.staticBearer) ?? "mock-jwt-token",
  };
}

export function saveConfig(c: Partial<PortalConfig>): void {
  if (c.propertyOwnerApiBase != null)
    localStorage.setItem(LS_KEYS.ownerApi, c.propertyOwnerApiBase.trim());
  if (c.propertyApiBase != null)
    localStorage.setItem(LS_KEYS.propertyApi, c.propertyApiBase.trim());
  if (c.customerApiBase != null)
    localStorage.setItem(LS_KEYS.customerApi, c.customerApiBase.trim());
  if (c.staticApiBase != null)
    localStorage.setItem(LS_KEYS.staticApi, c.staticApiBase.trim());
  if (c.defaultOwnerUserId != null)
    localStorage.setItem(LS_KEYS.xUserId, c.defaultOwnerUserId.trim());
  if (c.staticDataBearer != null)
    localStorage.setItem(LS_KEYS.staticBearer, c.staticDataBearer.trim());
}
