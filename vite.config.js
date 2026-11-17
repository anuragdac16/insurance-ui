import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The backend (Spring Boot) does not document CORS configuration, so the dev
// server proxies /api to it. The browser only ever talks to this origin.
const target = process.env.VITE_API_TARGET || "http://localhost:8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target, changeOrigin: true },
    },
  },
});
