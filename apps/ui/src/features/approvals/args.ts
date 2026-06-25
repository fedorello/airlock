/** Small helpers for reading values out of a tool call's arguments. */

const MONEY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(amount: number): string {
  return MONEY.format(amount);
}

export function firstString(
  args: Record<string, unknown>,
  keys: string[],
): string | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value !== "") {
      return value;
    }
  }
  return null;
}

export function firstNumber(
  args: Record<string, unknown>,
  keys: string[],
): number | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "number") {
      return value;
    }
  }
  return null;
}
