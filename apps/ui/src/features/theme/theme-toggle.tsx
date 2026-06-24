"use client";

import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "airlock-theme";

/** Flips the `dark` class on <html> and remembers the choice. No React state:
 * the class is the source of truth, so there is no SSR/hydration mismatch. */
export function ThemeToggle() {
  const toggle = (): void => {
    const isDark = document.documentElement.classList.toggle("dark");
    window.localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="hover:bg-muted text-muted-foreground rounded-md p-2 transition-colors"
    >
      <Sun className="hidden size-5 dark:block" aria-hidden />
      <Moon className="size-5 dark:hidden" aria-hidden />
    </button>
  );
}
