# Postman

- **Collection:** `StayHere.postman_collection.json` — import into Postman (one collection, top-level folders per Function App; `PropertyService` has subfolders **Properties** and **Listings**).
- **Regenerate:** `python postman/generate_stayhere_collection.py`
- **Human-readable API map:** `docs/API-FunctionApps-and-Postman.md` (flows, every route, headers, and which portal uses what).

Default ports are **7100–7105** (see `scripts/README.md`). Collection variables already use those; adjust only if you override ports.

URL must include the Functions **`/api`** prefix (e.g. `http://localhost:7101/api`).
