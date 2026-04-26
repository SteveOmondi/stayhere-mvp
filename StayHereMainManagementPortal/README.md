# StayHere Main Management Portal

Operations console for **property owners**, **properties & listings**, **agents & caretakers**, and **customers**, wired to your StayHere Azure Functions (default ports **7100–7105**).

## Stack

- **Vite 5** + **React 18** + **TypeScript**
- **Tailwind CSS** (navy / gold real-estate palette, hero photography via Unsplash)
- **React Router** SPA

## Run locally

1. Start the Function Apps (see repo `scripts/README.md`).
2. Copy environment defaults:

   ```powershell
   copy .env.example .env.local
   ```

3. Install and dev server:

   ```powershell
   npm install
   npm run dev
   ```

   Opens **http://localhost:5173** (Vite).

4. Open **Settings** in the sidebar and confirm API base URLs and **Default X-User-Id** (a property-owner GUID). PropertyService writes require `X-User-Id` when `SKIP_AUTH=true` on that host.

   In dev, defaults are same-origin paths like `/stayhere-api/property`; Vite rewrites them to `http://localhost:7101/api` (see `vite.config.ts`), so you avoid browser CORS without changing the Function Apps.

## Build

```powershell
npm run build
```

Output in `dist/` — host with any static file server or Azure Static Web Apps.

## Features (current)

| Area | What you can do |
|------|------------------|
| **Dashboard** | Live counts (owners, properties, customers) + quick links |
| **Property owners** | Paginated list, **create owner**, open detail |
| **Owner detail** | Wallet, properties, listings, **create agent/caretaker**, **create listing** under a property |
| **Properties** | Universal list, filter `?ownerId=`, **create/edit** (uses X-User-Id) |
| **Listings** | **POST search**, assign **agent** or **caretaker** to a listing (modal) |
| **Agents & caretakers** | **Universal flattened directory** across all owners |
| **Customers** | Full list + **detail** with documents |
| **Settings** | Persist API bases, default owner id, static-data bearer token |

## CORS

- **Development (`npm run dev`)**: The Vite dev server proxies `/stayhere-api/*` to each Function App port; the portal defaults to those paths so the browser only talks to `localhost:5173` (no cross-origin, no CORS preflight issues for normal API calls).
- **Production**: Either configure CORS on the APIs for your portal origin, or put the SPA and APIs behind one host (reverse proxy / API gateway) so they share an origin.

## Production

Point Settings (or `.env.local` / build-time env) at your deployed Function URLs. Keep HTTPS and secure auth in front of these APIs for real environments — the MVP hosts are mostly anonymous at the trigger level.
