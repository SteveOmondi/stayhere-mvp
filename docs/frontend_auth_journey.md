# StayHere Platform: Frontend Authentication & Profile Journey

This document outlines the standardized user journey and API interaction patterns for the StayHere MVP. Use this guide to align frontend implementation with the security-hardened backend.

---

## 1. Standardized Response Format
Every API response follows this uniform structure. **Do not parse raw strings; always expect JSON.**

### Success Response
```json
{
    "succeeded": true,
    "message": "Human-readable success message",
    "token": "JWT_TOKEN_STRING", // Optional (Login only)
    "user": { ... },            // Optional (Login only)
    "profiles": [ ... ]         // Optional (GetProfiles only)
}
```

### Failure Response (400/401/500)
```json
{
    "succeeded": false,
    "message": "Invalid or expired OTP."
}
```

---

## 2. The Authentication Flow

### Step A: Initial Login
Users can authenticate via **OTP (SMS/Email)** or **Social Login (Entra ID)**.
*   **Social Login**: If a user is new, they are auto-registered with **no roles**.
*   **OTP Login**: Use `APP_MODE=test` in the backend to see the generated code in the response body for debugging.

### Step B: Profile Discovery
Immediately after login, call:
`GET /api/profiles/{userId}`

*   **Case 1 (Empty List)**: The user is a guest/new social user. **Action**: Redirect to Onboarding/Role Selection.
*   **Case 2 (Single/Multiple Items)**: Returns available identities (Tenant, PropertyOwner). **Action**: Show "Choose Profile" screen.

---

## 3. Onboarding & Role Selection
For users with no roles, call:
`PATCH /api/profile/update`

### Payload
```json
{
    "userId": "GUID",
    "phoneNumber": "254...",
    "fullName": "John Doe",
    "role": "Tenant" // or "PropertyOwner"
}
```

### Business Logic
*   **First-Time Assignment**: The backend will automatically create the corresponding domain entity (Customer or PropertyOwner) and initialize a Wallet (for Owners).
*   **Consistency**: Updating the profile name or phone here will automatically sync those details across all linked identities (e.g., if I'm both a Tenant and Owner, both records are updated).

---

## 4. Hybrid Roles & Upgrades
A user can be both a **Tenant** and a **Property Owner** simultaneously.

### The Upgrade Process
If a user already has a role (e.g., Tenant) and tries to add a new one (e.g., PropertyOwner) via the `PATCH /profile/update` endpoint:
1.  The backend **blocks** the automatic update.
2.  The request is **logged as an Upgrade Request** for admin approval.
3.  **Frontend Action**: Inform the user that their request to add the new role has been sent to the admin for review.

---

## 5. Session Context (Profile Switching)
Once a user has multiple roles (after an upgrade is approved):
*   `GET /api/profiles/{userId}` will return multiple objects.
*   The frontend should store the `ProfileId` and `Role` of the **currently selected** profile to determine which dashboard (Tenant vs Owner) to display.
