import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Extend Vitest's `expect` with the jest-dom matchers (toBeInTheDocument, ...).
import "@testing-library/jest-dom/vitest";

// jsdom in this Node version does not expose a working localStorage; provide a
// minimal in-memory one so components and tests that touch it behave normally.
function createMemoryStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length(): number {
      return store.size;
    },
    clear(): void {
      store.clear();
    },
    getItem(key: string): string | null {
      return store.get(key) ?? null;
    },
    key(index: number): string | null {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string): void {
      store.delete(key);
    },
    setItem(key: string, value: string): void {
      store.set(key, value);
    },
  };
}

Object.defineProperty(window, "localStorage", {
  value: createMemoryStorage(),
  configurable: true,
});

// Unmount React trees between tests (auto-cleanup is not registered when Vitest
// globals are disabled), so queries don't see leftover DOM.
afterEach(() => {
  cleanup();
});
