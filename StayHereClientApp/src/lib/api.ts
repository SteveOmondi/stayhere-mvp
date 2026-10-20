import { loadConfig } from "./config";

export class ApiError extends Error {
  status: number;
  body: string;
  constructor(status: number, body: string | undefined) {
    const safeBody = body ?? "(no response body)";
    super(`HTTP ${status}: ${safeBody.slice(0, 300)}`);
    this.status = status;
    this.body = safeBody;
  }

  /** A short, user-facing message safe to render directly — prefers a clear explanation for
   * common statuses over the raw backend response, which can be empty, plain-text "Forbidden",
   * or a stringified JSON blob never meant for display. */
  get userMessage(): string {
    if (this.status === 403) {
      return "You don't have permission to access this functionality.";
    }
    if (this.status === 401) {
      return "You need to sign in to do that.";
    }
    if (!this.body || this.body === "(no response body)") {
      return "Something went wrong. Please try again.";
    }
    return this.body;
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
    // parsed is undefined for a genuinely empty error body (e.g. a proxy/network failure that
    // never reached the real API) - JSON.stringify(undefined) returns the literal `undefined`
    // value, not a string, so that case needs its own fallback rather than trusting stringify.
    // Every backend error body is JSON `{ error: "..." }` (see AuthenticationMiddleware /
    // CreateErrorResponse helpers) - surface that plain message instead of a raw JSON blob.
    const errorField = parsed && typeof parsed === "object" && typeof (parsed as Record<string, unknown>).error === "string"
      ? (parsed as Record<string, unknown>).error as string
      : undefined;
    const bodyStr = errorField ?? (typeof parsed === "string" ? parsed : parsed === undefined ? "" : JSON.stringify(parsed));
    throw new ApiError(res.status, bodyStr);
  }
  return parsed as T;
}

/* ══════════════════════════════════════════════════════════
   Floor plan (2D/3D/3D-Live) — optional, absent on listings with no floor plan
══════════════════════════════════════════════════════════ */
export type ListingFloorPlanRoomDto = { id: string; label: string; points: [number, number][] };
export type ListingFloorPlanOpeningDto = {
  id: string;
  from: [number, number];
  to: [number, number];
  position: number;
  widthMeters: number;
  type: "door" | "window";
};
export type ListingFloorPlanHotspotDto = { id: string; roomId: string; label: string; order: number };
export type ListingFloorPlanLayoutItemDto = { catalogId: string; roomId: string; position: [number, number, number]; rotationY: number };
export type ListingFloorPlanDto = {
  rooms: ListingFloorPlanRoomDto[];
  openings: ListingFloorPlanOpeningDto[];
  metersPerPixel: number;
  sourceFileKey: string;
  sourceFileType: string;
  digitizedAt: string;
  digitizedByRole: string;
  aiProvider?: string;
  hotspots?: ListingFloorPlanHotspotDto[];
  allowedCatalogIds?: string[];
  defaultLayout?: ListingFloorPlanLayoutItemDto[];
};

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
  /** Only present when listingType is Sale ("CompleteTurnkey"/"OffPlanUnderConstruction") or
   * Rent ("LongTermLease"/"ShortTermServicedVacation") - absent for ShortStay/Lease listings. */
  tenure?: string;
  bedrooms?: number;
  bathrooms?: number;
  sizeSqft?: number;
  floor?: number | string;
  yearBuilt?: number;
  amenities?: string[];
  images?: string[];
  primaryImageUrl?: string | null;
  floorPlan?: ListingFloorPlanDto | null;
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
  /** Free-text search box input, e.g. "two bedroom with a swimming pool in westlands" — the backend
   * parses bedrooms/amenities/location out of this via ListingQueryIntentExtractor. */
  query?: string;
  location?: string;
  city?: string;
  propertyTypes?: string[];
  listingType?: string;
  tenure?: string;
  minPrice?: number;
  maxPrice?: number;
  /** UI filter state (single "at least N"); translated to the server's `minBedrooms` field before sending. */
  bedrooms?: number;
  minBedrooms?: number;
  /** UI filter state; translated to the server's comma-separated `amenity` field before sending. */
  amenities?: string[];
  amenity?: string;
  sortBy?: string;
  categoryId?: string;
  subcategoryId?: string;
  page?: number;
  pageSize?: number;
  [key: string]: unknown;
};

/**
 * Every listings endpoint (getById, available, featured, search, ...) returns the backend's
 * `ListingResponseDto` shape, which nests most fields under sub-objects instead of putting them
 * flat on the listing: `pricing.price`, `unit.bedrooms/bathrooms/sizeSqft/propertyType/...`,
 * `owner`/`agent`/`caretaker` (each `{id, name, phone, email}`), `category`/`subcategory` (each
 * `{id, name}`), and `images` as a structured `{primary, exterior, livingRoom, ...}` object (used
 * by the owner portal's per-room image editor) rather than a flat string[]. The flat legacy
 * `ListingDto` shape this app's `Listing` type was originally written against isn't actually
 * returned by any current endpoint. Flatten all of it here so the rest of the app can keep
 * treating every `Listing` the same way regardless of which endpoint it came from.
 */
function normalizeListing(raw: Listing): Listing {
  const r = raw as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  const pricing = r.pricing as Record<string, unknown> | undefined;
  if (pricing) {
    if (raw.price == null && typeof pricing.price === "number") patch.price = pricing.price;
    if (typeof pricing.currency === "string") patch.priceCurrency = pricing.currency;
  }

  const unit = r.unit as Record<string, unknown> | undefined;
  if (unit) {
    for (const [from, to] of [
      ["bedrooms", "bedrooms"], ["bathrooms", "bathrooms"], ["sizeSqft", "sizeSqft"],
      ["propertyType", "propertyType"], ["listingType", "listingType"], ["tenure", "tenure"],
      ["floor", "floor"], ["yearBuilt", "yearBuilt"], ["isFurnished", "isFurnished"],
    ] as const) {
      if (raw[to] == null && unit[from] != null) patch[to] = unit[from];
    }
  }

  const property = r.property as Record<string, unknown> | undefined;
  if (property) {
    if (raw.yearBuilt == null && typeof property.yearBuilt === "number") patch.yearBuilt = property.yearBuilt;
    if (typeof property.buildingName === "string") patch.buildingName = property.buildingName;
  }

  for (const [key, target] of [["owner", "ownerId"], ["agent", "agentId"], ["caretaker", "caretakerId"]] as const) {
    const obj = r[key] as Record<string, unknown> | undefined;
    if (obj?.id && raw[target] == null) patch[target] = obj.id;
  }

  for (const [key, target] of [["category", "categoryName"], ["subcategory", "subcategoryName"]] as const) {
    const obj = r[key] as Record<string, unknown> | undefined;
    if (obj) {
      if (typeof obj.id === "string" && raw[`${key}Id`] == null) patch[`${key}Id`] = obj.id;
      if (typeof obj.name === "string" && raw[target] == null) patch[target] = obj.name;
    }
  }

  const rawImages = raw.images as unknown;
  if (rawImages && !Array.isArray(rawImages)) {
    const structured = rawImages as Record<string, unknown>;
    const flat: string[] = [];
    const primary = typeof structured.primary === "string" ? structured.primary : undefined;
    if (primary) flat.push(primary);
    for (const key of ["exterior", "livingRoom", "kitchen", "diningArea", "bedroom", "bathroom", "balcony", "other"]) {
      const section = structured[key];
      if (Array.isArray(section)) for (const url of section) if (typeof url === "string" && !flat.includes(url)) flat.push(url);
    }
    patch.images = flat;
    patch.primaryImageUrl = raw.primaryImageUrl ?? primary ?? null;
  }

  return Object.keys(patch).length ? { ...raw, ...patch } : raw;
}

/**
 * Normalize a listings response (array OR paged envelope) to Listing[].
 * Every listing endpoint (available/featured/search/getById/...) actually returns the backend's
 * nested `ListingResponseDto` shape (pricing/unit/property/owner/images all as sub-objects) - the
 * flat legacy `ListingDto` shape this app's `Listing` type is written against isn't returned by any
 * current endpoint. `normalizeListing` is run here so every caller gets flat fields regardless of
 * which endpoint the data came from.
 */
export function asListingArray(data: unknown): Listing[] {
  if (Array.isArray(data)) return (data as Listing[]).map(normalizeListing);
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    for (const key of ["items", "data", "listings", "results"]) {
      if (Array.isArray(obj[key])) return (obj[key] as Listing[]).map(normalizeListing);
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
    req<{ succeeded?: boolean; message?: string; otp?: string }>(
      loadConfig().authApiBase, "login", { method: "POST", body }
    ),

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

  /** GET /auth/profiles/{userId} — the one endpoint any signed-in user can call for their OWN
   * name/phone (bare auth, no role check), reliably keyed by the JWT user id. `customerProfile`
   * in AppContext is NOT a reliable source for this - nothing in the app ever populates it, so it
   * stays null forever. Returns one entry per role the user has (Tenant/PropertyOwner); a tenant
   * normally has exactly one. */
  getProfiles: (userId: string) =>
    req<{ profileId: string; role: string; displayName: string; phone?: string }[]>(
      loadConfig().authApiBase, `profiles/${userId}`, { requireAuth: true }
    ),
};

/* ══════════════════════════════════════════════════════════
   Listings Service (Property API)
══════════════════════════════════════════════════════════ */
export const listingsApi = {
  getAll: (page = 1, pageSize = 20) =>
    req<unknown>(loadConfig().propertyApiBase, `listings?page=${page}&pageSize=${pageSize}`),
  getById: (id: string) =>
    req<Listing>(loadConfig().propertyApiBase, `listings/${id}`).then(normalizeListing),
  /** listingCode doubles as a short, unique, human-shareable slug for /l/:code share links -
   * already unique per listing and far shorter than the full listing GUID. */
  getByCode: (code: string) =>
    req<Listing>(loadConfig().propertyApiBase, `listings/code/${encodeURIComponent(code)}`).then(normalizeListing),
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
/** A rich content block Sage attaches to a reply — a listing carousel, nearby-places list, or a
 * next-step CTA. `data` is intentionally untyped here; each `type` gets its own narrow read at the
 * render site (see SagePage.tsx) rather than a shared shape, since the three kinds don't overlap. */
export type AiAttachment = { type: "listings" | "nearbyPlaces" | "nextStep"; data: Record<string, unknown> };

export type AiChatResponse = {
  reply?: string;
  message?: string;
  response?: string;
  /** NOTE: field name must match the backend's AgentChatResponse.ConversationId exactly
   * (camelCase `conversationId`) — this was previously mismatched as `sessionId` client-side,
   * which silently broke multi-turn memory (every message started a fresh conversation). */
  conversationId?: string;
  results?: unknown[];
  recommendations?: unknown[];
  attachments?: AiAttachment[];
  [key: string]: unknown;
};

export type AiConversationSummary = { id: string; preview?: string; createdAt: string; updatedAt: string };
export type AiConversationMessage = { role: "user" | "assistant"; content: string; timestamp: string };
export type AiConversationDetail = {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: AiConversationMessage[];
};

export const aiApi = {
  /** POST /chat — natural language conversation (requires auth). */
  chat: (body: { query: string; conversationId?: string }) =>
    req<AiChatResponse>(loadConfig().aiApiBase, "chat", { method: "POST", body, requireAuth: true }),

  /** GET /conversations — the signed-in user's own past Sage chats, newest first. */
  listConversations: () =>
    req<AiConversationSummary[]>(loadConfig().aiApiBase, "conversations", { requireAuth: true }),

  /** GET /conversations/{id} — full replayable history for one of the user's own chats. */
  getConversation: (id: string) =>
    req<AiConversationDetail>(loadConfig().aiApiBase, `conversations/${id}`, { requireAuth: true }),

  /**
   * GET /listings — AI-powered listing search. The AI agent's DTO is minimal
   * ({ listingId, listingCode, title, propertyType, location, price, amenities } - no
   * `id`, images, bedrooms, etc.), unlike every other listings endpoint. Map `listingId`
   * to `id` here so callers can treat the result as a normal Listing[] (React keys,
   * navigation links) without every card silently keying off `undefined`.
   */
  searchListings: (params?: { listing_id?: string; location?: string; amenity?: string }) => {
    const qs = new URLSearchParams();
    if (params?.listing_id) qs.set("listing_id", params.listing_id);
    if (params?.location) qs.set("location", params.location);
    if (params?.amenity) qs.set("amenity", params.amenity);
    const s = qs.toString();
    return req<Record<string, unknown>>(loadConfig().aiApiBase, `listings${s ? `?${s}` : ""}`).then((data) => {
      const rawItems = Array.isArray(data?.listings) ? (data.listings as Record<string, unknown>[]) : [];
      return { listings: rawItems.map((item) => ({ ...item, id: item.listingId })) };
    });
  },

  /** POST /respondandrecommend — context-aware recommendations (requires auth). */
  recommend: (body: { query: string; conversationId?: string }) =>
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
  listingImageUrl?: string;
  listingPrice?: number;
  listingCurrency?: string;
  listingLocation?: string;
  [key: string]: unknown;
};

export const bookingApi = {
  create: (body: {
    listingId: string; customerId: string; viewingDate: string;
    viewingTime?: string; viewingType?: string; notes?: string; contactPhone?: string;
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
   Saved listings (favorites) — server-backed so the "Saved" page and Sage
   always agree on what's saved, instead of living only in this browser's
   localStorage.
══════════════════════════════════════════════════════════ */
export type SavedListing = {
  id: string;
  listingId: string;
  listingCode?: string;
  title: string;
  imageUrl?: string;
  price: number;
  currency: string;
  location?: string;
  bedrooms: number;
  bathrooms: number;
  availabilityStatus: string;
  savedAt: string;
};

export const savedListingsApi = {
  list: () => req<SavedListing[]>(loadConfig().customerApiBase, "saved-listings", { requireAuth: true }),

  save: (listingId: string) =>
    req<SavedListing>(loadConfig().customerApiBase, "saved-listings",
      { method: "POST", body: { listingId }, requireAuth: true }),

  unsave: (listingId: string) =>
    req<{ success: boolean }>(loadConfig().customerApiBase, `saved-listings/${listingId}`,
      { method: "DELETE", requireAuth: true }),
};

/* ══════════════════════════════════════════════════════════
   Enquiries — the only channel a customer and a listing's owner ever talk
   through. No endpoint here ever returns a phone number or email for either
   side - all communication happens as in-app messages instead.
══════════════════════════════════════════════════════════ */
export type EnquirySummary = {
  id: string;
  listingId: string;
  status: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadCount: number;
  listingTitle?: string;
  listingCode?: string;
  listingImageUrl?: string;
  listingPrice?: number;
  listingCurrency?: string;
  listingLocation?: string;
};

export type EnquiryMessage = {
  id: string;
  enquiryId: string;
  senderRole: "Customer" | "Owner";
  body: string;
  createdAt: string;
};

export const enquiryApi = {
  create: (listingId: string) =>
    req<EnquirySummary>(loadConfig().propertyApiBase, "enquiries", { method: "POST", body: { listingId }, requireAuth: true }),

  mine: () => req<EnquirySummary[]>(loadConfig().propertyApiBase, "enquiries/mine", { requireAuth: true }),

  getMessages: (id: string, after?: string) =>
    req<EnquiryMessage[]>(loadConfig().propertyApiBase,
      `enquiries/${id}/messages${after ? `?after=${encodeURIComponent(after)}` : ""}`,
      { requireAuth: true }),

  sendMessage: (id: string, body: string) =>
    req<EnquiryMessage>(loadConfig().propertyApiBase, `enquiries/${id}/messages`,
      { method: "POST", body: { body }, requireAuth: true }),

  markRead: (id: string) =>
    req<{ success: boolean }>(loadConfig().propertyApiBase, `enquiries/${id}/read`,
      { method: "PATCH", requireAuth: true }),
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
  /** Human-readable status, server-computed - prefer this for display over hand-mapping `status`. */
  statusLabel?: string;
  rejectionReason?: string;
  reviewedAt?: string;
  termsAcceptedAt?: string;
  digitalSignatureUrl?: string;
  createdAt: string;
  updatedAt: string;
  documents?: ApplicationDoc[];
  payments?: RentalPayment[];
  /** Flat fields, NOT nested under a "listing" object - that's what GetApplicationsByCustomer's
   * ToDetailDto actually serializes (confirmed against ApplicationFunctions.cs). No price/image
   * is returned here at all, so the UI fetches the full Listing separately when it needs those. */
  listingTitle?: string;
  listingCode?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
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

  getByCustomer: (customerId: string, page = 1, pageSize = 20) =>
    req<{ items: TenantApplication[]; totalCount: number; page: number; pageSize: number; totalPages: number }>(
      loadConfig().propertyApiBase, `applications/customer/${customerId}?page=${page}&pageSize=${pageSize}`,
      { requireAuth: true },
    ),

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
/** Matches StkPushFunctions.InitiateStkPush's actual response shape exactly (StayHere.PaymentsService) -
 * the previous shape here (`id`/`mpesaCheckoutRequestId`/`method`/`bankInstructions`/...) was
 * never what the backend returns; it was aspirational and never matched reality. */
export type PaymentInitiateResult = {
  paymentId: string;
  checkoutRequestId?: string;
  merchantRequestId?: string;
  transactionSource?: string;
  status: string;
  amount: number;
  currency: string;
  phoneNumber?: string;
  initiatedAt: string;
  [key: string]: unknown;
};

/** PaymentsService's own HttpTrigger routes are all internally prefixed with "payments/" (e.g.
 * Route = "payments/mpesa/stk/initiate") - same situation as authApi/"auth/" below. paymentsApiBase
 * already contributes the "/payments" segment (either as the dev-proxy path or the APIM operation
 * path), so these relative paths must NOT repeat it - doing so either double-strips in the local
 * dev proxy (reaching nothing real) or produces a literal "payments/payments/..." path against
 * APIM in production. */
export const paymentApi = {
  /** POST .../mpesa/stk/initiate (NOT propertyApiBase/applications/.../payment/initiate - that
   * route was removed when M-Pesa endpoints moved to their own function app; PropertyService's
   * PaymentFunctions.cs docstring says so explicitly). Only ever called for the Mpesa path - bank
   * transfer goes through handleBankTransferDone instead, so no `method` field is needed here. */
  initiate: (applicationId: string, body: {
    phoneNumber: string; paymentType?: string; amount?: number;
  }) => req<PaymentInitiateResult>(loadConfig().paymentsApiBase,
    "mpesa/stk/initiate",
    { method: "POST", body: { applicationId, ...body }, requireAuth: true }),

  /** Same endpoint as `initiate`, for the short-stay booking fee instead of a lease application -
   * the backend requires exactly one of applicationId/shortStayBookingId in the body. */
  initiateForBooking: (shortStayBookingId: string, body: { phoneNumber: string; amount?: number }) =>
    req<PaymentInitiateResult>(loadConfig().paymentsApiBase,
      "mpesa/stk/initiate",
      { method: "POST", body: { shortStayBookingId, ...body }, requireAuth: true }),

  /** GET .../application/{id} (PaymentQueryFunctions.GetByApplication). */
  getStatus: (applicationId: string) =>
    req<RentalPayment[]>(loadConfig().paymentsApiBase,
      `application/${applicationId}`, { requireAuth: true }),

  getOnboarding: (applicationId: string) =>
    req<Record<string, unknown>>(loadConfig().propertyApiBase,
      `applications/${applicationId}/onboarding`, { requireAuth: true }),

  /** GET .../mpesa/stk/query/{checkoutRequestId} (StkPushFunctions.QueryStkStatus) - actively
   * asks Safaricom for the transaction's status and self-heals our local record from it. This is
   * the fallback for when the STK callback never arrives at all (confirmed in practice: Safaricom's
   * sandbox can simply never call back even though the underlying transaction succeeded) - call
   * this instead of just re-reading our own (possibly permanently stale) DB row. */
  queryStkStatus: (checkoutRequestId: string) =>
    req<StkQueryStatusResult>(loadConfig().paymentsApiBase,
      `mpesa/stk/query/${checkoutRequestId}`, { requireAuth: true }),
};

export type StkQueryStatusResult = {
  checkoutRequestId: string;
  safaricom: { resultCode: string; resultDesc: string; isSuccess: boolean; isPending: boolean };
  localRecord: {
    id: string; status: string; amount: number; phoneNumber?: string;
    initiatedAt: string; confirmedAt?: string; applicationId?: string; shortStayBookingId?: string;
  } | null;
};

/* ══════════════════════════════════════════════════════════
   Short-Stay Bookings — a deliberately lighter sibling of applicationApi/TenantApplication:
   pick dates off a calendar, give minimal guest info, pay a flat booking fee (half of one
   night's listing price), then verify ID - in that order, not before paying.
══════════════════════════════════════════════════════════ */
export type ShortStayBookingDoc = { id: string; documentType: string; fileUrl: string; fileName?: string; uploadedAt: string };

export type ShortStayBooking = {
  id: string;
  listingId: string;
  customerId: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  numberOfGuests: number;
  specialRequests?: string;
  bookingFeeAmount: number;
  currency: string;
  status: "PendingPayment" | "Confirmed" | "Cancelled" | "Completed";
  cancellationReason?: string;
  documentsSubmittedAt?: string;
  createdAt: string;
  updatedAt: string;
  confirmedAt?: string;
  listingTitle?: string;
  listingCode?: string;
  listingPrice?: number;
  documents?: ShortStayBookingDoc[];
  payments?: RentalPayment[];
  [key: string]: unknown;
};

export type BlockedDateRange = { checkInDate: string; checkOutDate: string };

export const shortStayApi = {
  getAvailability: (listingId: string) =>
    req<{ listingId: string; blockedRanges: BlockedDateRange[] }>(
      loadConfig().propertyApiBase, `listings/${listingId}/availability`
    ),

  create: (body: {
    listingId: string; customerId: string; checkInDate: string; checkOutDate: string;
    guestName: string; guestPhone: string; guestEmail: string; numberOfGuests: number;
    specialRequests?: string;
  }) => req<ShortStayBooking>(loadConfig().propertyApiBase, "short-stay-bookings",
    { method: "POST", body, requireAuth: true }),

  getById: (id: string) =>
    req<ShortStayBooking>(loadConfig().propertyApiBase, `short-stay-bookings/${id}`, { requireAuth: true }),

  getByCustomer: (customerId: string, page = 1, pageSize = 20) =>
    req<{ items: ShortStayBooking[]; totalCount: number; page: number; pageSize: number; totalPages: number }>(
      loadConfig().propertyApiBase, `short-stay-bookings/customer/${customerId}?page=${page}&pageSize=${pageSize}`,
      { requireAuth: true },
    ),

  cancel: (id: string, reason?: string) =>
    req<ShortStayBooking>(loadConfig().propertyApiBase, `short-stay-bookings/${id}/cancel`,
      { method: "PATCH", body: { reason }, requireAuth: true }),

  addDocument: (id: string, body: { documentType: string; fileUrl: string; fileName?: string }) =>
    req<ShortStayBookingDoc>(loadConfig().propertyApiBase, `short-stay-bookings/${id}/documents`,
      { method: "POST", body, requireAuth: true }),
};

/* ══════════════════════════════════════════════════════════
   Static data (categories / subcategories)
══════════════════════════════════════════════════════════ */
export type CategoryOption = { id: string; name: string; slug?: string };
export type SubcategoryOption = { id: string; name: string; categoryId?: string; slug?: string };

export type FurnitureCatalogItemDto = {
  id: string;
  name: string;
  category: string;
  footprint: [number, number];
  height: number;
  color: string;
  icon: string;
  vendorName?: string | null;
  vendorLogoUrl?: string | null;
  price?: number | null;
  currency?: string | null;
  productUrl?: string | null;
  sku?: string | null;
};

export const staticApi = {
  categories: () => req<CategoryOption[]>(loadConfig().staticApiBase, "categories"),
  subcategoriesByCategory: (categoryId: string) =>
    req<SubcategoryOption[]>(loadConfig().staticApiBase, `subcategories/category/${categoryId}`),
  /** GET /furniture-catalog — furniture used to render 3D/3D-Live floor plans. */
  furnitureCatalog: () => req<FurnitureCatalogItemDto[]>(loadConfig().staticApiBase, "furniture-catalog"),
};

/* ══════════════════════════════════════════════════════════
   Cloudflare upload helper (reused for document uploads)
══════════════════════════════════════════════════════════ */
export async function uploadFileToR2(uploadUrl: string, file: File, contentType: string): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
}

/** Requests a presigned R2 URL for `file` and uploads it, returning the short public URL -
 * shared by RentalFlowPage's ID/selfie/signature uploads and ShortStayBookingPage's ID
 * verification step, so there's exactly one place that knows the presigned-upload contract. */
export async function uploadDocumentToR2(file: File, folder: string): Promise<string> {
  const uploadRes = await fetch(`/api/property/upload/presigned-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("sh_client_auth_token")}` },
    body: JSON.stringify({ folder, fileName: file.name, contentType: file.type }),
  });
  if (!uploadRes.ok) throw new Error("Could not get upload URL");
  const { uploadUrl, publicUrl, contentType } = await uploadRes.json() as { uploadUrl: string; publicUrl: string; contentType: string };
  await uploadFileToR2(uploadUrl, file, contentType);
  return publicUrl;
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
