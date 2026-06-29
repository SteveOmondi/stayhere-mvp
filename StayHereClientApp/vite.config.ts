import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy: by default forwards /api/<service>/* to the live Azure APIM gateway.
 *
 * To test against a local function app instead, set VITE_LOCAL_<SERVICE>=http://localhost:<port>
 * in a .env.local file (never committed). The proxy will then route to that function app's
 * /api/* routes directly instead of going through APIM.
 *
 * Example .env.local:
 *   VITE_LOCAL_PROPERTY=http://localhost:7072
 *   VITE_LOCAL_AUTH=http://localhost:7071
 *
 * Example (APIM):  GET /api/property/listings/featured
 *               →  GET https://apim-dev-5c27bcf3.azure-api.net/property/listings/featured
 * Example (local): GET /api/property/listings/featured
 *               →  GET http://localhost:7072/api/listings/featured
 */
const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");

  function proxyTarget(localHost: string | undefined, apimPath: string): string {
    return localHost ? `${localHost}/api` : `${APIM}/${apimPath}`;
  }

  function isLocal(localHost: string | undefined): boolean {
    return !!localHost;
  }

  return {
    plugins: [react()],
    server: {
      port: 5200,
      open: true,
      proxy: {
        "/api/auth": {
          target: proxyTarget(env.VITE_LOCAL_AUTH, "auth"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_AUTH),
          rewrite: (p) => p.replace(/^\/api\/auth/, ""),
        },
        "/api/property": {
          target: proxyTarget(env.VITE_LOCAL_PROPERTY, "property"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_PROPERTY),
          rewrite: (p) => p.replace(/^\/api\/property/, ""),
        },
        "/api/customer": {
          target: proxyTarget(env.VITE_LOCAL_CUSTOMER, "customers"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_CUSTOMER),
          rewrite: (p) => p.replace(/^\/api\/customer/, ""),
        },
        "/api/owner": {
          target: proxyTarget(env.VITE_LOCAL_OWNER, "propertyowner"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_OWNER),
          rewrite: (p) => p.replace(/^\/api\/owner/, ""),
        },
        "/api/static": {
          target: proxyTarget(env.VITE_LOCAL_STATIC, "staticdata"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_STATIC),
          rewrite: (p) => p.replace(/^\/api\/static/, ""),
        },
        "/api/ai": {
          target: proxyTarget(env.VITE_LOCAL_AI, "aiagent"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_AI),
          rewrite: (p) => p.replace(/^\/api\/ai/, ""),
        },
        "/api/payments": {
          target: proxyTarget(env.VITE_LOCAL_PAYMENTS, "payments"),
          changeOrigin: true,
          secure: !isLocal(env.VITE_LOCAL_PAYMENTS),
          rewrite: (p) => p.replace(/^\/api\/payments/, ""),
        },
      },
    },
  };
});
