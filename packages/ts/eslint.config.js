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
);
