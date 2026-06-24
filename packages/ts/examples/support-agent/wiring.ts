import {
  type CompletionResult,
  RiskTier,
  type Tool,
  type ToolCall,
  type ToolCallId,
} from "../../src/index";

export const SUPPORT_SYSTEM_PROMPT =
  "You are Aria, a calm, careful customer-support agent for a small online store. " +
  "Use the tools to look things up. Refunds and emails are sensitive: they are " +
  "reviewed by a human before they happen.";

export const SUPPORT_REQUEST =
  "Alice (alice@example.test) wants a refund on order ord-42 and an email confirming it.";

function call(id: string, name: string, args: Record<string, unknown>): ToolCall {
  return { id: id as ToolCallId, name, args };
}

/**
 * A fixed model script so the demo is deterministic without a real model. The
 * agent looks up the order (safe), then proposes a refund and an email (both
 * sensitive, so both pass through the gate), then answers.
 */
export const SUPPORT_SCRIPT: CompletionResult[] = [
  { text: null, toolCalls: [call("c1", "lookup_order", { orderId: "ord-42" })] },
  { text: null, toolCalls: [call("c2", "issue_refund", { orderId: "ord-42", amount: 49.99 })] },
  {
    text: null,
    toolCalls: [
      call("c3", "send_email", {
        to: "alice@example.test",
        subject: "Your refund",
        body: "Hi Alice, your $49.99 refund is on its way.",
      }),
    ],
  },
  {
    text: "Done — I refunded order ord-42 ($49.99) and emailed Alice a confirmation.",
    toolCalls: [],
  },
];

/** Build the support tools. Handlers print what they do and return a result. */
export function createSupportTools(log: (message: string) => void): Tool[] {
  const make = (name: string, risk: RiskTier, result: unknown): Tool => ({
    name,
    description: name,
    parameters: { type: "object" },
    risk,
    handler: (args) => {
      log(`[TOOL] ${name}(${JSON.stringify(args)})`);
      return Promise.resolve(result);
    },
  });
  return [
    make("search_knowledge_base", RiskTier.Safe, "Refunds are allowed within 30 days of purchase."),
    make("lookup_order", RiskTier.Safe, {
      orderId: "ord-42",
      customer: "Alice",
      amount: 49.99,
      withinReturnWindow: true,
    }),
    make("issue_refund", RiskTier.Sensitive, { status: "refunded", amount: 49.99 }),
    make("send_email", RiskTier.Sensitive, { status: "sent" }),
  ];
}
