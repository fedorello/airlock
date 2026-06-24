import {
  Agent,
  type ApprovalRequest,
  type CompletionResult,
  EventTopic,
  FakeLlmProvider,
  FixedClock,
  InMemoryAuditSink,
  InMemoryEventBus,
  InMemoryRunStore,
  RiskBasedGatePolicy,
  type RiskTier,
  type RunCompletedEvent,
  type RunState,
  SequentialIdGenerator,
  type Tool,
  type ToolCall,
  type ToolCallId,
} from "../../src/index";

/** The fixed instant every test clock reports, so audit timestamps are stable. */
const FIXED_INSTANT = new Date("2026-01-01T00:00:00.000Z");
export const FIXED_AT = FIXED_INSTANT.toISOString();

export interface RecordedCall {
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
}

export interface ToolSpec {
  readonly name: string;
  readonly risk: RiskTier;
  /** Value the handler returns. Omit for the default string result. */
  readonly result?: unknown;
}

export interface Harness {
  readonly agent: Agent;
  readonly store: InMemoryRunStore;
  readonly audit: InMemoryAuditSink;
  readonly toolCalls: readonly RecordedCall[];
  readonly approvalRequests: readonly ApprovalRequest[];
  readonly completedRuns: readonly RunCompletedEvent[];
}

export interface HarnessSpec {
  readonly tools: readonly ToolSpec[];
  readonly script: readonly CompletionResult[];
  /** Reuse an existing store to simulate resuming in another process. */
  readonly store?: InMemoryRunStore;
}

/** Wire an Agent up with in-memory fakes and capture what it does. */
export async function buildHarness(spec: HarnessSpec): Promise<Harness> {
  const toolCalls: RecordedCall[] = [];
  const tools = spec.tools.map((toolSpec) => createTool(toolSpec, toolCalls));

  const events = new InMemoryEventBus();
  const store = spec.store ?? new InMemoryRunStore();
  const audit = new InMemoryAuditSink();

  const approvalRequests: ApprovalRequest[] = [];
  const completedRuns: RunCompletedEvent[] = [];
  await events.subscribe<ApprovalRequest>(EventTopic.ApprovalRequested, (event) => {
    approvalRequests.push(event);
  });
  await events.subscribe<RunCompletedEvent>(EventTopic.RunCompleted, (event) => {
    completedRuns.push(event);
  });

  const agent = new Agent({
    provider: new FakeLlmProvider(spec.script),
    tools,
    events,
    store,
    audit,
    clock: new FixedClock(FIXED_INSTANT),
    ids: new SequentialIdGenerator(),
    gatePolicy: new RiskBasedGatePolicy(),
    systemPrompt: "You are a test agent.",
  });

  return { agent, store, audit, toolCalls, approvalRequests, completedRuns };
}

function createTool(spec: ToolSpec, sink: RecordedCall[]): Tool {
  const result = "result" in spec ? spec.result : "ok";
  return {
    name: spec.name,
    description: `Tool ${spec.name}`,
    parameters: { type: "object" },
    risk: spec.risk,
    handler: (args) => {
      sink.push({ name: spec.name, args });
      return Promise.resolve(result);
    },
  };
}

export function toolCall(id: string, name: string, args: Record<string, unknown>): ToolCall {
  return { id: id as ToolCallId, name, args };
}

export function completion(text: string | null, calls: readonly ToolCall[]): CompletionResult {
  return { text, toolCalls: calls };
}

/** Assert the run is awaiting approval and return the open request (no `!`). */
export function requireApproval(state: RunState): ApprovalRequest {
  if (state.approval === null) {
    throw new Error("expected the run to be awaiting approval");
  }
  return state.approval;
}
