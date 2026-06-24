import { describe, expect, it } from "vitest";

import { FixedClock, SystemClock } from "@/core/clock";

describe("FixedClock", () => {
  it("always returns the given instant", () => {
    const instant = new Date("2026-01-01T00:00:00.000Z");

    expect(new FixedClock(instant).now()).toEqual(instant);
  });
});

describe("SystemClock", () => {
  it("returns a Date", () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
  });
});
