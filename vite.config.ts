import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const base = process.env.VITE_BASE_PATH ?? "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".mjs", ".json"],
    alias: {
      "@": "/src"
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"]
  }
});
