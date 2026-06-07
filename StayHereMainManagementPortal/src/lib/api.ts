import { loadConfig } from "./config";

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
    this.status = status;
    this.body = body;
  }
}

/* ── Console logging ─────────────────────────────────────────────── */
function logRequest(method: string, url: string, body?: unknown, headers?: Record<string, string>) {
  const style = "color:#c9a227;font-weight:bold;font-size:11px";
  console.group(`%c▶ ${method} ${url}`, style);
  if (headers && Object.keys(headers).length) {
    const safe = { ...headers };
    if (safe["Authorization"]) safe["Authorization"] = safe["Authorization"].slice(0, 30) + "…";
    console.log("Headers:", safe);
  }
  if (body !== undefined) console.log("Body:", body);
  console.groupEnd();
}

function logResponse(method: string, url: string, status: number, body: unknown, durationMs: number) {
  const ok = status >= 200 && status < 300;
  const style = ok
    ? "color:#10b981;font-weight:bold;font-size:11px"
    : "color:#ef4444;font-weight:bold;font-size:11px";
  console.group(`%c◀ ${status} ${method} ${url}  (+${durationMs}ms)`, style);
  console.log("Response:", body);
  console.groupEnd();
}

function logError(method: string, url: string, error: unknown) {
  console.group(`%c✖ NETWORK ERROR ${method} ${url}`, "color:#ef4444;font-weight:bold;font-size:11px");
  console.error(error);
  console.groupEnd();
}

/* ── Core fetch ───────────────────────────────────────────── */
async function parseBody(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return undefined;
  try { return JSON.parse(text); } catch { return text; }
}

type FetchOpts = {
  method?: string;
  body?: unknown;
  ownerIdHeader?: string;
  bearer?: string;
  useAuthToken?: boolean;
};

async function request<T>(base: string, path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const cfg = loadConfig();
  const method = opts.method ?? "GET";

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";

  const ownerId = opts.ownerIdHeader ?? cfg.defaultOwnerUserId;
  if (ownerId && base === cfg.propertyApiBase) headers["X-User-Id"] = ownerId;

  /* Always send the stored auth token on every request.
     An explicit opts.bearer (e.g. static-data admin token) takes precedence. */
  if (opts.bearer) {
    headers["Authorization"] = `Bearer ${opts.bearer}`;
  } else if (cfg.authToken) {
    headers["Authorization"] = `Bearer ${cfg.authToken}`;
  }

  logRequest(method, url, opts.body, headers);
  const t0 = Date.now();

  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    logError(method, url, err);
    throw err;
  }

  const parsed = await parseBody(res);
  logResponse(method, url, res.status, parsed, Date.now() - t0);

  if (res.status === 204) return undefined as T;
  if (!res.ok) {
    const bodyStr = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new ApiError(res.status, bodyStr);
  }
  return parsed as T;
}

/* ══════════════════════════════════════════════════════════
   Auth Service
   Paths relative to authApiBase (e.g. /stayhere-api/auth)
   Full URL example: https://apim-dev-5c27bcf3.azure-api.net/auth/login
══════════════════════════════════════════════════════════ */
export const authApi = {
  /** Passwordless — send email OR phoneNumber to trigger OTP dispatch. */
  login: (body: { email?: string; phoneNumber?: string }) =>
    request<Record<string, unknown>>(loadConfig().authApiBase, "login", { method: "POST", body }),

  /** POST /verifyotp — body uses Pascal-case field names as required by the API. */
  verifyOtp: (body: { otp: string; PhoneNumber?: string; Email?: string }) =>
    request<{ succeeded: boolean; message?: string; token?: string; user?: Record<string, unknown> }>(
      loadConfig().authApiBase, "verifyotp", { method: "POST", body }
    ),

  me: () =>
    request<Record<string, unknown>>(loadConfig().authApiBase, "me", { useAuthToken: true }),

  logout: () =>
    request<unknown>(loadConfig().authApiBase, "logout", { method: "POST", useAuthToken: true }),

  refresh: (refreshToken: string) =>
    request<Record<string, unknown>>(loadConfig().authApiBase, "refresh", {
      method: "POST", body: { refreshToken },
    }),

  resetPasswordRequest: (email: string) =>
    request<unknown>(loadConfig().authApiBase, "reset-password/request", {
      method: "POST", body: { email },
    }),

  /** POST /auth/signup — create a new user account (no role assigned yet). */
  signup: (body: { email: string; phoneNumber?: string; fullName: string; userType?: string }) =>
    request<Record<string, unknown>>(loadConfig().authApiBase, "signup", { method: "POST", body }),

  /** POST /auth/onboard — assign a role to an existing user. Admin only. */
  onboard: (body: { userId: string; role: string; fullName: string; phone: string; email: string }) =>
    request<Record<string, unknown>>(loadConfig().authApiBase, "onboard", { method: "POST", body }),

  /** GET /auth/users — paginated list of all users. Admin only. */
  getUsers: (page = 1, pageSize = 20) =>
    request<{ succeeded: boolean; page: number; pageSize: number; totalCount: number; totalPages: number; items: Record<string, unknown>[] }>(
      loadConfig().authApiBase, `users?page=${page}&pageSize=${pageSize}`
    ),

  /** GET /auth/users/{id} — single user by auth ID. Admin only. */
  getUserById: (id: string) =>
    request<Record<string, unknown>>(loadConfig().authApiBase, `users/${id}`),
};

/* ══════════════════════════════════════════════════════════
   Property Owner Service
══════════════════════════════════════════════════════════ */
export const ownersApi = {
  portalDirectory: (max = 500) =>
    request<unknown[]>(loadConfig().propertyOwnerApiBase, `owners/portal-directory?max=${max}`),
  list: (page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners?page=${page}&pageSize=${pageSize}`),
  get: (id: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${id}`),
  getByUser: (userId: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/user/${userId}`),
  getByEmail: (email: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/email/${encodeURIComponent(email)}`),
  create: (body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners`, { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${id}`, { method: "PUT", body }),
  wallet: (ownerId: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${ownerId}/wallet`),
  properties: (ownerId: string) =>
    request<unknown[]>(loadConfig().propertyOwnerApiBase, `owners/${ownerId}/properties`),
  listings: (ownerId: string, page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyOwnerApiBase,
      `owners/${ownerId}/listings?page=${page}&pageSize=${pageSize}`),
  agents: (ownerId: string) =>
    request<unknown[]>(loadConfig().propertyOwnerApiBase, `owners/${ownerId}/agents`),
  createAgent: (ownerId: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${ownerId}/agents`, { method: "POST", body }),
  getAgent: (id: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `agents/${id}`),
  caretakers: (ownerId: string) =>
    request<unknown[]>(loadConfig().propertyOwnerApiBase, `owners/${ownerId}/caretakers`),
  createCaretaker: (ownerId: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `owners/${ownerId}/caretakers`, { method: "POST", body }),
  getCaretaker: (id: string) =>
    request<unknown>(loadConfig().propertyOwnerApiBase, `caretakers/${id}`),
};

/* ══════════════════════════════════════════════════════════
   Property & Listings Service
══════════════════════════════════════════════════════════ */
export const propertiesApi = {
  list: (page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase, `properties?page=${page}&pageSize=${pageSize}`),
  byOwner: (ownerId: string, page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase,
      `properties/owner/${ownerId}?page=${page}&pageSize=${pageSize}`),
  get: (id: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${id}`),
  getByCode: (code: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/code/${encodeURIComponent(code)}`),
  create: (body: Record<string, unknown>, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties`, { method: "POST", body, ownerIdHeader }),
  update: (id: string, body: Record<string, unknown>, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${id}`, { method: "PUT", body, ownerIdHeader }),
  delete: (id: string, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${id}`, { method: "DELETE", ownerIdHeader }),
};

export const listingsApi = {
  list: (page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase, `listings?page=${page}&pageSize=${pageSize}`),
  byOwner: (ownerId: string, page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase,
      `listings/owner/${ownerId}?page=${page}&pageSize=${pageSize}`),
  byProperty: (propertyId: string, page = 1, pageSize = 20) =>
    request<unknown>(loadConfig().propertyApiBase,
      `listings/property/${propertyId}?page=${page}&pageSize=${pageSize}`),
  get: (id: string) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/${id}`),
  search: (body: Record<string, unknown>) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/search`, { method: "POST", body }),
  createFromProperty: (propertyId: string, body: Record<string, unknown>, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `properties/${propertyId}/listings`,
      { method: "POST", body, ownerIdHeader }),
  assignAgent: (listingId: string, body: Record<string, unknown>, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/${listingId}/agent`,
      { method: "POST", body, ownerIdHeader }),
  removeAgent: (listingId: string, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/${listingId}/agent`,
      { method: "DELETE", ownerIdHeader }),
  assignCaretaker: (listingId: string, body: { caretakerId: string }, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/${listingId}/caretaker`,
      { method: "POST", body, ownerIdHeader }),
  removeCaretaker: (listingId: string, ownerIdHeader: string) =>
    request<unknown>(loadConfig().propertyApiBase, `listings/${listingId}/caretaker`,
      { method: "DELETE", ownerIdHeader }),
};

/* ══════════════════════════════════════════════════════════
   Customer Service
   APIM gateway: /customers  Function routes: customers/xxx
   → APIM strips the "customers/" prefix, so client paths omit it.
   Function route "customers/list"  → client calls "list"
   Function route "customers/{id}"  → client calls "{id}"
══════════════════════════════════════════════════════════ */
export const customersApi = {
  list: () =>
    request<unknown[]>(loadConfig().customerApiBase, "list"),
  /** Get all tenants across all listings for a given owner (auth user ID). */
  byOwner: (ownerId: string) =>
    request<unknown[]>(loadConfig().customerApiBase, `by-owner/${ownerId}`),
  /** Get all tenants in a specific property (property GUID). */
  byProperty: (propertyId: string) =>
    request<unknown[]>(loadConfig().customerApiBase, `by-property/${propertyId}`),
  get: (id: string) =>
    request<unknown>(loadConfig().customerApiBase, `${id}`),
  getByPhone: (phone: string) =>
    request<unknown>(loadConfig().customerApiBase, `by-phone/${encodeURIComponent(phone)}`),
  documents: (customerId: string) =>
    request<unknown[]>(loadConfig().customerApiBase, `${customerId}/documents`),
  addDocument: (customerId: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().customerApiBase, `${customerId}/documents`, { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().customerApiBase, `${id}`, { method: "PUT", body }),
  deactivate: (id: string) =>
    request<unknown>(loadConfig().customerApiBase, `${id}/deactivate`, { method: "POST" }),
  properties: (customerId: string) =>
    request<unknown[]>(loadConfig().customerApiBase, `${customerId}/properties`),
  attachProperty: (customerId: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().customerApiBase, `${customerId}/properties`, { method: "POST", body }),
};

/* ══════════════════════════════════════════════════════════
   Static Data Service
══════════════════════════════════════════════════════════ */
export type RoleDefinitionDto = { id: string; name: string; description?: string; isSystem: boolean; createdAt?: string };
export type UserTypeDefinitionDto = { id: string; name: string; description?: string; isSystem: boolean; createdAt?: string };

export const staticApi = {
  categories: () =>
    request<unknown[]>(loadConfig().staticApiBase, "categories"),
  userRoles: () =>
    request<RoleDefinitionDto[]>(loadConfig().staticApiBase, "user-roles"),
  userTypes: () =>
    request<UserTypeDefinitionDto[]>(loadConfig().staticApiBase, "user-types"),
  categoriesAll: () =>
    request<unknown[]>(loadConfig().staticApiBase, "categories/all"),
  createCategory: (body: Record<string, unknown>) =>
    request<unknown>(loadConfig().staticApiBase, "categories", { method: "POST", body }),
  updateCategory: (id: string, body: Record<string, unknown>) =>
    request<unknown>(loadConfig().staticApiBase, `categories/${id}`, { method: "PUT", body }),
  deleteCategory: (id: string) =>
    request<unknown>(loadConfig().staticApiBase, `categories/${id}`, { method: "DELETE" }),
  createUserRole: (body: { name: string; description?: string }) =>
    request<RoleDefinitionDto>(loadConfig().staticApiBase, "user-roles", { method: "POST", body }),
  createUserType: (body: { name: string; description?: string }) =>
    request<UserTypeDefinitionDto>(loadConfig().staticApiBase, "user-types", { method: "POST", body }),
};

/* ══════════════════════════════════════════════════════════
   Image Upload
══════════════════════════════════════════════════════════ */
export type UploadUrlResponse = { uploadUrl: string; imageId: string; publicUrl: string };

export const uploadApi = {
  /** POST /upload/request-url — get a Cloudflare direct upload URL (server keeps API token). */
  requestUrl: () =>
    request<UploadUrlResponse>(loadConfig().propertyApiBase, "upload/request-url", { method: "POST" }),
};

/** Upload a File directly to a Cloudflare direct upload URL (no auth header needed). */
export async function uploadFileToCloudflare(uploadUrl: string, file: File): Promise<void> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Cloudflare upload failed ${res.status}: ${text.slice(0, 200)}`);
  }
}

/* ══════════════════════════════════════════════════════════
   AI Agent Service
   Actual function routes: chat, respondandrecommend,
   knowledge/status, listings (GET), health
══════════════════════════════════════════════════════════ */
export const aiAgentApi = {
  /** POST chat — natural language conversation */
  chat: (body: { message: string; sessionId?: string; context?: Record<string, unknown> }) =>
    request<{ reply: string; sessionId?: string; results?: unknown[] }>(
      loadConfig().aiAgentApiBase, "chat", { method: "POST", body }
    ),
  /** GET listings — AI-powered listing search with query params */
  searchListings: (query?: string, filters?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (query) params.set("query", query);
    if (filters) Object.entries(filters).forEach(([k, v]) => params.set(k, v));
    const qs = params.toString();
    return request<unknown[]>(loadConfig().aiAgentApiBase, `listings${qs ? `?${qs}` : ""}`);
  },
  /** POST respondandrecommend — context-aware recommendations */
  recommend: (body: { customerId?: string; preferences?: Record<string, unknown>; message?: string }) =>
    request<unknown>(loadConfig().aiAgentApiBase, "respondandrecommend", { method: "POST", body }),
  /** GET knowledge/status — knowledge base health */
  knowledgeStatus: () =>
    request<unknown>(loadConfig().aiAgentApiBase, "knowledge/status"),
  /** GET health */
  health: () =>
    request<unknown>(loadConfig().aiAgentApiBase, "health"),
};
