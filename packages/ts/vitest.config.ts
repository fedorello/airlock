import { defineConfig } from "vitest/config";

// Coverage gate matches CODING_PRINCIPLES (>= 90% in key areas). Pure type
// modules (no executable logic) are excluded so the gate measures real behavior.
export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/index.ts", "src/domain/**"],
      thresholds: {
        lines: 90,
        branches: 90,
        functions: 90,
        statements: 90,
      },
    },
  },
});
