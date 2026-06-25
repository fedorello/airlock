import { firstNumber, firstString, formatMoney } from "./args";

/** Turn a raw tool call into a short, human sentence for the operator, so the
 * card reads like "Issue a refund — $49.99 · order ord-42" instead of jargon. */

const ACTION_VERBS: Record<string, string> = {
  issue_refund: "Issue a refund",
  send_email: "Send an email",
  wire_transfer: "Wire money",
  transfer_funds: "Transfer funds",
  delete_record: "Delete a record",
  lookup_order: "Look up an order",
  search_knowledge_base: "Search the knowledge base",
};

export interface ActionSummary {
  title: string;
  detail: string;
}

export function humanizeAction(
  toolName: string,
  args: Record<string, unknown>,
): ActionSummary {
  return {
    title: ACTION_VERBS[toolName] ?? titleize(toolName),
    detail: describeArgs(args),
  };
}

function titleize(name: string): string {
  const words = name.replace(/[_-]+/g, " ").trim();
  return words.length === 0
    ? name
    : words.charAt(0).toUpperCase() + words.slice(1);
}

function describeArgs(args: Record<string, unknown>): string {
  const parts: string[] = [];
  const amount = firstNumber(args, ["amount", "value", "total"]);
  if (amount !== null) {
    parts.push(formatMoney(amount));
  }
  const to = firstString(args, ["to", "recipient", "email"]);
  if (to !== null) {
    parts.push(`to ${to}`);
  }
  const order = firstString(args, ["orderId", "order_id", "order"]);
  if (order !== null) {
    parts.push(`order ${order}`);
  }
  const subject = firstString(args, ["subject"]);
  if (subject !== null) {
    parts.push(`“${subject}”`);
  }
  return parts.join(" · ");
}
