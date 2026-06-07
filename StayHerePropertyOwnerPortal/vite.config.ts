import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const APIM = "https://apim-dev-5c27bcf3.azure-api.net";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5101,
    open: true,
    proxy: {
      "/api/auth":     { target: `${APIM}/auth`,          changeOrigin: true, secure: true, rewrite: p => p.replace(/^\/api\/auth/, "") },
      "/api/owner":    { target: `${APIM}/propertyowner`, changeOrigin: true, secure: true, rewrite: p => p.replace(/^\/api\/owner/, "") },
      "/api/property": { target: `${APIM}/property`,      changeOrigin: true, secure: true, rewrite: p => p.replace(/^\/api\/property/, "") },
      "/api/customer": { target: `${APIM}/customers`,     changeOrigin: true, secure: true, rewrite: p => p.replace(/^\/api\/customer/, "") },
      "/api/static":   { target: `${APIM}/staticdata`,    changeOrigin: true, secure: true, rewrite: p => p.replace(/^\/api\/static/, "") },
      "/api/ai":       { target: `${APIM}/aiagent`,       changeOrigin: true, secure: true, rewrite: p => p.replace(/^\/api\/ai/, "") },
    },
  },
});
