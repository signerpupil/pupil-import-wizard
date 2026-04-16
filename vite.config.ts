import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// App version: GitHub Pages workflow can pass GIT_SHA via env.
// Falls back to a build-time timestamp.
const APP_VERSION =
  process.env.GIT_SHA ||
  process.env.GITHUB_SHA ||
  new Date().toISOString().slice(0, 16);

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Only use base path for GitHub Pages when GITHUB_PAGES env is set
  // Lovable publishing uses root path
  base: process.env.GITHUB_PAGES === 'true' ? "/pupil-import-wizard/" : "/",
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(APP_VERSION),
  },
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
