import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Integration tests run the Redis adapters against a real Redis. They are
// skipped automatically when no Redis is reachable (see the test files).
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    environment: "node",
    include: ["tests/integration/**/*.integration.test.ts"],
  },
});
