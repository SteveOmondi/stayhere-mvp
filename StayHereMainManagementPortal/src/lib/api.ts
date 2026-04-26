import { loadConfig } from "./config";

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 200)}`);
    this.status = status;
    this.body = body;
  }
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new ApiError(res.status, text);
  }
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  /** Send X-User-Id (PropertyOwner id) for PropertyService */
  ownerIdHeader?: string;
  /** Bearer for StaticData admin */
  bearer?: string;
};

async function request<T>(
  base: string,
  path: string,
  opts: FetchOpts = {}
): Promise<T> {
  const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const cfg = loadConfig();
  const ownerId = opts.ownerIdHeader ?? cfg.defaultOwnerUserId;
  if (ownerId && base === cfg.propertyApiBase) {
    headers["X-User-Id"] = ownerId;
  }
  if (opts.bearer) {
    headers["Authorization"] = `Bearer ${opts.bearer}`;
  }

  const res = await fetch(url, {
    method: opts.method ?? "GET",
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const t = await res.text();
    throw new ApiError(res.status, t);
  }
  return parseJson<T>(res);
}

/* —— Property Owner Service —— */
export const ownersApi = {
  /** Flat list for management portal owner dropdown (PropertyOwnerService). */
  portalDirectory: (max = 500) =>
    request<unknown[]>(
      loadConfig().propertyOwnerApiBase,
      `owners/portal-directory?max=${max}`
    ),
  list: (page = 1, pageSize = 20) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners?page=${page}&pageSize=${pageSize}`
    ),
  get: (id: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${id}`),
  getByUser: (userId: string) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners/user/${userId}`
    ),
  getByEmail: (email: string) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners/email/${encodeURIComponent(email)}`
    ),
  create: (body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners`, {
      method: "POST",
      body,
    }),
  update: (id: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${id}`, {
      method: "PUT",
      body,
    }),
  wallet: (ownerId: string) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/wallet`
    ),
  properties: (ownerId: string) =>
    request<unknown[]>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/properties`
    ),
  listings: (ownerId: string, page = 1, pageSize = 20) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/listings?page=${page}&pageSize=${pageSize}`
    ),
  agents: (ownerId: string) =>
    request<unknown[]>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/agents`
    ),
  createAgent: (ownerId: string, body: Record<string, unknown>) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/agents`,
      { method: "POST", body }
    ),
  getAgent: (id: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `agents/${id}`),
  caretakers: (ownerId: string) =>
    request<unknown[]>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/caretakers`
    ),
  createCaretaker: (ownerId: string, body: Record<string, unknown>) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/caretakers`,
      { method: "POST", body }
    ),
  getCaretaker: (id: string) =>
    request<unknown>(
      loadConfig().propertyOwnerApiBase,
      `caretakers/${id}`
    ),
};

/* —— Property Service —— */
export const propertiesApi = {
  list: (page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase, `properties?page=${page}&pageSize=${pageSize}`),
  byOwner: (ownerId: string, page = 1, pageSize = 20) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `properties/owner/${ownerId}?page=${page}&pageSize=${pageSize}`
    ),
  get: (id: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${id}`),
  getByCode: (code: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/code/${encodeURIComponent(code)}`),
  create: (body: Record<string, unknown>, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties`, {
      method: "POST",
      body,
      ownerIdHeader,
    }),
  update: (id: string, body: Record<string, unknown>, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${id}`, {
      method: "PUT",
      body,
      ownerIdHeader,
    }),
  delete: (id: string, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${id}`, {
      method: "DELETE",
      ownerIdHeader,
    }),
};

export const listingsApi = {
  list: (page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase, `listings?page=${page}&pageSize=${pageSize}`),
  byOwner: (ownerId: string, page = 1, pageSize = 20) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `listings/owner/${ownerId}?page=${page}&pageSize=${pageSize}`
    ),
  byProperty: (propertyId: string, page = 1, pageSize = 20) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `listings/property/${propertyId}?page=${page}&pageSize=${pageSize}`
    ),
  get: (id: string) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/${id}`),
  search: (body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/search`, {
      method: "POST",
      body,
    }),
  createFromProperty: (
    propertyId: string,
    body: Record<string, unknown>,
    ownerIdHeader: string
  ) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `properties/${propertyId}/listings`,
      { method: "POST", body, ownerIdHeader }
    ),
  assignAgent: (
    listingId: string,
    body: Record<string, unknown>,
    ownerIdHeader: string
  ) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `listings/${listingId}/agent`,
      { method: "POST", body, ownerIdHeader }
    ),
  removeAgent: (listingId: string, ownerIdHeader: string) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `listings/${listingId}/agent`,
      { method: "DELETE", ownerIdHeader }
    ),
  assignCaretaker: (
    listingId: string,
    body: { caretakerId: string },
    ownerIdHeader: string
  ) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `listings/${listingId}/caretaker`,
      { method: "POST", body, ownerIdHeader }
    ),
  removeCaretaker: (listingId: string, ownerIdHeader: string) =>
    request<unknown>(
      loadConfig().propertyApiBase,
      `listings/${listingId}/caretaker`,
      { method: "DELETE", ownerIdHeader }
    ),
};

/* —— Customer Service —— */
export const customersApi = {
  list: () =>
    request<unknown[]>(loadConfig().customerApiBase, "customers/list"),
  get: (id: string) =>
    request<unknown>(loadConfig().customerApiBase, `customers/${id}`),
  documents: (customerId: string) =>
    request<unknown[]>(
      loadConfig().customerApiBase,
      `customers/${customerId}/documents`
    ),
};

/* —— Static —— */
export const staticApi = {
  categories: () =>
    request<unknown[]>(loadConfig().staticApiBase, "categories"),
  categoriesAll: () => {
    const t = loadConfig().staticDataBearer;
    return request<unknown[]>(loadConfig().staticApiBase, "categories/all", {
      bearer: t || "mock-jwt-token",
    });
  },
};
