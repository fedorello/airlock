import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Extend Vitest's `expect` with the jest-dom matchers (toBeInTheDocument, ...).
import "@testing-library/jest-dom/vitest";

// Unmount React trees between tests (auto-cleanup is not registered when Vitest
// globals are disabled), so queries don't see leftover DOM.
afterEach(() => {
  cleanup();
});
