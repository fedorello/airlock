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
        "src/app/layout.tsx",
        "src/app/page.tsx",
        "src/**/*.d.ts",
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
