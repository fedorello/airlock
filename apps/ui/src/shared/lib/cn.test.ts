import { describe, expect, it } from "vitest";

import { cn } from "@/shared/lib/cn";

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("drops falsy values", () => {
    expect(cn("a", false, undefined, "b")).toBe("a b");
  });

  it("resolves conflicting Tailwind utilities (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});
