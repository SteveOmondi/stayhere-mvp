# StayHere Mobile App — Implementation Guide
### Tenant-Facing Mobile Application (iOS & Android)

> **How to use this guide:** Read it screen by screen, top to bottom. Each section gives you the visual layout, the exact API calls required, the request body, and the expected response. Build each screen in order — they depend on each other.

---

## Quick Reference: Production API Base URLs

| Service | Base URL | What it handles |
|---------|----------|----------------|
| **Auth** | `https://apim-dev-5c27bcf3.azure-api.net/auth` | Login, OTP, Sign Up |
| **Property** | `https://apim-dev-5c27bcf3.azure-api.net/property` | Listings, Bookings, Applications, Payments, Terms, Upload |
| **Customer** | `https://apim-dev-5c27bcf3.azure-api.net/customers` | Tenant profile, Documents, Properties |
| **AI Agent** | `https://apim-dev-5c27bcf3.azure-api.net/aiagent` | Sage AI chat, Semantic search |
| **Static Data** | `https://apim-dev-5c27bcf3.azure-api.net/staticdata` | Categories, lookup lists |

### Authentication Header
All protected endpoints require this header:
```
Authorization: Bearer <JWT_TOKEN>
```
The token is obtained from the OTP verify step and stored securely on the device (Keychain on iOS, Keystore on Android). Every API call after login must include it.

---

## How Tokens Work (Important — Read First)

```
User enters email/phone
        ↓
POST /auth/login   ← no token needed
        ↓
User receives OTP (SMS or email)
        ↓
POST /auth/verifyotp   ← no token needed
        ↓
Response returns { token, user }
        ↓
Store token securely on device
        ↓
All future requests → Authorization: Bearer <token>
```

---

---

# SCREEN 1 — Splash / Onboarding

**Purpose:** First-time experience. No API calls here. Show branding, key value props, then route to Sign Up or Login.

```
┌─────────────────────────┐
│                         │
│                         │
│    ███████╗████████╗    │
│    ╚══███╔╝╚══██╔══╝    │
│      ███╔╝    ██║       │
│     ███╔╝     ██║       │
│    ███████╗   ██║       │
│    ╚══════╝   ╚═╝       │
│                         │
│       StayHere          │
│  Kenya's #1 Real Estate │
│       Platform          │
│                         │
│  ┌─────────────────┐    │
│  │  Find Your Home │    │
│  │  in Minutes     │    │
│  └─────────────────┘    │
│                         │
│  ● Verified Listings    │
│  ● AI-Powered Search    │
│  ● M-Pesa Payments      │
│  ● Digital Lease        │
│                         │
│  ┌───────────────────┐  │
│  │   Create Account  │  │
│  └───────────────────┘  │
│                         │
│  Already have account?  │
│       Sign In →         │
│                         │
└─────────────────────────┘
```

**Logic:**
- Check if a token exists in secure storage
- If token exists → skip to Home screen (skip splash)
- If no token → show this screen
- "Create Account" → navigate to Sign Up
- "Sign In" → navigate to Login

**No API calls on this screen.**

---

---

# SCREEN 2 — Sign Up

**Purpose:** Create a new tenant account.

```
┌─────────────────────────┐
│  ← Back                 │
│                         │
│   Create Your Account   │
│   Join thousands of     │
│   Kenyans finding homes │
│                         │
│  ┌───────────────────┐  │
│  │ Full Name         │  │
│  │ John Kamau        │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Email Address     │  │
│  │ john@email.com    │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Phone (optional)  │  │
│  │ +254 700 000 000  │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │   Create Account  │  │ ← calls API
│  └───────────────────┘  │
│                         │
│  Already have account?  │
│       Sign In →         │
└─────────────────────────┘
```

### API Call — Create Account

```
POST https://apim-dev-5c27bcf3.azure-api.net/auth/signup
Content-Type: application/json
```

**Request Body:**
```json
{
  "fullName": "John Kamau",
  "email": "john@email.com",
  "phoneNumber": "+254700000000",
  "userType": "Tenant"
}
```
> `phoneNumber` is optional. `userType` must always be `"Tenant"` for this app. Never send `"Admin"` or `"PropertyOwner"`.

**Success Response (200):**
```json
{
  "succeeded": true,
  "message": "Account created successfully. Please verify your email."
}
```

**Error Responses:**
```json
{ "succeeded": false, "message": "Email already in use." }
{ "succeeded": false, "message": "Invalid phone number format." }
```

**After success:** Navigate to Login screen. Pre-fill the email field.

---

---

# SCREEN 3 — Login (OTP Flow — 2 Steps)

**This is a 2-step flow. Build it as a single screen that transitions between the two steps.**

## Step 3A — Enter Email or Phone

```
┌─────────────────────────┐
│                         │
│       [Logo]            │
│                         │
│       Sign In           │
│  Enter your email or    │
│  phone to receive a     │
│  one-time code          │
│                         │
│  ┌───────────────────┐  │
│  │ Email or Phone    │  │
│  │ you@email.com     │  │
│  │  or +254…         │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │    Send OTP →     │  │ ← calls API
│  └───────────────────┘  │
│                         │
│  New here?              │
│  Create Account →       │
│                         │
│  ● ○ ○  (step dots)     │
└─────────────────────────┘
```

### API Call — Request OTP

```
POST https://apim-dev-5c27bcf3.azure-api.net/auth/login
Content-Type: application/json
```

**If user entered email:**
```json
{ "email": "john@email.com" }
```

**If user entered phone:**
```json
{ "phoneNumber": "+254700000000" }
```

**Success Response (200):**
```json
{
  "message": "OTP sent to john@email.com"
}
```

**After success:** Transition to Step 3B. Show a message: "Code sent to john@email.com"

---

## Step 3B — Enter OTP Code

```
┌─────────────────────────┐
│                         │
│       [Logo]            │
│                         │
│      Enter Your OTP     │
│  Code sent to           │
│  john@email.com         │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   1  2  3  4  5  6│  │ ← large numeric input
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │  Verify & Sign In │  │ ← calls API
│  └───────────────────┘  │
│                         │
│  ← Use different email  │
│                         │
│  ● ● ○  (step dots)     │
└─────────────────────────┘
```

### API Call — Verify OTP

```
POST https://apim-dev-5c27bcf3.azure-api.net/auth/verifyotp
Content-Type: application/json
```

**If original identifier was email:**
```json
{
  "otp": "123456",
  "Email": "john@email.com"
}
```
> Note: Field name is `Email` (capital E) — this is required by the API exactly as written.

**If original identifier was phone:**
```json
{
  "otp": "123456",
  "PhoneNumber": "+254700000000"
}
```
> Note: Field name is `PhoneNumber` (capital P and N) — required exactly as written.

**Success Response (200):**
```json
{
  "succeeded": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
    "email": "john@email.com",
    "fullName": "John Kamau",
    "role": "Tenant",
    "customerId": "7a1b2c3d-..."
  }
}
```

**Error Response:**
```json
{
  "succeeded": false,
  "message": "Invalid or expired OTP. Please try again."
}
```

**After success:**
1. Save `token` to secure storage (Keychain/Keystore)
2. Save `user.customerId` — you will need this for most authenticated calls
3. Decode the JWT to read the user's `role` field
4. If role is `Admin`, `PropertyOwner`, or `PropertyManager` → show error: "This app is for tenants only."
5. Navigate to Home screen

---

---

# SCREEN 4 — Home Screen

**Purpose:** Discovery. Show featured listings, quick search, categories, and recent listings. This is the landing screen after login.

```
┌─────────────────────────┐
│  StayHere    🔔  👤     │
├─────────────────────────┤
│                         │
│  Find Your              │
│  Perfect Home           │
│  in Kenya. ✨           │
│                         │
│  ┌─────┐ ┌─────┐        │
│  │Rent │ │ Buy │ ←tabs  │
│  └─────┘ └─────┘        │
│                         │
│  ┌───────────────────┐  │
│  │ 🔍 Search city…   │  │
│  │              [Go] │  │
│  └───────────────────┘  │
│                         │
│  Popular: Nairobi  Msa  │
│                         │
│  ── Browse by Type ──   │
│  🏢Apt  🏠House  🛏Std  │
│  🏖Villa  💼Office  🌟 │
│                         │
│  ── Featured ──         │
│  ┌──────┐ ┌──────┐      │
│  │ img  │ │ img  │ ←    │
│  │      │ │      │      │
│  │2BR   │ │3BR   │      │
│  │45k/mo│ │60k/mo│      │
│  └──────┘ └──────┘      │
│      ← swipe →          │
│                         │
│  ── Latest Available ── │
│  [listing cards…]       │
└─────────────────────────┘
```

### API Calls on Load (fire both in parallel)

#### 1. Get Featured Listings
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/listings/featured?limit=6
```
No auth header required.

**Response (200):**
```json
{
  "items": [
    {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Modern 2BR Apartment, Westlands",
      "price": 45000,
      "rentPrice": 45000,
      "city": "Nairobi",
      "suburb": "Westlands",
      "bedrooms": 2,
      "bathrooms": 2,
      "propertyType": "Apartment",
      "listingType": "Rent",
      "primaryImageUrl": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/properties/images/abc123.jpg",
      "images": ["https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/..."],
      "isAvailable": true,
      "isFeatured": true,
      "rating": 4.5,
      "amenities": ["WiFi", "Parking", "Gym"]
    }
  ],
  "totalCount": 24,
  "page": 1,
  "pageSize": 6
}
```

#### 2. Get Recent Available Listings
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/listings/available?page=1&pageSize=6
```
No auth header required.

**Response:** Same shape as above.

**Logic for displaying images:**
- Use `primaryImageUrl` first
- Fall back to `images[0]` if `primaryImageUrl` is null
- Fall back to a local placeholder image if both are empty

**Quick search:** Tapping "Search" or a city chip navigates to the Explore screen, passing the search query as a parameter.

---

---

# SCREEN 5 — Explore / Search Screen

**Purpose:** Full browsable listing catalogue with filters and real-time search.

```
┌─────────────────────────┐
│  ← Back   Explore       │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │ 🔍 Search…        │  │
│  └───────────────────┘  │
│  [Filters ▼]  [Grid|List│
├─────────────────────────┤
│  1,247 properties found │
│                         │
│  ┌──────────────────┐   │
│  │ [img]            │   │
│  │ 2BR Apartment    │   │
│  │ 📍 Westlands, NBI│   │
│  │ ★ 4.5  🛏2  🚿2  │   │
│  │ KES 45,000 /mo   │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │ [img]            │   │
│  │ 3BR House        │   │
│  │ 📍 Kileleshwa    │   │
│  │ ★ 4.8  🛏3  🚿2  │   │
│  │ KES 75,000 /mo   │   │
│  └──────────────────┘   │
│  (infinite scroll ↓)    │
└─────────────────────────┘

── FILTER DRAWER (slides up) ──
┌─────────────────────────┐
│  Filters               ✕│
│                         │
│  Type: [Rent][Buy][AirBnB]│
│                         │
│  City: [ Nairobi ▾ ]    │
│                         │
│  Property:              │
│  [Apt][House][Studio]   │
│  [Villa][Office]        │
│                         │
│  Bedrooms:              │
│  [Any][1][2][3][4][5+]  │
│                         │
│  Price (KES):           │
│  Min [______] Max [____]│
│                         │
│  [Clear]  [Apply →]     │
└─────────────────────────┘
```

### API Calls

#### Option A — No search, no filters (initial load)
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/listings/available?page=1&pageSize=12
```

#### Option B — With search or filters (user typed something or applied a filter)
```
POST https://apim-dev-5c27bcf3.azure-api.net/property/listings/search
Content-Type: application/json
```

**Request Body (send only the fields the user has set):**
```json
{
  "location": "Westlands",
  "city": "Nairobi",
  "propertyTypes": ["Apartment", "Studio"],
  "listingType": "Rent",
  "minPrice": 20000,
  "maxPrice": 60000,
  "bedrooms": 2,
  "page": 1,
  "pageSize": 12
}
```
> All fields are optional. Only send the ones the user has actually selected.

**Response (200):**
```json
{
  "items": [ ...listing objects... ],
  "totalCount": 47,
  "page": 1,
  "pageSize": 12,
  "totalPages": 4
}
```

**Pagination / Infinite Scroll Logic:**
```
When user scrolls to bottom:
  page = page + 1
  Call API with page = 2 (append results, not replace)
  Stop when items.length < pageSize (no more results)
```

---

---

# SCREEN 6 — Listing Detail

**Purpose:** Full details of a single listing. Gateway into the rental flow.

```
┌─────────────────────────┐
│ ← Back              ♡  │
├─────────────────────────┤
│ ┌─────────────────────┐ │
│ │                     │ │
│ │   [Primary Image]   │ │ ← swipeable gallery
│ │                     │ │
│ │ Apartment  For Rent │ │
│ │ 1 / 4           ···│ │
│ └─────────────────────┘ │
│                         │
│ Modern 2BR, Westlands   │
│ 📍 Westlands, Nairobi   │
│ ★ 4.5   👁 128 views    │
│                         │
│ KES 45,000 /mo          │
│ 🟢 Available Now        │
│                         │
│ 🛏 2   🚿 2   📐 850sqft│
│                         │
│ ─── About This Property─│
│ Modern 2-bedroom apt in │
│ the heart of Westlands… │
│ [Read More]             │
│                         │
│ ─── Amenities ──────── │
│ ✓ WiFi  ✓ Parking       │
│ ✓ Gym   ✓ Security      │
│                         │
│ ─── Location ──────────│
│ Street: Peponi Road     │
│ Area: Westlands         │
│ City: Nairobi           │
│                         │
│ ─── Similar Properties─│
│ [card] [card] [card]    │
│                         │
│ ─── Rate This ─────────│
│ ★★★★☆  [tap to rate]    │
├─────────────────────────┤
│ [♡ Save] [📞 Enquire]   │
│ [📅 Book a Viewing →]   │ ← primary CTA
└─────────────────────────┘
```

### API Calls

#### 1. Load Listing (on screen open)
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/listings/{listingId}
```

**Response (200):**
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "title": "Modern 2BR Apartment, Westlands",
  "description": "Spacious 2-bedroom apartment in the heart of Westlands...",
  "price": 45000,
  "rentPrice": 45000,
  "city": "Nairobi",
  "suburb": "Westlands",
  "county": "Nairobi County",
  "country": "Kenya",
  "street": "Peponi Road",
  "bedrooms": 2,
  "bathrooms": 2,
  "sizeSqft": 850,
  "floor": "3rd",
  "yearBuilt": 2020,
  "propertyType": "Apartment",
  "listingType": "Rent",
  "amenities": ["WiFi", "Parking", "Gym", "24/7 Security"],
  "primaryImageUrl": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/properties/images/abc123.jpg",
  "images": [
    "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/properties/images/abc124.jpg",
    "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/properties/images/abc125.jpg"
  ],
  "isAvailable": true,
  "isFeatured": true,
  "rating": 4.5,
  "views": 128,
  "listingCode": "LST-2024-001"
}
```

#### 2. Increment View Count (fire once, don't show loading)
```
POST https://apim-dev-5c27bcf3.azure-api.net/property/listings/{listingId}/view
```
No body. No auth required. Fire and forget.

#### 3. Load AI Similar Listings (after main listing loads)
```
GET https://apim-dev-5c27bcf3.azure-api.net/aiagent/listings?location=Westlands&listing_id={listingId}
```
No auth required. May return empty array — handle gracefully.

**Response:** Array of listing objects (same shape as above).

#### 4. Submit Rating (when user taps stars)
```
PATCH https://apim-dev-5c27bcf3.azure-api.net/property/listings/{listingId}/rating
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{ "newRating": 4 }
```
> Only allow rating once. After submitting, show "Thanks for your rating!" and disable the stars.

**"Book a Viewing" button** → Navigate to Rental Flow (Screen 8) passing the `listingId`.

---

---

# SCREEN 7 — Saved / Favorites

**Purpose:** Listings the user has saved. **100% local — no API calls.** Store saved listing IDs in local secure storage.

```
┌─────────────────────────┐
│ ← Back   Saved Homes    │
├─────────────────────────┤
│  3 saved properties     │
│                         │
│  ┌──────────────────┐   │
│  │[img] 2BR Apt     │ ✕ │ ← swipe to remove
│  │      Westlands   │   │
│  │      KES 45k/mo  │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │[img] 3BR House   │ ✕ │
│  │      Karen       │   │
│  │      KES 80k/mo  │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │[img] Studio      │ ✕ │
│  │      Kilimani    │   │
│  │      KES 22k/mo  │   │
│  └──────────────────┘   │
│                         │
│  [Explore More →]       │
└─────────────────────────┘
```

**Logic:**
- On first load, read saved listing IDs from local storage
- To display card details, you may optionally call `GET /property/listings/{id}` for each saved ID
- Or cache the full listing object locally when the user saves it (recommended — faster)
- Heart icon on listing cards toggles local save state immediately (no API call)

---

---

# SCREEN 8 — Rental Flow: Step 1 — Book a Viewing

**This begins the 6-step rental journey. Show a step progress bar at the top throughout steps 1–6.**

```
┌─────────────────────────┐
│  ✕                      │
│  [🏠 thumb] 2BR Apt     │
│             Westlands   │
│                         │
│  ①─────②─────③─────④   │
│  View  Apply  Docs  Terms│
│                         │
│  ──── Book a Viewing ───│
│  Schedule a time to     │
│  visit the property.    │
│                         │
│  Preferred Date         │
│  ┌───────────────────┐  │
│  │ 📅 Select date…   │  │
│  └───────────────────┘  │
│                         │
│  Preferred Time         │
│  [08:00][09:00][10:00]  │
│  [11:00][12:00][13:00]  │
│  [14:00][15:00][16:00]  │
│                         │
│  Viewing Type           │
│  ┌──────────┐ ┌───────┐ │
│  │🏠Physical│ │📱Virtual│
│  └──────────┘ └───────┘ │
│                         │
│  Contact Phone (opt.)   │
│  ┌───────────────────┐  │
│  │ +254 700 000 000  │  │
│  └───────────────────┘  │
│                         │
│  Notes for agent (opt.) │
│  ┌───────────────────┐  │
│  │ I'm available on  │  │
│  │ weekends only…    │  │
│  └───────────────────┘  │
│                         │
│  ┌───────────────────┐  │
│  │ Confirm Booking → │  │ ← calls API
│  └───────────────────┘  │
└─────────────────────────┘
```

### API Call — Create Viewing Booking

```
POST https://apim-dev-5c27bcf3.azure-api.net/property/bookings
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "listingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerId": "7a1b2c3d-...",
  "preferredDate": "2026-06-20T00:00:00.000Z",
  "preferredTime": "10:00",
  "viewingType": "Physical",
  "notes": "I'm available on weekends only.",
  "contactPhone": "+254700000000"
}
```
> Get `customerId` from the stored user profile after login. `preferredDate` must be an ISO 8601 string.

**Success Response (200/201):**
```json
{
  "id": "booking-guid-here",
  "listingId": "3fa85f64-...",
  "customerId": "7a1b2c3d-...",
  "preferredDate": "2026-06-20T00:00:00.000Z",
  "preferredTime": "10:00",
  "viewingType": "Physical",
  "status": "Pending",
  "notes": "I'm available on weekends only.",
  "createdAt": "2026-06-13T12:00:00.000Z",
  "updatedAt": "2026-06-13T12:00:00.000Z"
}
```

**Store the returned `booking.id`** — you need it in Step 2.

**After success:** Navigate to Step 2.

---

---

# SCREEN 9 — Rental Flow: Step 2 — Start Application

```
┌─────────────────────────┐
│  ✕ [thumb] 2BR Apt      │
│  ✅①  ②─────③─────④    │
├─────────────────────────┤
│                         │
│  ✅ Viewing Booked!     │
│                         │
│  ┌─────────────────────┐│
│  │ ✓ Viewing Request   ││
│  │   Sent              ││
│  │ Friday 20 June      ││
│  │ at 10:00 · Physical ││
│  │ Status: Pending     ││
│  └─────────────────────┘│
│                         │
│  What Happens Next:     │
│                         │
│  1 Upload your ID &     │
│    selfie for verify.   │
│  2 Sign the application │
│    form digitally.      │
│  3 Review the property  │
│    terms & conditions.  │
│  4 Make the required    │
│    payment to secure.   │
│                         │
│  ┌──────────┐ ┌───────┐ │
│  │← Back   │ │ Apply→│ │ ← calls API
│  └──────────┘ └───────┘ │
└─────────────────────────┘
```

### API Call — Create Application

```
POST https://apim-dev-5c27bcf3.azure-api.net/property/applications
Authorization: Bearer <token>
Content-Type: application/json
```

**Request Body:**
```json
{
  "listingId": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "customerId": "7a1b2c3d-...",
  "viewingBookingId": "booking-guid-from-step-1"
}
```
> `viewingBookingId` links the application to the booking. Required if you have it.

**Success Response (200/201):**
```json
{
  "id": "application-guid-here",
  "listingId": "3fa85f64-...",
  "customerId": "7a1b2c3d-...",
  "viewingBookingId": "booking-guid-...",
  "status": "DocumentsPending",
  "createdAt": "2026-06-13T12:05:00.000Z",
  "updatedAt": "2026-06-13T12:05:00.000Z",
  "documents": []
}
```

**Store the returned `application.id`** — you need it for all subsequent steps.

**After success:** Navigate to Step 3.

---

---

# SCREEN 10 — Rental Flow: Step 3 — Upload Documents

**This is the most complex step. The user uploads 3 documents + an optional signature.**

```
┌─────────────────────────┐
│  ✕ [thumb] 2BR Apt      │
│  ✅①✅②  ③────④────⑤  │
├─────────────────────────┤
│                         │
│  Upload Your Documents  │
│  We verify your identity│
│  All docs stored safely │
│                         │
│  ─ ID / Passport Front ─│
│  ┌──────────────────┐   │
│  │ 📎 Choose File   │   │ ← file picker
│  └──────────────────┘   │
│  Clear photo of front   │
│  of your ID or Passport │
│                         │
│  ─ ID / Passport Back ──│
│  ┌──────────────────┐   │
│  │ ✅ Uploaded       │   │ ← after upload
│  │ [thumbnail] Repl │   │
│  └──────────────────┘   │
│                         │
│  ─ Selfie ──────────── │
│  ┌──────────────────┐   │
│  │ 📎 Choose File   │   │
│  └──────────────────┘   │
│  Clear selfie of face   │
│                         │
│  ─ Digital Signature ── │
│  ┌──────────────────┐   │
│  │ [signature area] │   │ ← canvas/drawing
│  │ Sign here…       │   │
│  └──────────────────┘   │
│  [Clear Signature]      │
│                         │
│  ┌──────────────────┐   │
│  │ Submit Documents │   │ ← calls API
│  └──────────────────┘   │
│  Owner reviews in       │
│  24–48 hours.           │
└─────────────────────────┘
```

### Document Upload Process (3 sub-steps per document)

**Sub-step A: Get a presigned upload URL**
```
POST https://apim-dev-5c27bcf3.azure-api.net/property/upload/presigned-url
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "folder": "applications/documents",
  "fileName": "id-front.jpg",
  "contentType": "image/jpeg"
}
```
> `contentType` must match the actual file type: `image/jpeg`, `image/png`, `application/pdf`.

**Response:**
```json
{
  "uploadUrl": "https://5017a39026a8616f45b3120b56cf7f55.r2.cloudflarestorage.com/stayhere/applications/documents/a1b2c3d4-id-front.jpg?X-Amz-Signature=...",
  "fileKey": "applications/documents/a1b2c3d4-id-front.jpg",
  "publicUrl": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/applications/documents/a1b2c3d4-id-front.jpg",
  "expiresAt": "2026-06-13T12:30:00.000Z",
  "contentType": "image/jpeg"
}
```

**Sub-step B: Upload directly to R2 (no auth header)**
```
PUT <uploadUrl from above>
Content-Type: image/jpeg    ← MUST match exactly what was used to get the URL
Body: <raw file bytes>
```
> This goes directly to Cloudflare R2, NOT to the StayHere API. The `Content-Type` header must match the `contentType` from the response above. This is critical — R2 will return 403 if they don't match.

**Sub-step C: Save the document record**
```
POST https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}/documents
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "documentType": "IdFront",
  "fileUrl": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/applications/documents/a1b2c3d4-id-front.jpg",
  "fileName": "id-front.jpg"
}
```
> `documentType` values: `"IdFront"`, `"IdBack"`, `"Selfie"`, `"DigitalSignature"`

**Response:**
```json
{
  "id": "doc-guid",
  "applicationId": "application-guid",
  "documentType": "IdFront",
  "fileUrl": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/...",
  "fileName": "id-front.jpg",
  "uploadedAt": "2026-06-13T12:10:00.000Z"
}
```

Repeat steps A–C for each of: `IdFront`, `IdBack`, `Selfie`.

For the **digital signature**: Convert the canvas drawing to a data URL (base64 PNG string) and save it as:
```json
{
  "documentType": "DigitalSignature",
  "fileUrl": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...",
  "fileName": "signature.png"
}
```

### After All Documents Are Uploaded — Submit for Review

```
PATCH https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}/submit
Authorization: Bearer <token>
```
No body required.

**Response:**
```json
{
  "id": "application-guid",
  "status": "UnderReview",
  ...
}
```

**After success:** Navigate to Step 4.

---

---

# SCREEN 11 — Rental Flow: Step 4 — Review & Accept Terms

```
┌─────────────────────────┐
│  ✕ [thumb] 2BR Apt      │
│  ✅①✅②✅③  ④────⑤   │
├─────────────────────────┤
│                         │
│  Review & Accept Terms  │
│                         │
│ ── [if still UnderReview] ──
│  ┌──────────────────┐   │
│  │  ⏳ Under Review │   │
│  │                  │   │
│  │ Documents being  │   │
│  │ reviewed. You'll │   │
│  │ be notified when │   │
│  │ approved.        │   │
│  │                  │   │
│  │ [Refresh Status] │   │
│  └──────────────────┘   │
│                         │
│ ── [if Rejected] ───────│
│  ❌ Application Rejected│
│  Reason: [reason text]  │
│  [Browse Other Listings]│
│                         │
│ ── [if Approved] ───────│
│  ┌──────────────────┐   │
│  │ 📋 Tenancy Terms │   │
│  │                  │   │
│  │ [scrollable area]│   │
│  │ Terms content…   │   │
│  │ House Rules…     │   │
│  │ Payment Terms…   │   │
│  │ Notice Period:   │   │
│  │  1 Month         │   │
│  │ Pet Policy: No   │   │
│  │                  │   │
│  │ Fees:            │   │
│  │ Security: 45,000 │   │
│  │ Admin Fee: 5,000 │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │ ✓ I Accept Terms │   │ ← calls API
│  └──────────────────┘   │
└─────────────────────────┘
```

### API Calls

#### 1. Load Property Terms (on screen open, or after step 3)
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/listings/{listingId}/terms
```
No auth required.

**Response (200):**
```json
{
  "id": "terms-guid",
  "listingId": "listing-guid",
  "title": "Standard Tenancy Agreement",
  "termsContent": "Full terms content text here...",
  "houseRules": "No parties after 10pm. No smoking indoors...",
  "paymentTerms": "Rent is due on the 1st of every month...",
  "noticePeriod": "1 Month",
  "petPolicy": "No pets allowed",
  "securityDepositTerms": "Refundable within 30 days of vacating...",
  "securityDeposit": 45000,
  "adminFee": 5000,
  "currency": "KES",
  "mpesaPaybill": "174379",
  "mpesaTill": null,
  "mpesaAccountNumber": "APP-001",
  "bankName": "KCB Bank",
  "bankAccountName": "StayHere Properties Ltd",
  "bankAccountNumber": "1234567890",
  "bankBranch": "Westlands",
  "onboardingInstructions": "Come to the office on 1st day with original ID...",
  "accessInstructions": "Keys are at the caretaker's office on 2nd floor...",
  "itemsToCarry": "Original ID, 1 month rent receipt",
  "isActive": true
}
```

> If terms fetch returns 404, show: "No specific terms set. Standard tenancy terms apply." and allow acceptance.

#### 2. Check Application Status (to know if reviewing is done)
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}
Authorization: Bearer <token>
```

**Response contains `status` field:**
| Status | What to show |
|--------|-------------|
| `UnderReview` | Waiting spinner + "Refresh Status" button |
| `Rejected` | Error state with `rejectionReason` |
| `Approved` | Show terms, enable acceptance |
| `TermsAccepted` | Already done, skip to step 5 |

#### 3. Accept Terms (when user taps "I Accept")
```
PATCH https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}/accept-terms
Authorization: Bearer <token>
Content-Type: application/json
```
```json
{
  "signatureUrl": "data:image/png;base64,..."
}
```
> `signatureUrl` is optional — pass the saved digital signature from Step 3 if available.

**Response:**
```json
{
  "id": "application-guid",
  "status": "TermsAccepted",
  "termsAcceptedAt": "2026-06-13T14:00:00.000Z"
}
```

**After success:** Navigate to Step 5.

---

---

# SCREEN 12 — Rental Flow: Step 5 — Payment

```
┌─────────────────────────┐
│  ✕ [thumb] 2BR Apt      │
│  ✅①✅②✅③✅④  ⑤    │
├─────────────────────────┤
│                         │
│  Complete Payment       │
│  Secure your tenancy    │
│                         │
│  ─ Payment Summary ─    │
│  Security Deposit  45,000│
│  Administration Fee 5,000│
│  ─────────────────────  │
│  Total Due   KES 50,000  │
│                         │
│  ─ Payment Method ──── │
│  ┌──────────┐ ┌───────┐ │
│  │📱 M-Pesa │ │🏦 Bank│ │
│  └──────────┘ └───────┘ │
│                         │
│  ─ [if M-Pesa selected]─│
│  M-Pesa Phone Number    │
│  ┌───────────────────┐  │
│  │ 0700 000 000      │  │
│  └───────────────────┘  │
│  Enter Safaricom number │
│  to receive STK prompt. │
│                         │
│  Alternative: Paybill   │
│  Paybill: 174379        │
│  Account: APP-001       │
│                         │
│  ┌───────────────────┐  │
│  │ 📱 Send STK Push  │  │ ← calls API
│  └───────────────────┘  │
└─────────────────────────┘

── AFTER STK PUSH SENT ──
┌─────────────────────────┐
│                         │
│      📱                 │
│   (pulsing animation)   │
│                         │
│   Check Your Phone!     │
│   STK Push sent to      │
│   0700 000 000          │
│   Enter M-Pesa PIN to   │
│   complete payment.     │
│                         │
│   Amount: KES 50,000    │
│   Checkout ID: ws_…     │
│                         │
│  (polling every 4 sec)  │
│                         │
│  [I've already paid →]  │
└─────────────────────────┘
```

### API Calls

#### 1. Initiate Payment (M-Pesa STK Push)
```
POST https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}/payment/initiate
Authorization: Bearer <token>
Content-Type: application/json
```

**For M-Pesa:**
```json
{
  "method": "Mpesa",
  "phoneNumber": "254700000000",
  "paymentType": "SecurityDeposit",
  "amount": 50000
}
```
> Phone number must start with `254` (not `0` or `+`). Strip leading `0` and add `254`, or strip `+`.
> `amount` = `securityDeposit + adminFee` from the terms object.

**For Bank Transfer:**
```json
{
  "method": "BankTransfer",
  "paymentType": "SecurityDeposit",
  "amount": 50000
}
```

**M-Pesa Success Response (200):**
```json
{
  "id": "payment-guid",
  "applicationId": "application-guid",
  "paymentType": "SecurityDeposit",
  "amount": 50000,
  "currency": "KES",
  "method": "Mpesa",
  "status": "Initiated",
  "mpesaCheckoutRequestId": "ws_CO_13062026140000000700000000",
  "phoneNumber": "254700000000",
  "initiatedAt": "2026-06-13T14:00:00.000Z"
}
```

#### 2. Poll Payment Status (every 4 seconds until confirmed)
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}/payment/status
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "payment-guid",
    "paymentType": "SecurityDeposit",
    "amount": 50000,
    "currency": "KES",
    "method": "Mpesa",
    "status": "Confirmed",
    "mpesaReceiptNumber": "QJL3XYZABC",
    "initiatedAt": "2026-06-13T14:00:00.000Z",
    "confirmedAt": "2026-06-13T14:02:30.000Z"
  }
]
```

> Poll every 4 seconds. Stop when any payment has `"status": "Confirmed"`. Stop polling after 3 minutes (timeout). If timeout, show "Payment taking longer than expected" and offer to contact support.

#### 3. Get Onboarding Instructions (after payment confirmed)
```
GET https://apim-dev-5c27bcf3.azure-api.net/property/applications/{applicationId}/onboarding
Authorization: Bearer <token>
```

**Response:**
```json
{
  "message": "Congratulations! Your tenancy has been confirmed.",
  "onboardingInstructions": "Come to the office on your move-in day...",
  "accessInstructions": "Keys are at the caretaker's office...",
  "itemsToCarry": "Original ID, rent receipt",
  "payment": {
    "mpesaReceiptNumber": "QJL3XYZABC",
    "amount": 50000,
    "status": "Confirmed"
  }
}
```

**After confirmed + onboarding loaded:** Navigate to Step 6.

**Bank Transfer flow:** Show bank details, user taps "I've Made the Payment", call `getOnboarding` directly and proceed to Step 6 (owner confirms manually).

---

---

# SCREEN 13 — Rental Flow: Step 6 — Welcome / Onboarding

```
┌─────────────────────────┐
│  ✅①✅②✅③✅④✅⑤✅⑥ │
├─────────────────────────┤
│                         │
│         🏠              │
│    (celebration anim.)  │
│                         │
│   Congratulations!      │
│                         │
│   Your tenancy has been │
│   confirmed. Welcome to │
│   your new home!        │
│                         │
│  ─ Move-In Steps ─────  │
│  📋 Come to office on   │
│     move-in day with    │
│     your original ID    │
│                         │
│  ─ How to Access ──── │
│  🔑 Keys at caretaker   │
│     office, 2nd floor.  │
│     Ask for James.      │
│                         │
│  ─ What to Bring ──── │
│  🎒 Original ID         │
│     Rent receipt (M-Pesa│
│     confirmation SMS)   │
│                         │
│  ─ Payment Confirmed ── │
│  M-Pesa Receipt:        │
│  QJL3XYZABC             │
│                         │
│  ┌───────────────────┐  │
│  │ Go to My Dashboard│  │
│  └───────────────────┘  │
│  [View Listing Details] │
└─────────────────────────┘
```

**No new API calls.** Display the `onboarding` object loaded in Step 5. Show celebration animation (confetti recommended).

---

---

# SCREEN 14 — My Applications

**Purpose:** Track all rental applications the tenant has ever made.

```
┌─────────────────────────┐
│  ← Back  My Applications│
├─────────────────────────┤
│                         │
│  Active Applications    │
│                         │
│  ┌──────────────────┐   │
│  │ 🏠 APP-3FA85F64  │ →│
│  │ Documents Pending│   │
│  │ 13 Jun 2026      │   │
│  │ ████████░░░░░░░░ │   │ ← progress bar
│  │ (Step 1/6)       │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │ 🏠 APP-7A1B2C3D  │ →│
│  │ Under Review     │   │
│  │ 10 Jun 2026      │   │
│  │ ██████████████░░ │   │
│  │ (Step 3/6)       │   │
│  └──────────────────┘   │
│                         │
│  Past Applications      │
│                         │
│  [cancelled ones here]  │
└─────────────────────────┘

── TAP A CARD → DETAIL DRAWER ──
┌─────────────────────────┐
│  Application Details  ✕ │
│                         │
│  ● Under Review         │
│                         │
│  Progress:              │
│  ✅ Viewing Booked      │
│  ✅ Application Submitted│
│  ✅ Documents Uploaded  │
│  ✅ Under Review        │
│  ○  Approved            │
│  ○  Terms Accepted      │
│  ○  Payment Made        │
│  ○  Move-In Ready       │
│                         │
│  Uploaded Documents:    │
│  ID Front          View │
│  ID Back           View │
│  Selfie            View │
│                         │
│  [Continue Application→]│ ← if continuable
└─────────────────────────┘
```

### API Call — Load All Applications

```
GET https://apim-dev-5c27bcf3.azure-api.net/property/applications/customer/{customerId}
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "app-guid",
    "listingId": "listing-guid",
    "customerId": "customer-guid",
    "status": "UnderReview",
    "createdAt": "2026-06-10T00:00:00.000Z",
    "updatedAt": "2026-06-13T00:00:00.000Z",
    "documents": [
      { "id": "doc-guid", "documentType": "IdFront", "fileUrl": "https://...", "uploadedAt": "..." },
      { "id": "doc-guid-2", "documentType": "IdBack", "fileUrl": "https://...", "uploadedAt": "..." }
    ],
    "listing": { "id": "listing-guid", "title": "2BR Apt Westlands", "listingCode": "LST-001" }
  }
]
```

**Status → Progress Bar Mapping:**

| `status` value | Label shown | Progress % |
|---------------|-------------|-----------|
| `DocumentsPending` | Documents Pending | 16% |
| `UnderReview` | Under Review | 33% |
| `Approved` | Approved | 50% |
| `Rejected` | Not Approved | 50% (red) |
| `TermsAccepted` | Terms Accepted | 67% |
| `PaymentPending` | Payment Pending | 83% |
| `Active` | Active Tenancy | 100% (green) |
| `Cancelled` | Cancelled | 0% (grey) |

**Continuable statuses** (show "Continue Application" button):
`DocumentsPending`, `Approved`, `TermsAccepted`, `PaymentPending`

→ When tapped, navigate to Rental Flow starting at the correct step for that status.

---

---

# SCREEN 15 — My Dashboard (Tenant Properties)

**Purpose:** View and manage current and past tenancies, access documents, pay rent.

```
┌─────────────────────────┐
│  StayHere    🔔  👤     │
├─────────────────────────┤
│                         │
│  Welcome back, John! 👋 │
│  Manage your rentals,   │
│  payments & documents.  │
│                         │
│  [Active][History][Docs]│ ← tabs
├─────────────────────────┤
│  ── ACTIVE TAB ────── │
│                         │
│  ┌──────────────────┐   │
│  │ [property image] │   │
│  │ ● Active         │   │
│  │ 2BR Apt,Westlands│   │
│  │ 📍 Westlands     │   │
│  │ 🛏2  🚿2         │   │
│  │                  │   │
│  │ Monthly Rent     │   │
│  │ KES 45,000       │   │
│  │ Next Due: 1 Jul  │   │
│  │ Lease: Jun–Jul27 │   │
│  │                  │   │
│  │ [💳 Pay Rent] [→]│   │
│  └──────────────────┘   │
│                         │
│  ── HISTORY TAB ──── │
│  [past property cards]  │
│                         │
│  ── DOCS TAB ───────── │
│  📄 Lease Agreement View│
│  📄 Payment Receipt View│
└─────────────────────────┘

── PAY RENT MODAL ──
┌─────────────────────────┐
│  Pay Rent             ✕ │
│                         │
│  2BR Apt, Westlands     │
│                         │
│  Amount (KES)           │
│  ┌───────────────────┐  │
│  │     45,000        │  │ ← pre-filled, read-only
│  └───────────────────┘  │
│                         │
│  [Cancel] [Confirm →]   │
│                         │
│  Secure via M-Pesa/Card │
└─────────────────────────┘
```

### API Calls (fire in parallel on screen load)

#### 1. Get Tenant Properties
```
GET https://apim-dev-5c27bcf3.azure-api.net/customers/{customerId}/properties
Authorization: Bearer <token>
```

**Response:**
```json
[
  {
    "id": "tenancy-guid",
    "listingId": "listing-guid",
    "title": "2BR Apartment, Westlands",
    "suburb": "Westlands",
    "city": "Nairobi",
    "primaryImageUrl": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/...",
    "bedrooms": 2,
    "bathrooms": 2,
    "rentAmount": 45000,
    "leaseStartDate": "2026-06-15T00:00:00.000Z",
    "leaseEndDate": "2027-06-14T00:00:00.000Z",
    "nextDueDate": "2026-07-01T00:00:00.000Z",
    "status": "active"
  }
]
```

#### 2. Get Tenant Documents
```
GET https://apim-dev-5c27bcf3.azure-api.net/customers/{customerId}/documents
Authorization: Bearer <token>
```

**Response:**
```json
[
  { "name": "Lease Agreement - Westlands.pdf", "url": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/..." },
  { "name": "Payment Receipt - June 2026.pdf", "url": "https://pub-89021444cd6a4a81bacfa5c1dd0427ea.r2.dev/..." }
]
```

---

---

# SCREEN 16 — Sage AI Chat

**Purpose:** Floating AI assistant available on any screen. Answers property questions and finds listings via natural language.

```
┌─────────────────────────┐
│  Sage AI              ✕ │
│  Your Property Assistant│
├─────────────────────────┤
│                         │
│  Hi! I'm Sage. Ask me   │
│  anything about finding │
│  your perfect home. 🏠  │
│                         │
│  ┌──────────────────┐   │
│  │  👤 User message │   │
│  │  Find me a 2BR   │   │
│  │  near Westlands  │   │
│  │  under 45k       │   │
│  └──────────────────┘   │
│                         │
│  ┌──────────────────┐   │
│  │ 🤖 Sage AI       │   │
│  │ Found 12 matches!│   │
│  │ Top pick: Modern │   │
│  │ 2BR in Parklands │   │
│  │ 42k/mo. Gym,WiFi │   │
│  │ parking included.│   │
│  │ Want to see more?│   │
│  └──────────────────┘   │
│                         │
│  ┌───────────────────┐  │
│  │ Type a message…   │  │
│  │               [→] │  │
│  └───────────────────┘  │
│                         │
│  Quick: "2BR Westlands" │
│  "Pet-friendly Nairobi" │
└─────────────────────────┘
```

### API Call — Send Chat Message

```
POST https://apim-dev-5c27bcf3.azure-api.net/aiagent/chat
Authorization: Bearer <token>
Content-Type: application/json
```

```json
{
  "query": "Find me a 2 bedroom apartment near Westlands under 45k",
  "sessionId": "optional-session-id-for-conversation-continuity"
}
```
> `sessionId` is optional. Pass it back on subsequent messages to maintain conversation context. Generate a random UUID for the first message of a conversation; reuse it for the rest.

**Response:**
```json
{
  "reply": "Found 12 matching apartments! Top pick: Modern 2BR in Parklands, 42k/mo, with WiFi, parking, and a gym. Want me to show more?",
  "sessionId": "abc-session-id",
  "results": [
    { "id": "listing-guid", "title": "...", "price": 42000, ... }
  ],
  "recommendations": [...]
}
```

> Display `reply` as the chat bubble text. If `results` array is non-empty, show listing cards below the reply bubble for quick navigation.

### Alternative — Semantic Listing Search (without conversation)
```
GET https://apim-dev-5c27bcf3.azure-api.net/aiagent/listings?location=Westlands&amenity=gym
```
No auth required. Returns array of listing objects.

---

---

# Key Business Rules (Must Implement)

These are not optional — the API enforces them:

| Rule | Detail |
|------|--------|
| **Tenant role only** | After OTP verify, check JWT `role` claim. If role is `Admin`, `PropertyOwner`, or `PropertyManager`, reject login with an error message. |
| **Step ordering** | Cannot skip steps. Must complete viewing booking before application. Must submit documents before terms. Must accept terms before payment. |
| **Phone format for M-Pesa** | Always normalize to `254XXXXXXXXX`. Strip leading `0` → add `254`. Strip `+` from `+254`. |
| **Content-Type header on R2 upload** | The `Content-Type` in your PUT request must exactly match what was returned in `contentType` from the presigned URL API. R2 returns 403 if they differ. |
| **Poll timeout** | Stop payment polling after 3 minutes. Show a "Payment taking longer than expected" message. |
| **Doc upload** | All 3 docs (IdFront, IdBack, Selfie) must be uploaded before you can submit. Enforce this locally before calling submit API. |
| **Save token securely** | Never save JWT in plain AsyncStorage. Use Keychain (iOS) / EncryptedSharedPreferences (Android). |

---

---

# Full API Reference — Quick Lookup

| Screen | Method | Endpoint | Auth? |
|--------|--------|----------|-------|
| Sign Up | `POST` | `/auth/signup` | ❌ |
| Request OTP | `POST` | `/auth/login` | ❌ |
| Verify OTP | `POST` | `/auth/verifyotp` | ❌ |
| Home: Featured | `GET` | `/property/listings/featured?limit=6` | ❌ |
| Home: Recent | `GET` | `/property/listings/available?page=1&pageSize=6` | ❌ |
| Explore: Browse | `GET` | `/property/listings/available?page={n}&pageSize=12` | ❌ |
| Explore: Search | `POST` | `/property/listings/search` | ❌ |
| Listing Detail | `GET` | `/property/listings/{id}` | ❌ |
| Increment Views | `POST` | `/property/listings/{id}/view` | ❌ |
| AI Similar | `GET` | `/aiagent/listings?location={city}&listing_id={id}` | ❌ |
| Rate Listing | `PATCH` | `/property/listings/{id}/rating` | ✅ |
| Book Viewing | `POST` | `/property/bookings` | ✅ |
| Create Application | `POST` | `/property/applications` | ✅ |
| Get Upload URL | `POST` | `/property/upload/presigned-url` | ✅ |
| Upload to R2 | `PUT` | `<presigned URL>` | ❌ (pre-signed) |
| Save Document | `POST` | `/property/applications/{id}/documents` | ✅ |
| Submit Application | `PATCH` | `/property/applications/{id}/submit` | ✅ |
| Get Terms | `GET` | `/property/listings/{listingId}/terms` | ❌ |
| Get Application | `GET` | `/property/applications/{id}` | ✅ |
| Accept Terms | `PATCH` | `/property/applications/{id}/accept-terms` | ✅ |
| Initiate Payment | `POST` | `/property/applications/{id}/payment/initiate` | ✅ |
| Poll Payment Status | `GET` | `/property/applications/{id}/payment/status` | ✅ |
| Get Onboarding | `GET` | `/property/applications/{id}/onboarding` | ✅ |
| My Applications | `GET` | `/property/applications/customer/{customerId}` | ✅ |
| My Properties | `GET` | `/customers/{customerId}/properties` | ✅ |
| My Documents | `GET` | `/customers/{customerId}/documents` | ✅ |
| AI Chat | `POST` | `/aiagent/chat` | ✅ |
| AI Search | `GET` | `/aiagent/listings` | ❌ |

---

---

# Navigation Map

```
Splash
  ├─→ Sign Up → Login (OTP)
  └─→ Login (OTP) → Home

Home
  ├─→ Explore (search/filter)
  │     └─→ Listing Detail
  │           ├─→ Rental Flow (Book Viewing)
  │           │     ├─→ Step 1: Book Viewing
  │           │     ├─→ Step 2: Apply
  │           │     ├─→ Step 3: Upload Documents
  │           │     ├─→ Step 4: Review Terms
  │           │     ├─→ Step 5: Payment
  │           │     └─→ Step 6: Welcome
  │           └─→ Save to Favorites (local only)
  ├─→ Saved/Favorites
  ├─→ My Applications
  └─→ My Dashboard/Properties

Bottom Nav (always visible when logged in):
  Home | Explore | Saved | Applications | Dashboard
```

---

---

# Error Handling Reference

| HTTP Status | Meaning | What to show |
|-------------|---------|-------------|
| `400` | Bad request | Show the `error` field from response body |
| `401` | Not authenticated | Clear token, redirect to Login |
| `403` | Access denied | "You don't have access to this resource" |
| `404` | Not found | "Not found" — navigate back |
| `422` | Validation failed | Show field-level errors from response |
| `500` | Server error | "Something went wrong. Please try again." |
| Network error | No internet | "Check your connection and try again." |

---

*This document was generated from the StayHere web client app source code.*
*All API URLs are production endpoints behind Azure APIM.*
*For questions, contact the backend team or refer to the PostMan collection in the repository.*
