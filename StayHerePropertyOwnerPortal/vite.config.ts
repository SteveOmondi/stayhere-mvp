import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy: by default forwards /api/<service>/* to the live Azure APIM gateway.
 *
 * To test against a local function app instead, set VITE_LOCAL_<SERVICE>=http://localhost:<port>
 * in a .env.local file (never committed) - same convention as StayHereClientApp/vite.config.ts.
 *
 * Example: GET /api/property/listings
 *       →  GET https://apim-dev-5c27bcf3.azure-api.net/property/listings (default)
 *       →  GET http://localhost:7101/api/listings (with VITE_LOCAL_PROPERTY set)
 */
const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const isLocal = (host?: string) => !!host;

  return {
    plugins: [react()],
    server: {
      port: 5101,
      open: true,
      proxy: {
        "/api/auth": {
          target: isLocal(env.VITE_LOCAL_AUTH) ? `${env.VITE_LOCAL_AUTH}/api` : `${APIM}/auth`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_AUTH),
          rewrite: (p) => p.replace(/^\/api\/auth/, ""),
        },
        "/api/owner": {
          target: isLocal(env.VITE_LOCAL_OWNER) ? `${env.VITE_LOCAL_OWNER}/api` : `${APIM}/propertyowner`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_OWNER),
          rewrite: (p) => p.replace(/^\/api\/owner/, ""),
        },
        "/api/property": {
          target: isLocal(env.VITE_LOCAL_PROPERTY) ? `${env.VITE_LOCAL_PROPERTY}/api` : `${APIM}/property`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_PROPERTY),
          rewrite: (p) => isLocal(env.VITE_LOCAL_PROPERTY) ? p.replace(/^\/api\/property/, "") : p.replace(/^\/api\/property/, "/api"),
        },
        "/api/customer": {
          target: isLocal(env.VITE_LOCAL_CUSTOMER) ? `${env.VITE_LOCAL_CUSTOMER}/api` : `${APIM}/customers`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_CUSTOMER),
          rewrite: (p) => p.replace(/^\/api\/customer/, ""),
        },
        "/api/static": {
          target: isLocal(env.VITE_LOCAL_STATIC) ? `${env.VITE_LOCAL_STATIC}/api` : `${APIM}/staticdata`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_STATIC),
          rewrite: (p) => p.replace(/^\/api\/static/, ""),
        },
        "/api/ai": {
          target: isLocal(env.VITE_LOCAL_AI) ? `${env.VITE_LOCAL_AI}/api` : `${APIM}/aiagent`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_AI),
          rewrite: (p) => p.replace(/^\/api\/ai/, ""),
        },
        "/api/payments": {
          target: isLocal(env.VITE_LOCAL_PAYMENTS) ? `${env.VITE_LOCAL_PAYMENTS}/api` : `${APIM}/payments`,
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_PAYMENTS),
          rewrite: (p) => p.replace(/^\/api\/payments/, ""),
        },
      },
    },
  };
});
