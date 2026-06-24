import { describe, expect, it } from "vitest";

import {
  EventTopic,
  FakeLlmProvider,
  InMemoryAuditSink,
  InMemoryEventBus,
  InMemoryRunStore,
  RiskBasedGatePolicy,
  RiskTier,
  type RunId,
  RunStatus,
  type RunState,
  ScriptExhaustedError,
  SystemClock,
  type Tool,
  type ToolCall,
  type ToolCallId,
  UuidIdGenerator,
} from "../src/index";

function emptyRunState(): RunState {
  return {
    runId: "run-1" as RunId,
    status: RunStatus.Running,
    messages: [],
    pendingToolCalls: [],
    cursor: 0,
    approval: null,
    metadata: {},
  };
}

function tool(name: string, risk: RiskTier): Tool {
  return {
    name,
    description: "",
    parameters: {},
    risk,
    handler: () => Promise.resolve("ok"),
  };
}

const A_CALL: ToolCall = { id: "c1" as ToolCallId, name: "x", args: {} };

describe("RiskBasedGatePolicy", () => {
  const policy = new RiskBasedGatePolicy();

  it("does not gate safe tools", () => {
    const input = { tool: tool("x", RiskTier.Safe), toolCall: A_CALL, state: emptyRunState() };
    expect(policy.requiresApproval(input)).toBe(false);
  });

  it("gates sensitive tools", () => {
    const input = { tool: tool("x", RiskTier.Sensitive), toolCall: A_CALL, state: emptyRunState() };
    expect(policy.requiresApproval(input)).toBe(true);
  });
});

describe("FakeLlmProvider", () => {
  it("returns scripted completions in order", async () => {
    const provider = new FakeLlmProvider([
      { text: "first", toolCalls: [] },
      { text: "second", toolCalls: [] },
    ]);

    expect((await provider.complete()).text).toBe("first");
    expect((await provider.complete()).text).toBe("second");
  });

  it("throws when the script is exhausted", async () => {
    const provider = new FakeLlmProvider([]);

    await expect(provider.complete()).rejects.toBeInstanceOf(ScriptExhaustedError);
  });
});

describe("InMemoryRunStore", () => {
  it("returns null for an unknown run", async () => {
    const store = new InMemoryRunStore();

    expect(await store.load("run-x" as RunId)).toBeNull();
  });

  it("saves and loads a deep copy, not the same reference", async () => {
    const store = new InMemoryRunStore();
    const state = emptyRunState();

    await store.save(state);
    const loaded = await store.load(state.runId);

    expect(loaded).toEqual(state);
    expect(loaded).not.toBe(state);
  });
});

describe("InMemoryAuditSink", () => {
  it("collects recorded events in order", async () => {
    const sink = new InMemoryAuditSink();

    await sink.record({ runId: "run-1" as RunId, type: "model_called", at: "t", data: {} });

    expect(sink.all()).toHaveLength(1);
    expect(sink.all()[0]?.type).toBe("model_called");
  });
});

describe("InMemoryEventBus", () => {
  it("delivers a published event to its subscribers", async () => {
    const bus = new InMemoryEventBus();
    const received: number[] = [];
    await bus.subscribe<number>(EventTopic.RunFailed, (event) => {
      received.push(event);
    });

    await bus.publish<number>(EventTopic.RunFailed, 42);

    expect(received).toEqual([42]);
  });

  it("ignores a publish with no subscribers", async () => {
    const bus = new InMemoryEventBus();

    await expect(bus.publish(EventTopic.RunCompleted, {})).resolves.toBeUndefined();
  });
});

describe("SystemClock", () => {
  it("returns a Date", () => {
    expect(new SystemClock().now()).toBeInstanceOf(Date);
  });
});

describe("UuidIdGenerator", () => {
  it("produces distinct, prefixed identifiers", () => {
    const ids = new UuidIdGenerator();

    expect(ids.runId()).not.toBe(ids.runId());
    expect(ids.runId().startsWith("run-")).toBe(true);
    expect(ids.requestId().startsWith("req-")).toBe(true);
  });
});
