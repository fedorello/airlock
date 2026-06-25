import { describe, expect, it } from "vitest";

import { firstNumber, firstString, formatMoney } from "./args";

describe("args helpers", () => {
  it("formats USD amounts", () => {
    expect(formatMoney(5000)).toBe("$5,000.00");
    expect(formatMoney(49.99)).toBe("$49.99");
  });

  it("returns the first non-empty string for the given keys", () => {
    expect(firstString({ a: "", b: "x" }, ["a", "b"])).toBe("x");
    expect(firstString({ a: 1 }, ["a"])).toBeNull();
    expect(firstString({}, ["a"])).toBeNull();
  });

  it("returns the first number for the given keys", () => {
    expect(firstNumber({ a: "5", b: 7 }, ["a", "b"])).toBe(7);
    expect(firstNumber({}, ["a"])).toBeNull();
  });
});
