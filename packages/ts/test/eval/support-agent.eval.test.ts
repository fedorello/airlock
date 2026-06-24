import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  Agent,
  AgentRunner,
  Approver,
  AuditEventType,
  autoApproveDecisionSource,
  type CompletionResult,
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
} from "../../src/index";

// The agent eval suite (CODING_PRINCIPLES §10.6). Loads the same golden dataset
// the Python runner uses and asserts the wired agent reproduces it: the gate
// fires on every sensitive tool call and never on a safe one, and the execution
// sequence is correct.
const turnSchema = z.object({
  calls: z.array(z.string()).optional(),
  final: z.string().optional(),
});
const caseSchema = z.object({
  name: z.string(),
  request: z.string(),
  turns: z.array(turnSchema),
  expected_executed: z.array(z.string()),
  expected_gated: z.array(z.string()),
});
const datasetSchema = z.object({
  version: z.number(),
  tools: z.record(z.string(), z.string()),
  cases: z.array(caseSchema),
});
type EvalCase = z.infer<typeof caseSchema>;

const datasetUrl = new URL("../../../../evals/support-agent/golden-cases.json", import.meta.url);
const dataset = datasetSchema.parse(JSON.parse(readFileSync(datasetUrl, "utf8")) as unknown);

const FIXED_AT = new Date("2026-01-01T00:00:00.000Z");

function buildTools(toolsMap: Record<string, string>, executed: string[]): Tool[] {
  return Object.entries(toolsMap).map(([name, risk]) => ({
    name,
    description: name,
    parameters: { type: "object" },
    risk: risk === "sensitive" ? RiskTier.Sensitive : RiskTier.Safe,
    handler: () => {
      executed.push(name);
      return Promise.resolve("ok");
    },
  }));
}

function buildScript(testCase: EvalCase): CompletionResult[] {
  let counter = 0;
  return testCase.turns.map((turn) => {
    if (turn.final !== undefined) {
      return { text: turn.final, toolCalls: [] };
    }
    const calls: ToolCall[] = (turn.calls ?? []).map((name) => {
      counter += 1;
      return { id: `c${counter}` as ToolCallId, name, args: {} };
    });
    return { text: null, toolCalls: calls };
  });
}

async function runCase(
  testCase: EvalCase,
): Promise<{ final: RunState | null; executed: string[]; gated: string[] }> {
  const executed: string[] = [];
  const bus = new InMemoryEventBus();
  const store = new InMemoryRunStore();
  const audit = new InMemoryAuditSink();
  const agent = new Agent({
    provider: new FakeLlmProvider(buildScript(testCase)),
    tools: buildTools(dataset.tools, executed),
    events: bus,
    store,
    audit,
    clock: new FixedClock(FIXED_AT),
    ids: new SequentialIdGenerator(),
    gatePolicy: new RiskBasedGatePolicy(),
    systemPrompt: "eval",
  });
  await new AgentRunner({ agent, subscriber: bus }).start();
  await new Approver({
    publisher: bus,
    subscriber: bus,
    decide: autoApproveDecisionSource("eval"),
  }).start();

  const started = await agent.run(testCase.request);
  const final = await store.load(started.runId);
  const gated = audit
    .all()
    .filter((event) => event.type === AuditEventType.ApprovalRequested)
    .map((event) => String(event.data["tool"]));
  return { final, executed, gated };
}

describe("support-agent eval (golden dataset)", () => {
  it("has at least 30 cases", () => {
    expect(dataset.cases.length).toBeGreaterThanOrEqual(30);
  });

  it.each(dataset.cases.map((testCase) => [testCase.name, testCase] as [string, EvalCase]))(
    "%s",
    async (_name, testCase) => {
      const { final, executed, gated } = await runCase(testCase);

      expect(final?.status).toBe(RunStatus.Completed);
      expect(executed).toEqual(testCase.expected_executed);
      expect(gated).toEqual(testCase.expected_gated);
    },
  );
});
