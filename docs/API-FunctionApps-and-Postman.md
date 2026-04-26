# StayHere MVP — API overview, Postman collection, and where each call fits

This document describes **all HTTP Function Apps** in the solution as implemented today, how they relate to **client app / management portal / owner portal / agent flows**, and how to use the **Postman collection** in `postman/StayHere.postman_collection.json`.

---

## Postman collection

| Item | Location |
|------|----------|
| Collection | `postman/StayHere.postman_collection.json` |
| Regenerator script | `postman/generate_stayhere_collection.py` |

### Import

1. Postman → **Import** → select `StayHere.postman_collection.json`.
2. Open the collection **Variables** tab and set each `baseUrl_*` to match how you run each function host (must include the Functions **`/api`** prefix, e.g. `http://localhost:7057/api`).

### Collection variables (defaults are examples only)

| Variable | Typical use |
|----------|-------------|
| `baseUrl_AuthService` | **7100** — Auth + onboarding |
| `baseUrl_PropertyService` | **7101** — Properties & listings |
| `baseUrl_CustomerService` | **7102** — Customer / renter profile |
| `baseUrl_PropertyOwnerService` | **7103** — Owners, agents, caretakers, wallet |
| `baseUrl_StaticDataService` | **7104** — Categories & enums |
| `baseUrl_AiAgentService` | **7105** — AI chat & recommendations |

Start hosts with `scripts/Start-AllStayHereFunctionApps.ps1` or `scripts/Start-StayHereFunctionApp.ps1` (see `scripts/README.md`).

### Shared headers (as implemented in code)

| Header | Where | Purpose |
|--------|--------|---------|
| `Content-Type: application/json` | All POST/PUT/PATCH with body | JSON payloads |
| `X-User-Id: <guid>` | **PropertyService** when `SKIP_AUTH=true` in that app’s `local.settings.json` | Must be the **PropertyOwner** id (`owners.id`) tied to the property/listing — used as “caller” for create/update/delete |
| `Authorization: Bearer mock-jwt-token` | **StaticDataService** when `SKIP_AUTH` is **not** `true` | Unlocks admin category routes (`categories/all`, POST/PUT/DELETE `categories`) |

---

## End-to-end flows (conceptual)

1. **Renter / client app**  
   Optional: **AuthService** (signup → OTP login) → **StaticDataService** (categories, roles) → **PropertyService** (browse/search listings, detail, increment view) → **CustomerService** (create/update profile, attach interest to listing) → **AiAgentService** (chat, respond+recommend).

2. **Management / ops portal**  
   **StaticDataService** (maintain categories; auth per `SKIP_AUTH` or Bearer mock token) → **PropertyService** (moderation-style listing updates if you use service accounts with `X-User-Id`) → **CustomerService** (support: list customers, documents).

3. **Owner portal**  
   **AuthService** + **Onboarding** → **PropertyOwnerService** (create/link owner, wallet) → **PropertyService** (create property & listings with owner’s id in `X-User-Id`) → **PropertyOwnerService** (agents/caretakers) → **PropertyService** (assign agent/caretaker to listing).

4. **Agent portal / agent tools**  
   **PropertyOwnerService** (fetch agent record, owner’s listings) → **PropertyService** (listing read/search; assign agent if permitted) → **AiAgentService** (`respondandrecommend`, `listings` helper search, `chat`).

Below, each function app is broken down with **every HTTP route** and its **role** in the product.

---

## 1. AuthService

**Role:** User identity — registration, passwordless OTP login (email/SMS), optional Microsoft Entra login, profile discovery after auth, and **onboarding** (link auth user to a domain role/profile).

**Typical hosts:** Client app (signup/login), all portals after sign-in.

| Method | Route | Body / params | When to use |
|--------|-------|----------------|-------------|
| POST | `auth/signup` | `{ email, phoneNumber?, fullName, userType? }` | New user registration. |
| POST | `auth/login` | `{ email }` OR `{ phoneNumber }` OR `{ entraToken }` | Request OTP (empty 200) for email/phone; or Entra token login → JWT payload. |
| POST | `auth/verifyotp` | `{ target, code }` | Complete OTP login; returns token + user. |
| GET | `auth/profiles/{userId}` | Path: user id | After login, load which **profiles/roles** exist for navigation (owner vs customer, etc.). |
| POST | `auth/onboard` | `{ userId, role, fullName, phone, email }` | First-time setup: attach role profile after auth (e.g. become PropertyOwner in domain). |

---

## 2. PropertyService

**Role:** **Buildings (`properties`)** and **units (`listings`)** — CRUD, search, availability, ratings, views, featured flag, embeddings for AI search, assignment of **agent** and **caretaker** on a listing.

**Typical hosts:** Client app (read/search), owner portal (write with `X-User-Id`), management (read + controlled writes), agent app (read + assign self if business rules allow).

**Auth note:** With `SKIP_AUTH=true`, send **`X-User-Id`** = owning **PropertyOwner** guid for mutating routes.

### Properties

| Method | Route | Body / query | When to use |
|--------|-------|--------------|-------------|
| POST | `properties` | `CreatePropertyRequest` | Owner creates a new building. |
| GET | `properties/{id}` | — | Detail screen. |
| GET | `properties/code/{code}` | — | Lookup by human-readable property code. |
| GET | `properties` | `?page=&pageSize=` | Admin directory / pagination. |
| GET | `properties/owner/{ownerId}` | `?page=&pageSize=` | Owner dashboard: “my buildings”. |
| PUT | `properties/{id}` | `UpdatePropertyRequest` | Owner edits building. |
| DELETE | `properties/{id}` | — | Owner removes building (if allowed). |

### Listings

| Method | Route | Body / query | When to use |
|--------|-------|--------------|-------------|
| POST | `listings` | `CreateListingRequest` (includes `propertyId`, `owner`, optional `agent`) | Create unit not tied to nested URL. |
| POST | `properties/{propertyId}/listings` | `CreateListingFromPropertyRequest` | Add unit under known property. |
| GET | `listings/{id}` | — | Listing detail (client + portals). |
| GET | `listings/code/{code}` | — | Deep link by listing code. |
| GET | `listings` | `?page=&pageSize=` | Browse all. |
| GET | `listings/property/{propertyId}` | `?page=&pageSize=` | All units in one building. |
| GET | `listings/owner/{ownerId}` | `?page=&pageSize=` | Owner’s catalogue. |
| GET | `listings/city/{city}` | pagination | City browse. |
| GET | `listings/county/{county}` | pagination | County browse. |
| GET | `listings/by-location` | **`?location=`** required + pagination | Elastic-style location search (cached). |
| GET | `listings/type/{propertyType}` | pagination | Filter by domain `PropertyType` string (e.g. `Apartment`). |
| GET | `listings/listing-type/{listingType}` | pagination | e.g. `Rent` / `Sale`. |
| GET | `listings/featured` | `?limit=` | Home / marketing carousel. |
| GET | `listings/available` | pagination | Renters: in-stock units. |
| POST | `listings/search` | `ListingSearchRequest` JSON | Advanced filter search (client search page). |
| PUT | `listings/{id}` | `UpdateListingRequest` | Owner/agent edits unit. |
| POST | `listings/{id}/embedding` | empty body | Rebuild vector embedding (AI relevance); owner/admin. |
| PATCH | `listings/{id}/availability` | `{ availabilityStatus }` | Publish / unpublish / booked. |
| PATCH | `listings/{id}/rating` | `{ newRating }` | **0–5**; public or post-viewing rating update. |
| POST | `listings/{id}/view` | empty | Client increments view counter on detail open. |
| PATCH | `listings/{id}/featured` | `{ isFeatured }` | Management / marketing featured toggle. |
| POST | `listings/{id}/agent` | `AssignAgentRequest` | Link sales agent to listing. |
| DELETE | `listings/{id}/agent` | — | Remove agent. |
| POST | `listings/{id}/caretaker` | `AssignCaretakerRequest` | Link caretaker. |
| DELETE | `listings/{id}/caretaker` | — | Remove caretaker. |
| DELETE | `listings/{id}` | — | Owner deletes listing. |

---

## 3. CustomerService

**Role:** **Renter (customer)** CRM — profile, regional segmentation, linking to listings (interest / tenancy metadata), KYC **documents**.

**Typical hosts:** Client app (profile, saved homes), management (KYC review, deactivate), owner/agent (see leads per listing).

| Method | Route | When to use |
|--------|-------|-------------|
| POST | `customers` | Registration of renter profile. |
| GET | `customers/list` | Admin/support list. |
| GET | `customers/{id}` | Profile detail. |
| GET | `customers/by-phone/{phone}` | Lookup (URL-encode `+`). |
| GET | `customers/profile` | `?countryId=&cityId=` optional — segment renters. |
| GET | `listings/{listingId}/customers` | CRM: who engaged with a listing. |
| PUT | `customers/{id}` | Profile update. |
| POST | `customers/{id}/deactivate` | Soft off-boarding. |
| POST | `customers/{customerId}/properties` | Attach listing relationship (interest, etc.). |
| GET | `customers/{customerId}/properties` | “My saved / linked homes”. |
| POST | `customers/{customerId}/documents` | Upload metadata (`CreateDocumentRequest`; server forces `entityType=Customer`). |
| GET | `customers/{customerId}/documents` | List KYC docs. |

---

## 4. PropertyOwnerService

**Role:** **Landlord** accounts (independent of auth user optional link), **wallet**, **properties/listings rollups**, **agents** and **caretakers** employed by that owner.

**Typical hosts:** Owner portal; back-office linking owners to auth users; agent roster management.

| Method | Route | When to use |
|--------|-------|-------------|
| POST | `owners` | Register landlord + wallet bootstrap. |
| GET | `owners/{id}` | Owner profile. |
| GET | `owners/user/{userId}` | Resolve logged-in user → owner row. |
| GET | `owners/email/{email}` | Lookup by email (encode `@`). |
| PUT | `owners/{id}` | Update contacts. |
| GET | `owners/{ownerId}/wallet` | Balance / billing UI. |
| GET | `owners/{ownerId}/properties` | Owner’s buildings. |
| GET | `owners/{ownerId}/listings` | `?page=&pageSize=` — catalogue. |
| POST | `owners/{ownerId}/agents` | Hire agent contact. |
| GET | `agents/{id}` | Agent card. |
| GET | `owners/{ownerId}/agents` | Roster. |
| POST | `owners/{ownerId}/caretakers` | Add caretaker. |
| GET | `caretakers/{id}` | Caretaker card. |
| GET | `owners/{ownerId}/caretakers` | Roster. |
| GET | `owners` | `?page=&pageSize=` — admin directory of owners. |

---

## 5. StaticDataService

**Role:** **Reference data** — active categories for UI filters, **all** categories for admin, **user type** and **user role** enum names for signup/onboarding screens.

**Typical hosts:** All apps at startup or settings screens; management for category CRUD.

| Method | Route | Auth | When to use |
|--------|-------|------|-------------|
| GET | `categories` | — | Public: active categories. |
| GET | `user-types` | — | Populate signup types. |
| GET | `user-roles` | — | Populate role pickers. |
| GET | `categories/all` | Bearer mock **or** `SKIP_AUTH=true` | Admin: include inactive. |
| GET | `categories/{id}` | — | Edit form prefetch. |
| GET | `categories/city/{city}` | — | City-scoped taxonomy. |
| GET | `categories/country/{country}` | — | Country-scoped taxonomy. |
| POST | `categories` | Bearer / skip | Create category. |
| PUT | `categories/{id}` | Bearer / skip | Update category. |
| DELETE | `categories/{id}` | Bearer / skip | Delete category. |

---

## 6. AiAgentService

**Role:** **Conversational AI** (knowledge + OpenRouter), **listing recommendations** (embeddings + intent), **knowledge pipeline status**, **lightweight listing search** for the agent UI, **health**.

**Typical hosts:** Client “Ask StayHere” / search copilot; agent mobile/web assistant; ops monitoring (`knowledge/status`, `health`).

| Method | Route | Body / query | When to use |
|--------|-------|--------------|-------------|
| POST | `chat` | `AgentChatRequest`: `query`, `conversationId?`, `maxTokens`, `temperature` | General Q&A with KB + history. |
| POST | `respondandrecommend` | `AgentRecommendRequest`: `query`, `conversationId?`, `maxResults`, `temperature` | Natural-language search + ranked listings + narrative message. |
| GET | `knowledge/status` | — | Ops: KB loaded? |
| GET | `listings` | `listing_id`, `listing_code`, `location`, `amenity` (query params, snake_case) | Thin search helper for agent tools. |
| GET | `health` | — | Liveness. |

---

## Solution map (projects under `src/FunctionApps`)

| Project | Primary consumers |
|---------|-------------------|
| `StayHere.AuthService` | Everyone (identity) |
| `StayHere.PropertyService` | Client discovery + owner/management listing ops |
| `StayHere.CustomerService` | Client renter profile + admin CRM |
| `StayHere.PropertyOwnerService` | Owner portal + agent/caretaker directory |
| `StayHere.StaticDataService` | All frontends + admin taxonomy |
| `StayHere.AiAgentService` | Client + agent intelligent search/chat |

---

## Regenerating the Postman file

After adding new HTTP functions, update `postman/generate_stayhere_collection.py` and run:

```bash
python postman/generate_stayhere_collection.py
```

---

## Limitations (as of this codebase snapshot)

- **Authorization** is mostly **anonymous** at the Functions trigger level; real JWT validation and role-based routing are not uniformly enforced on every app — **PropertyService** dev mode relies on **`X-User-Id`** when `SKIP_AUTH=true`.
- **Ports** are not centralized; each developer’s `func start --port` + Postman variables must align.
- **CustomerService** `GetCustomersByRegion` expects `countryId` / `cityId` as **GUIDs** referencing your category/geo schema — align with your DB seeds.

This document and the collection reflect the **routes and bodies wired in the Function trigger code** at generation time; if handlers change, re-run the generator and update this file.
