import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Unit + component tests run in jsdom. Route Handlers that need a real Redis are
// covered by integration tests (see tests/integration), so they are excluded from
// the unit coverage gate; everything else meets the >= 90% bar.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        // Composition root and thin wiring (covered via integration / e2e).
        "src/app/**",
        "src/core/container.ts",
        // Redis adapters are covered by integration tests against a real Redis.
        "src/infrastructure/redis/**",
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
