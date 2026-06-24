// Flat ESLint config (ESLint 10 + typescript-eslint). Strict TypeScript rules.
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "coverage/**"] },
  ...tseslint.configs.strict,
  ...tseslint.configs.stylistic,
  {
    rules: {
      // Allow intentionally unused identifiers when prefixed with an underscore.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  // Hexagonal boundaries: imports may only point inward (mirrors the Python
  // import-linter contract). The domain depends on nothing; the application
  // depends only on the domain; infrastructure must not reach the interface.
  {
    files: ["src/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/application/**", "**/infrastructure/**", "**/interface/**", "**/core/**"],
              message: "Domain must not import outer layers (hexagonal architecture).",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/application/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/infrastructure/**", "**/interface/**", "**/core/**"],
              message: "Application must not import infrastructure, interface, or core.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/infrastructure/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["**/interface/**"],
              message: "Infrastructure must not import the interface layer.",
            },
          ],
        },
      ],
    },
  },
);
