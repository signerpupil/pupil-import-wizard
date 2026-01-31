// @ts-nocheck
// Standalone build configuration for offline HTML version
// Build with: npm run build:standalone
// This file is excluded from the normal build process

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(async () => {
  // Dynamic import to avoid issues when plugin is not installed
  const { viteSingleFile } = await import("vite-plugin-singlefile");
  
  return {
    base: "./",
    plugins: [react(), viteSingleFile()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      outDir: "dist-standalone",
      rollupOptions: {
        input: "index.standalone.html",
      },
    },
    define: {
      // Prevent Supabase client errors in standalone mode
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(''),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(''),
    },
  };
});
