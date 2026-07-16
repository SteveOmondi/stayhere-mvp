import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy: forwards /api/<service>/* to the live Azure APIM gateway,
 * stripping the /api/<service> prefix so paths reach APIM correctly.
 *
 * Example: GET /api/property/listings
 *       →  GET https://apim-dev-5c27bcf3.azure-api.net/property/listings
 */
const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5101,
    open: true,
    proxy: {
      "/api/auth":     { target: `${APIM}/auth`,          changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/api\/auth/,     "") },
      "/api/owner":    { target: `${APIM}/propertyowner`, changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/api\/owner/,    "") },
      "/api/property": { target: "http://localhost:7072",  changeOrigin: true, secure: false, rewrite: (p) => p.replace(/^\/api\/property/, "/api") },
      "/api/customer": { target: `${APIM}/customers`,     changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/api\/customer/, "") },
      "/api/static":   { target: `${APIM}/staticdata`,    changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/api\/static/,   "") },
      "/api/ai":       { target: `${APIM}/aiagent`,       changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/api\/ai/,       "") },
      "/api/payments": { target: `${APIM}/payments`,      changeOrigin: true, secure: true, rewrite: (p) => p.replace(/^\/api\/payments/, "") },
    },
  },
});
