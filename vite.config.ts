// ... existing imports
export default defineConfig(({ mode }) => ({
  base: '/pupil-import-wizard-9117a8dc/', // <--- ADD THIS LINE (must include the slashes)
  server: {
    host: "::",
    // ... rest of your existing config
