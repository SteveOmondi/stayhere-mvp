import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Dev-only reverse proxy so the browser talks to `localhost:5173` only (no CORS).
 * Must match ports in repo `scripts/stayhere-function-ports.ps1`.
 */
const fn = {
  auth: "http://localhost:7100",
  property: "http://localhost:7101",
  customer: "http://localhost:7102",
  owner: "http://localhost:7103",
  static: "http://localhost:7104",
  ai: "http://localhost:7105",
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      "/stayhere-api/auth": {
        target: fn.auth,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/auth/, "/api"),
      },
      "/stayhere-api/property": {
        target: fn.property,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/property/, "/api"),
      },
      "/stayhere-api/customer": {
        target: fn.customer,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/customer/, "/api"),
      },
      "/stayhere-api/owner": {
        target: fn.owner,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/owner/, "/api"),
      },
      "/stayhere-api/static": {
        target: fn.static,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/static/, "/api"),
      },
      "/stayhere-api/ai": {
        target: fn.ai,
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/stayhere-api\/ai/, "/api"),
      },
    },
  },
});
