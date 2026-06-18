import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Test harness for Olune's money-flow + delivery logic.
// Node environment only — these are pure-function / mocked-Supabase tests,
// no DOM needed. Path alias mirrors tsconfig's "@/*" → repo root.
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    exclude: ["tests/integration/**"],
    globals: false,
  },
});
