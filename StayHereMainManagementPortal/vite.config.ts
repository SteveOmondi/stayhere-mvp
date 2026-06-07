import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev proxy: routes /stayhere-api/* → Azure APIM, avoiding CORS on localhost.
 * Strips the /stayhere-api/<service> prefix so the path reaches APIM correctly.
 * e.g. /stayhere-api/owner/owners/list → https://.../propertyowner/owners/list
 */
const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5100,
    open: true,
    proxy: {
      "/stayhere-api/auth": {
        target: `${APIM}/auth`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/auth/, ""),
      },
      "/stayhere-api/owner": {
        target: `${APIM}/propertyowner`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/owner/, ""),
      },
      "/stayhere-api/property": {
        target: `${APIM}/property`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/property/, ""),
      },
      "/stayhere-api/customer": {
        target: `${APIM}/customers`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/customer/, ""),
      },
      "/stayhere-api/static": {
        target: `${APIM}/staticdata`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/static/, ""),
      },
      "/stayhere-api/ai": {
        target: `${APIM}/aiagent`,
        changeOrigin: true,
        secure: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/ai/, ""),
      },
    },
  },
});
