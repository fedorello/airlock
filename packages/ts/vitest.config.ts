import { configDefaults, defineConfig } from "vitest/config";

// The default run is the unit suite. Integration tests (`*.integration.test.ts`)
// need a real Redis and run via `pnpm test:integration`. The Redis adapters are
// covered there, so they are excluded from the unit coverage gate; everything
// else meets CODING_PRINCIPLES (>= 90% in key areas). Pure type modules are
// excluded so the gate measures real behavior.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    exclude: [...configDefaults.exclude, "test/**/*.integration.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/index.ts",
        "src/domain/**",
        "src/infrastructure/events/redis-event-bus.ts",
        "src/infrastructure/store/redis-run-store.ts",
      ],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
