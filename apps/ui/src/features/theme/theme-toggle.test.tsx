import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { ThemeToggle } from "./theme-toggle";

afterEach(() => {
  document.documentElement.classList.remove("dark");
  window.localStorage.clear();
});

describe("ThemeToggle", () => {
  it("turns dark mode off and remembers the choice", async () => {
    document.documentElement.classList.add("dark");
    render(<ThemeToggle />);

    await userEvent.click(
      screen.getByRole("button", { name: /toggle dark mode/i }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(window.localStorage.getItem("airlock-theme")).toBe("light");
  });

  it("turns dark mode on from light", async () => {
    render(<ThemeToggle />);

    await userEvent.click(
      screen.getByRole("button", { name: /toggle dark mode/i }),
    );

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(window.localStorage.getItem("airlock-theme")).toBe("dark");
  });
});
