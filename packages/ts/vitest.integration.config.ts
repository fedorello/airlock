import { defineConfig } from "vitest/config";

// Integration tests run against real infrastructure (a Redis instance). They are
// gated to skip when Redis is unreachable, so this config can run anywhere; in
// CI and via Docker Compose, Redis is present and they execute for real.
export default defineConfig({
  test: {
    include: ["test/**/*.integration.test.ts"],
  },
});
