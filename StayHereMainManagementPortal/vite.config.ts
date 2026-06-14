import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// ── Production: Azure APIM ────────────────────────────────────────────────────
// const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

// ── Local development: Azure Functions running on localhost ───────────────────
// Start each service with: func host start --port <PORT>
//   AuthService:            7071
//   PropertyService:        7072
//   PropertyOwnerService:   7073
//   CustomerService:        7074
//   StaticDataService:      7075
//   AiAgentService:         7076
//   PaymentsService:        7077
const LOCAL = {
  auth:     "http://localhost:7071",
  property: "http://localhost:7072",
  owner:    "http://localhost:7073",
  customer: "http://localhost:7074",
  static:   "http://localhost:7075",
  ai:       "http://localhost:7076",
  payments: "http://localhost:7077",
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5100,
    open: true,
    proxy: {
      // ── LOCAL ────────────────────────────────────────────────────────────────
      // Strips the /stayhere-api/<service> prefix and rewrites to /api so the
      // function app routes match correctly.
      // e.g. /stayhere-api/property/listings → http://localhost:7072/api/listings
      "/stayhere-api/auth":     { target: LOCAL.auth,     changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/auth/,     "/api") },
      "/stayhere-api/owner":    { target: LOCAL.owner,    changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/owner/,    "/api") },
      "/stayhere-api/property": { target: LOCAL.property, changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/property/, "/api") },
      "/stayhere-api/customer": { target: LOCAL.customer, changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/customer/, "/api") },
      "/stayhere-api/static":   { target: LOCAL.static,   changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/static/,   "/api") },
      "/stayhere-api/ai":       { target: LOCAL.ai,       changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/ai/,       "/api") },
      "/stayhere-api/payments": { target: LOCAL.payments, changeOrigin: true, rewrite: (p) => p.replace(/^\/stayhere-api\/payments/, "/api") },

      // ── PRODUCTION (APIM) — uncomment to switch back ────────────────────────
      // "/stayhere-api/auth":     { target: `${APIM}/auth`,          changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/stayhere-api\/auth/, "") },
      // "/stayhere-api/owner":    { target: `${APIM}/propertyowner`, changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/stayhere-api\/owner/, "") },
      // "/stayhere-api/property": { target: `${APIM}/property`,      changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/stayhere-api\/property/, "") },
      // "/stayhere-api/customer": { target: `${APIM}/customers`,     changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/stayhere-api\/customer/, "") },
      // "/stayhere-api/static":   { target: `${APIM}/staticdata`,    changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/stayhere-api\/static/, "") },
      // "/stayhere-api/ai":       { target: `${APIM}/aiagent`,       changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/stayhere-api\/ai/, "") },
    },
  },
});
