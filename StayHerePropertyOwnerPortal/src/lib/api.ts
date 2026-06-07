import { loadConfig } from "./config";

export class ApiError extends Error {
  status: number; body: string;
  constructor(status: number, body: string) {
    super(`HTTP ${status}: ${body.slice(0, 300)}`);
    this.status = status; this.body = body;
  }
}

/* ── Console logging ────────────────────────────────────── */
function logReq(method: string, url: string, body?: unknown, hdrs?: Record<string, string>) {
  const s = "color:#0d9488;font-weight:bold;font-size:11px";
  console.group(`%c▶ ${method} ${url}`, s);
  if (hdrs) { const safe = { ...hdrs }; if (safe.Authorization) safe.Authorization = safe.Authorization.slice(0,35)+"…"; console.log("Headers:", safe); }
  if (body !== undefined) console.log("Body:", body);
  console.groupEnd();
}
function logRes(method: string, url: string, status: number, body: unknown, ms: number) {
  const ok = status >= 200 && status < 300;
  console.group(`%c◀ ${status} ${method} ${url}  (+${ms}ms)`, ok ? "color:#10b981;font-weight:bold;font-size:11px" : "color:#ef4444;font-weight:bold;font-size:11px");
  console.log("Response:", body);
  console.groupEnd();
}

async function parseBody(res: Response): Promise<unknown> {
  const t = await res.text();
  if (!t) return undefined;
  try { return JSON.parse(t); } catch { return t; }
}

type Opts = { method?: string; body?: unknown; bearer?: string };

async function req<T>(base: string, path: string, opts: Opts = {}): Promise<T> {
  const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const cfg = loadConfig();
  const method = opts.method ?? "GET";
  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.bearer) headers["Authorization"] = `Bearer ${opts.bearer}`;
  else if (cfg.authToken) headers["Authorization"] = `Bearer ${cfg.authToken}`;

  logReq(method, url, opts.body, headers);
  const t0 = Date.now();
  let res: Response;
  try { res = await fetch(url, { method, headers, body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined }); }
  catch (err) { console.error(`✖ NETWORK ERROR ${method} ${url}`, err); throw err; }

  const parsed = await parseBody(res);
  logRes(method, url, res.status, parsed, Date.now() - t0);
  if (res.status === 204) return undefined as T;
  if (!res.ok) throw new ApiError(res.status, typeof parsed === "string" ? parsed : JSON.stringify(parsed));
  return parsed as T;
}

/* ══ Auth ══════════════════════════════════════════════════ */
export const authApi = {
  login: (body: { email?: string; phoneNumber?: string }) =>
    req<Record<string, unknown>>(loadConfig().authApiBase, "login", { method: "POST", body }),
  verifyOtp: (body: { otp: string; PhoneNumber?: string; Email?: string }) =>
    req<{ succeeded: boolean; message?: string; token?: string; user?: Record<string, unknown> }>(
      loadConfig().authApiBase, "verifyotp", { method: "POST", body }),
  /** POST /auth/signup — register a new user (no role). Onboarding is admin-only. */
  signup: (body: { email: string; phoneNumber?: string; fullName: string; userType?: string }) =>
    req<Record<string, unknown>>(loadConfig().authApiBase, "signup", { method: "POST", body }),
};

/* ══ Property Owner ════════════════════════════════════════ */
export const ownerApi = {
  getByUserId: (userId: string) =>
    req<Record<string, unknown>>(loadConfig().ownerApiBase, `owners/user/${userId}`),
  get: (id: string) =>
    req<Record<string, unknown>>(loadConfig().ownerApiBase, `owners/${id}`),
  update: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().ownerApiBase, `owners/${id}`, { method: "PUT", body }),
  wallet: (id: string) =>
    req<Record<string, unknown>>(loadConfig().ownerApiBase, `owners/${id}/wallet`),
  agents: (id: string) =>
    req<unknown[]>(loadConfig().ownerApiBase, `owners/${id}/agents`),
  createAgent: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().ownerApiBase, `owners/${id}/agents`, { method: "POST", body }),
  getAgent: (agentId: string) =>
    req<unknown>(loadConfig().ownerApiBase, `agents/${agentId}`),
  caretakers: (id: string) =>
    req<unknown[]>(loadConfig().ownerApiBase, `owners/${id}/caretakers`),
  createCaretaker: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().ownerApiBase, `owners/${id}/caretakers`, { method: "POST", body }),
  getCaretaker: (cId: string) =>
    req<unknown>(loadConfig().ownerApiBase, `caretakers/${cId}`),
  listings: (id: string, page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().ownerApiBase, `owners/${id}/listings?page=${page}&pageSize=${pageSize}`),
};

/* ══ Properties ════════════════════════════════════════════ */
export const propertiesApi = {
  byOwner: (ownerId: string, page = 1, pageSize = 50) =>
    req<unknown>(loadConfig().propertyApiBase, `properties/owner/${ownerId}?page=${page}&pageSize=${pageSize}`),
  get: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `properties/${id}`),
  create: (body: Record<string, unknown>) =>
    req<unknown>(loadConfig().propertyApiBase, `properties`, { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().propertyApiBase, `properties/${id}`, { method: "PUT", body }),
  delete: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `properties/${id}`, { method: "DELETE" }),
};

/* ══ Listings ══════════════════════════════════════════════ */
export const listingsApi = {
  byOwner: (ownerId: string, page = 1, pageSize = 50) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/owner/${ownerId}?page=${page}&pageSize=${pageSize}`),
  byProperty: (propertyId: string, page = 1, pageSize = 50) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/property/${propertyId}?page=${page}&pageSize=${pageSize}`),
  get: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}`),
  available: () =>
    req<unknown>(loadConfig().propertyApiBase, `listings/available`),
  search: (body: Record<string, unknown>) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/search`, { method: "POST", body }),
  createFromProperty: (propertyId: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().propertyApiBase, `properties/${propertyId}/listings`, { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}`, { method: "PUT", body }),
  updateAvailability: (id: string, body: { isAvailable: boolean }) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/availability`, { method: "PATCH", body }),
  delete: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}`, { method: "DELETE" }),
  assignAgent: (id: string, body: { agentId: string }) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/agent`, { method: "POST", body }),
  removeAgent: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/agent`, { method: "DELETE" }),
  assignCaretaker: (id: string, body: { caretakerId: string }) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/caretaker`, { method: "POST", body }),
  removeCaretaker: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/caretaker`, { method: "DELETE" }),
  incrementViews: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/view`, { method: "POST" }),
};

/* ══ Customers / Tenants ═══════════════════════════════════ */
export const customersApi = {
  /** Get all tenants across all of this owner's listings (scoped by auth user ID). */
  byOwner: (ownerId: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `by-owner/${ownerId}`),
  /** Get tenants in a specific property (by property GUID). */
  byProperty: (propertyId: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `by-property/${propertyId}`),
  /** Get tenants for a specific listing (existing route). */
  byListing: (listingId: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `../listings/${listingId}/customers`),
  get: (id: string) =>
    req<unknown>(loadConfig().customerApiBase, `${id}`),
  documents: (id: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `${id}/documents`),
  addDocument: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().customerApiBase, `${id}/documents`, { method: "POST", body }),
  update: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().customerApiBase, `${id}`, { method: "PUT", body }),
  deactivate: (id: string) =>
    req<unknown>(loadConfig().customerApiBase, `${id}/deactivate`, { method: "POST" }),
  properties: (id: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `${id}/properties`),
  attachProperty: (id: string, body: Record<string, unknown>) =>
    req<unknown>(loadConfig().customerApiBase, `${id}/properties`, { method: "POST", body }),
};

/* ══ Static / Categories ═══════════════════════════════════ */
export const staticApi = {
  categories: () => req<unknown[]>(loadConfig().staticApiBase, "categories"),
};

/* ══ Image Upload ══════════════════════════════════════════ */
export type UploadUrlResponse = { uploadUrl: string; imageId: string; publicUrl: string };

export const uploadApi = {
  /** POST /upload/request-url — get a Cloudflare direct upload URL (server keeps API token). */
  requestUrl: () =>
    req<UploadUrlResponse>(loadConfig().propertyApiBase, "upload/request-url", { method: "POST" }),
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

/* ══ AI Agent ══════════════════════════════════════════════ */
export const aiApi = {
  chat: (body: { message: string; sessionId?: string }) =>
    req<Record<string, unknown>>(loadConfig().aiApiBase, "chat", { method: "POST", body }),
  searchListings: (query?: string) => {
    const qs = query ? `?query=${encodeURIComponent(query)}` : "";
    return req<unknown[]>(loadConfig().aiApiBase, `listings${qs}`);
  },
  recommend: (body: Record<string, unknown>) =>
    req<unknown>(loadConfig().aiApiBase, "respondandrecommend", { method: "POST", body }),
  health: () => req<unknown>(loadConfig().aiApiBase, "health"),
};
