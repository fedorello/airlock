import { firstNumber, firstString, formatMoney } from "./args";

// Honest, simple heuristics — not an injection detector. They flag actions worth
// a careful look (we cannot tell a real instruction from an injected one; that is
// exactly why a human is in the loop).
const LARGE_AMOUNT_USD = 1000;
const DESTRUCTIVE_TOOL = /delete|remove|drop|wipe|destroy/i;

/** Reasons this action is high-impact and deserves a careful review. Empty when
 * nothing stands out. */
export function assessActionRisk(
  toolName: string,
  args: Record<string, unknown>,
): string[] {
  const flags: string[] = [];

  const amount = firstNumber(args, ["amount", "value", "total"]);
  if (amount !== null && amount >= LARGE_AMOUNT_USD) {
    flags.push(`Moves ${formatMoney(amount)}`);
  }

  const recipient = firstString(args, ["to", "recipient", "email"]);
  if (recipient !== null) {
    flags.push(`Sends to ${recipient}`);
  }

  if (DESTRUCTIVE_TOOL.test(toolName)) {
    flags.push("Deletes or destroys data");
  }

  return flags;
}
