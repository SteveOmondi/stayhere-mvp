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
  requireAuth?: boolean;
};

async function req<T>(base: string, path: string, opts: FetchOpts = {}): Promise<T> {
  const url = `${base.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const cfg = loadConfig();
  const method = opts.method ?? "GET";

  const headers: Record<string, string> = { Accept: "application/json" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (cfg.authToken) headers["Authorization"] = `Bearer ${cfg.authToken}`;

  if (opts.requireAuth && !cfg.authToken) {
    throw new ApiError(401, "Authentication required");
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
   Shared domain types
══════════════════════════════════════════════════════════ */
export type Listing = {
  id: string;
  title?: string;
  description?: string;
  price?: number;
  rentPrice?: number;
  city?: string;
  suburb?: string;
  county?: string;
  country?: string;
  location?: string;
  street?: string;
  propertyType?: string;
  listingType?: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqft?: number;
  floor?: number | string;
  yearBuilt?: number;
  amenities?: string[];
  images?: string[];
  primaryImageUrl?: string | null;
  isAvailable?: boolean;
  isFeatured?: boolean;
  rating?: number;
  views?: number;
  listingCode?: string;
  agentId?: string;
  caretakerId?: string;
  ownerId?: string;
  categoryId?: string;
  subcategoryId?: string;
  categoryName?: string;
  subcategoryName?: string;
  [key: string]: unknown;
};

export type Paged<T> = {
  items?: T[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
  [key: string]: unknown;
};

export type SearchBody = {
  location?: string;
  city?: string;
  propertyTypes?: string[];
  listingType?: string;
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  amenities?: string[];
  sortBy?: string;
  categoryId?: string;
  subcategoryId?: string;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
};

/** Normalize a listings response (array OR paged envelope) to Listing[]. */
export function asListingArray(data: unknown): Listing[] {
  if (Array.isArray(data)) return data as Listing[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "data", "listings", "results"]) {
      if (Array.isArray(obj[key])) return obj[key] as Listing[];
    }
  }
  return [];
}

/* ══════════════════════════════════════════════════════════
   Auth Service
══════════════════════════════════════════════════════════ */
export const authApi = {
  /** Passwordless — send email OR phoneNumber to trigger OTP dispatch. */
  login: (body: { email?: string; phoneNumber?: string }) =>
    req<Record<string, unknown>>(loadConfig().authApiBase, "login", { method: "POST", body }),

  /** POST /verifyotp — body uses Pascal-case field names as required by the API. */
  verifyOtp: (body: { otp: string; PhoneNumber?: string; Email?: string }) =>
    req<{ succeeded?: boolean; message?: string; token?: string; user?: Record<string, unknown> }>(
      loadConfig().authApiBase, "verifyotp", { method: "POST", body }
    ),

  /** POST /signup — create a new tenant account. */
  signup: (body: { email: string; phoneNumber?: string; fullName: string }) =>
    req<Record<string, unknown>>(loadConfig().authApiBase, "signup", {
      method: "POST",
      body: { ...body, userType: "Tenant" },
    }),
};

/* ══════════════════════════════════════════════════════════
   Listings Service (Property API)
══════════════════════════════════════════════════════════ */
export const listingsApi = {
  getAll: (page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase, `listings?page=${page}&pageSize=${pageSize}`),
  getById: (id: string) =>
    req<Listing>(loadConfig().propertyApiBase, `listings/${id}`),
  getAvailable: (page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/available?page=${page}&pageSize=${pageSize}`),
  getFeatured: (limit = 10) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/featured?limit=${limit}`),
  search: (body: SearchBody) =>
    req<unknown>(loadConfig().propertyApiBase, "listings/search", { method: "POST", body }),
  byLocation: (location: string, page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase,
      `listings/by-location?location=${encodeURIComponent(location)}&page=${page}&pageSize=${pageSize}`),
  byType: (type: string, page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase,
      `listings/type/${encodeURIComponent(type)}?page=${page}&pageSize=${pageSize}`),
  byListingType: (type: string, page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase,
      `listings/listing-type/${encodeURIComponent(type)}?page=${page}&pageSize=${pageSize}`),
  byCity: (city: string, page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase,
      `listings/city/${encodeURIComponent(city)}?page=${page}&pageSize=${pageSize}`),
  incrementViews: (id: string) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/view`, { method: "POST" }),
  rate: (id: string, rating: number) =>
    req<unknown>(loadConfig().propertyApiBase, `listings/${id}/rating`, {
      method: "PATCH",
      body: { newRating: rating },
    }),
};

/* ══════════════════════════════════════════════════════════
   Customer Service
══════════════════════════════════════════════════════════ */
export const customerApi = {
  getProfile: (id: string) =>
    req<Record<string, unknown>>(loadConfig().customerApiBase, `${id}`),
  getProperties: (id: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `${id}/properties`),
  getDocuments: (id: string) =>
    req<unknown[]>(loadConfig().customerApiBase, `${id}/documents`),
};

/* ══════════════════════════════════════════════════════════
   AI Agent Service
══════════════════════════════════════════════════════════ */
export type AiChatResponse = {
  reply?: string;
  message?: string;
  response?: string;
  sessionId?: string;
  results?: unknown[];
  recommendations?: unknown[];
  [key: string]: unknown;
};

export const aiApi = {
  /** POST /chat — natural language conversation (requires auth). */
  chat: (body: { query: string; sessionId?: string }) =>
    req<AiChatResponse>(loadConfig().aiApiBase, "chat", { method: "POST", body, requireAuth: true }),

  /** GET /listings — AI-powered listing search. */
  searchListings: (params?: { listing_id?: string; location?: string; amenity?: string }) => {
    const qs = new URLSearchParams();
    if (params?.listing_id) qs.set("listing_id", params.listing_id);
    if (params?.location) qs.set("location", params.location);
    if (params?.amenity) qs.set("amenity", params.amenity);
    const s = qs.toString();
    return req<unknown>(loadConfig().aiApiBase, `listings${s ? `?${s}` : ""}`);
  },

  /** POST /respondandrecommend — context-aware recommendations (requires auth). */
  recommend: (body: { query: string; sessionId?: string }) =>
    req<AiChatResponse>(loadConfig().aiApiBase, "respondandrecommend", {
      method: "POST",
      body,
      requireAuth: true,
    }),
};

/* ══════════════════════════════════════════════════════════
   Viewing Bookings
══════════════════════════════════════════════════════════ */
export type ViewingBooking = {
  id: string;
  listingId: string;
  customerId: string;
  preferredDate: string;
  preferredTime: string;
  viewingType: string;
  status: string;
  notes?: string;
  ownerNotes?: string;
  meetingLink?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
  listingTitle?: string;
  listingCode?: string;
  [key: string]: unknown;
};

export const bookingApi = {
  create: (body: {
    listingId: string; customerId: string; preferredDate: string;
    preferredTime?: string; viewingType?: string; notes?: string; contactPhone?: string;
  }) => req<ViewingBooking>(loadConfig().propertyApiBase, "bookings", { method: "POST", body, requireAuth: true }),

  getById: (id: string) =>
    req<ViewingBooking>(loadConfig().propertyApiBase, `bookings/${id}`, { requireAuth: true }),

  getByCustomer: (customerId: string) =>
    req<ViewingBooking[]>(loadConfig().propertyApiBase, `bookings/customer/${customerId}`, { requireAuth: true }),

  cancel: (id: string, ownerNotes?: string) =>
    req<ViewingBooking>(loadConfig().propertyApiBase, `bookings/${id}/cancel`,
      { method: "PATCH", body: { ownerNotes }, requireAuth: true }),
};

/* ══════════════════════════════════════════════════════════
   Tenant Applications
══════════════════════════════════════════════════════════ */
export type TenantApplication = {
  id: string;
  listingId: string;
  customerId: string;
  viewingBookingId?: string;
  status: string;
  rejectionReason?: string;
  reviewedAt?: string;
  termsAcceptedAt?: string;
  digitalSignatureUrl?: string;
  createdAt: string;
  updatedAt: string;
  documents?: ApplicationDoc[];
  payments?: RentalPayment[];
  listing?: { id: string; title?: string; listingCode?: string; price?: number; priceCurrency?: string };
  customer?: { id: string; name?: string; email?: string; phone?: string };
  [key: string]: unknown;
};

export type ApplicationDoc = {
  id: string;
  documentType: string;
  fileUrl: string;
  fileName?: string;
  uploadedAt: string;
};

export type RentalPayment = {
  id: string;
  paymentType: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  mpesaReceiptNumber?: string;
  reference?: string;
  initiatedAt: string;
  confirmedAt?: string;
  [key: string]: unknown;
};

export const applicationApi = {
  create: (body: { listingId: string; customerId: string; viewingBookingId?: string }) =>
    req<TenantApplication>(loadConfig().propertyApiBase, "applications",
      { method: "POST", body, requireAuth: true }),

  getById: (id: string) =>
    req<TenantApplication>(loadConfig().propertyApiBase, `applications/${id}`, { requireAuth: true }),

  getByCustomer: (customerId: string) =>
    req<TenantApplication[]>(loadConfig().propertyApiBase, `applications/customer/${customerId}`, { requireAuth: true }),

  addDocument: (id: string, body: { documentType: string; fileUrl: string; fileName?: string }) =>
    req<ApplicationDoc>(loadConfig().propertyApiBase, `applications/${id}/documents`,
      { method: "POST", body, requireAuth: true }),

  submit: (id: string) =>
    req<TenantApplication>(loadConfig().propertyApiBase, `applications/${id}/submit`,
      { method: "PATCH", requireAuth: true }),

  acceptTerms: (id: string, signatureUrl?: string) =>
    req<TenantApplication>(loadConfig().propertyApiBase, `applications/${id}/accept-terms`,
      { method: "PATCH", body: { signatureUrl }, requireAuth: true }),

  cancel: (id: string) =>
    req<TenantApplication>(loadConfig().propertyApiBase, `applications/${id}/cancel`,
      { method: "PATCH", requireAuth: true }),
};

/* ══════════════════════════════════════════════════════════
   Property Terms
══════════════════════════════════════════════════════════ */
export type PropertyTerms = {
  id: string;
  listingId: string;
  title: string;
  termsContent?: string;
  houseRules?: string;
  paymentTerms?: string;
  noticePeriod?: string;
  petPolicy?: string;
  maintenancePolicy?: string;
  securityDepositTerms?: string;
  securityDeposit?: number;
  adminFee?: number;
  currency?: string;
  mpesaPaybill?: string;
  mpesaTill?: string;
  mpesaAccountNumber?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  paymentInstructions?: string;
  onboardingInstructions?: string;
  accessInstructions?: string;
  itemsToCarry?: string;
  isActive: boolean;
  [key: string]: unknown;
};

export const termsApi = {
  getByListing: (listingId: string) =>
    req<PropertyTerms>(loadConfig().propertyApiBase, `listings/${listingId}/terms`),
};

/* ══════════════════════════════════════════════════════════
   Payments
══════════════════════════════════════════════════════════ */
export type PaymentInitiateResult = {
  id: string;
  applicationId: string;
  paymentType: string;
  amount: number;
  currency: string;
  method: string;
  status: string;
  mpesaCheckoutRequestId?: string;
  phoneNumber?: string;
  initiatedAt: string;
  bankInstructions?: {
    bankName?: string; bankAccountName?: string; bankAccountNumber?: string;
    bankBranch?: string; paymentInstructions?: string; reference?: string;
  };
  mpesaInstructions?: {
    mpesaPaybill?: string; mpesaTill?: string; mpesaAccountNumber?: string; paymentInstructions?: string;
  };
  [key: string]: unknown;
};

export const paymentApi = {
  initiate: (applicationId: string, body: {
    method: string; phoneNumber?: string; paymentType?: string; amount?: number;
  }) => req<PaymentInitiateResult>(loadConfig().propertyApiBase,
    `applications/${applicationId}/payment/initiate`,
    { method: "POST", body, requireAuth: true }),

  getStatus: (applicationId: string) =>
    req<RentalPayment[]>(loadConfig().propertyApiBase,
      `applications/${applicationId}/payment/status`, { requireAuth: true }),

  getOnboarding: (applicationId: string) =>
    req<Record<string, unknown>>(loadConfig().propertyApiBase,
      `applications/${applicationId}/onboarding`, { requireAuth: true }),
};

/* ══════════════════════════════════════════════════════════
   Static data (categories / subcategories)
══════════════════════════════════════════════════════════ */
export type CategoryOption = { id: string; name: string; slug?: string };
export type SubcategoryOption = { id: string; name: string; categoryId?: string; slug?: string };

export const staticApi = {
  categories: () => req<CategoryOption[]>(loadConfig().staticApiBase, "categories"),
  subcategoriesByCategory: (categoryId: string) =>
    req<SubcategoryOption[]>(loadConfig().staticApiBase, `subcategories/category/${categoryId}`),
};

/* ══════════════════════════════════════════════════════════
   Cloudflare upload helper (reused for document uploads)
══════════════════════════════════════════════════════════ */
export async function uploadFileToCloudflare(uploadUrl: string, file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(uploadUrl, { method: "POST", body: form });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  const data = await res.json() as { result?: { variants?: string[] } };
  const variants = data.result?.variants ?? [];
  return variants.find((v) => v.endsWith("/public")) ?? variants[0] ?? "";
}

/** Best-effort extraction of an AI reply string from a varied response shape. */
export function extractAiReply(data: AiChatResponse | undefined): string {
  if (!data) return "";
  return (
    data.reply ??
    data.message ??
    data.response ??
    (typeof data === "string" ? data : "")
  ) as string;
}
