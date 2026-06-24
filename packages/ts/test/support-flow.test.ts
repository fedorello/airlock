import { describe, expect, it } from "vitest";

import {
  Agent,
  AgentRunner,
  Approver,
  autoApproveDecisionSource,
  type CompletionResult,
  type DecisionSource,
  DecisionType,
  FakeLlmProvider,
  FixedClock,
  InMemoryAuditSink,
  InMemoryEventBus,
  InMemoryRunStore,
  RiskBasedGatePolicy,
  RiskTier,
  type RunState,
  RunStatus,
  SequentialIdGenerator,
  type Tool,
  type ToolCall,
  type ToolCallId,
} from "../src/index";

function tool(name: string, risk: RiskTier, executed: string[]): Tool {
  return {
    name,
    description: name,
    parameters: { type: "object" },
    risk,
    handler: () => {
      executed.push(name);
      return Promise.resolve("ok");
    },
  };
}

function call(id: string, name: string, args: Record<string, unknown>): ToolCall {
  return { id: id as ToolCallId, name, args };
}

function completion(text: string | null, calls: ToolCall[]): CompletionResult {
  return { text, toolCalls: calls };
}

interface WiredSystem {
  readonly agent: Agent;
  readonly store: InMemoryRunStore;
  readonly executed: string[];
}

/** Wire an Agent with a runner and an approver, all over one in-memory bus. */
async function wire(decide: DecisionSource, script: CompletionResult[]): Promise<WiredSystem> {
  const executed: string[] = [];
  const tools = [
    tool("lookup_order", RiskTier.Safe, executed),
    tool("issue_refund", RiskTier.Sensitive, executed),
    tool("send_email", RiskTier.Sensitive, executed),
  ];
  const bus = new InMemoryEventBus();
  const store = new InMemoryRunStore();
  const agent = new Agent({
    provider: new FakeLlmProvider(script),
    tools,
    events: bus,
    store,
    audit: new InMemoryAuditSink(),
    clock: new FixedClock(new Date("2026-01-01T00:00:00.000Z")),
    ids: new SequentialIdGenerator(),
    gatePolicy: new RiskBasedGatePolicy(),
    systemPrompt: "You are a support agent.",
  });
  await new AgentRunner({ agent, subscriber: bus }).start();
  await new Approver({ publisher: bus, subscriber: bus, decide }).start();
  return { agent, store, executed };
}

async function loadFinal(system: WiredSystem, state: RunState): Promise<RunState | null> {
  return system.store.load(state.runId);
}

describe("support flow (runner + approver + agent over the bus)", () => {
  it("auto-approval drives the whole flow to completion", async () => {
    const system = await wire(autoApproveDecisionSource("demo"), [
      completion(null, [call("c1", "lookup_order", { orderId: "ord-42" })]),
      completion(null, [call("c2", "issue_refund", { amount: 49.99 })]),
      completion(null, [call("c3", "send_email", { to: "alice@example.test" })]),
      completion("Refund issued and confirmation emailed.", []),
    ]);

    const started = await system.agent.run("Refund order ord-42 and email Alice");
    const final = await loadFinal(system, started);

    expect(final?.status).toBe(RunStatus.Completed);
    expect(system.executed).toEqual(["lookup_order", "issue_refund", "send_email"]);
  });

  it("rejection stops the sensitive action but the run still completes", async () => {
    const reject: DecisionSource = () =>
      Promise.resolve({ type: DecisionType.Reject, approver: "demo", reason: "not allowed" });
    const system = await wire(reject, [
      completion(null, [call("c1", "lookup_order", { orderId: "ord-42" })]),
      completion(null, [call("c2", "issue_refund", { amount: 49.99 })]),
      completion("I could not issue the refund.", []),
    ]);

    const started = await system.agent.run("Refund order ord-42");
    const final = await loadFinal(system, started);

    expect(final?.status).toBe(RunStatus.Completed);
    expect(system.executed).toEqual(["lookup_order"]);
  });
});
