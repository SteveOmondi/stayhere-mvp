import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy: routes /api/* → Azure APIM, avoiding CORS on localhost.
 * Strips the /api/<service> prefix so the path reaches APIM correctly.
 * e.g. /api/property/listings → https://.../property/listings
 */
const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5200,
    open: true,
    proxy: {
      "/api/auth": {
        target: `${APIM}/auth`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/auth/, ""),
      },
      "/api/property": {
        target: `${APIM}/property`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/property/, ""),
      },
      "/api/customer": {
        target: `${APIM}/customers`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/customer/, ""),
      },
      "/api/static": {
        target: `${APIM}/staticdata`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/static/, ""),
      },
      "/api/ai": {
        target: `${APIM}/aiagent`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/api\/ai/, ""),
      },
    },
  },
});
