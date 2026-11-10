import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: mode === "inventory" ? {
    proxy: { "/api/inventory": "http://127.0.0.1:3001" },
  } : undefined,
}));
