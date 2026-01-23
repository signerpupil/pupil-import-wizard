import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  // Base path uses GITHUB_REPOSITORY env var in CI, or falls back to repo name
  // For local development, use root path
  base: mode === "production" 
    ? (process.env.GITHUB_REPOSITORY 
        ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` 
        : "/pupil-import-wizard/")
    : "/",
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
