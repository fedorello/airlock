import { describe, expect, it } from "vitest";

import {
  AuditEventType,
  DecisionType,
  MessageRole,
  type RequestId,
  RiskTier,
  RunNotFoundError,
  type RunId,
  RunStatus,
  UnknownToolError,
} from "../src/index";
import { buildHarness, completion, FIXED_AT, requireApproval, toolCall } from "./support/harness";

const SUPPORT_TOOLS = [
  { name: "search_kb", risk: RiskTier.Safe },
  { name: "send_email", risk: RiskTier.Sensitive },
] as const;

// The support flow as three model turns: search (safe) -> email (sensitive,
// gated) -> final answer.
const SEARCH_STEP = completion(null, [toolCall("c1", "search_kb", { query: "refund" })]);
const EMAIL_STEP = completion(null, [toolCall("c2", "send_email", { to: "alice@example.test" })]);
const FINAL_STEP = completion("All set — I've emailed the customer.", []);
const SUPPORT_SCRIPT = [SEARCH_STEP, EMAIL_STEP, FINAL_STEP];

const APPROVE = { type: DecisionType.Approve, approver: "alice" } as const;

describe("Agent — the gate", () => {
  it("runs a safe tool automatically and suspends on a sensitive tool", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });

    const state = await harness.agent.run("Help the customer with a refund");

    expect(state.status).toBe(RunStatus.AwaitingApproval);
    expect(state.approval?.toolCall.name).toBe("send_email");
    expect(harness.toolCalls.map((call) => call.name)).toEqual(["search_kb"]);
    expect(harness.approvalRequests).toHaveLength(1);
  });

  it("never runs the sensitive tool before approval", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });

    await harness.agent.run("Help");

    expect(harness.toolCalls.some((call) => call.name === "send_email")).toBe(false);
  });
});

describe("Agent — decisions", () => {
  it("approve executes the gated tool exactly once and completes", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });
    const request = requireApproval(await harness.agent.run("Help"));

    const completed = await harness.agent.resume(request.runId, request.requestId, APPROVE);

    expect(completed.status).toBe(RunStatus.Completed);
    expect(harness.toolCalls.map((call) => call.name)).toEqual(["search_kb", "send_email"]);
    expect(harness.completedRuns).toHaveLength(1);
  });

  it("edit replaces the arguments of the gated tool", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });
    const request = requireApproval(await harness.agent.run("Help"));

    await harness.agent.resume(request.runId, request.requestId, {
      type: DecisionType.Edit,
      approver: "alice",
      editedArgs: { to: "bob@example.test" },
    });

    const sent = harness.toolCalls.find((call) => call.name === "send_email");
    expect(sent?.args).toEqual({ to: "bob@example.test" });
  });

  it("reject does not execute the tool and lets the run continue", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });
    const request = requireApproval(await harness.agent.run("Help"));

    const completed = await harness.agent.resume(request.runId, request.requestId, {
      type: DecisionType.Reject,
      approver: "alice",
      reason: "Policy forbids emailing this customer",
    });

    expect(completed.status).toBe(RunStatus.Completed);
    expect(harness.toolCalls.some((call) => call.name === "send_email")).toBe(false);
    const rejection = completed.messages.find(
      (message) =>
        message.role === MessageRole.Tool && message.content.startsWith("Rejected by a human:"),
    );
    expect(rejection).toBeDefined();
  });

  it("is idempotent: replaying a decision does not execute the tool again", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });
    const request = requireApproval(await harness.agent.run("Help"));
    await harness.agent.resume(request.runId, request.requestId, APPROVE);

    const replay = await harness.agent.resume(request.runId, request.requestId, APPROVE);

    expect(replay.status).toBe(RunStatus.Completed);
    expect(harness.toolCalls.filter((call) => call.name === "send_email")).toHaveLength(1);
  });
});

describe("Agent — resume across processes", () => {
  it("resumes a persisted run in a fresh agent sharing the store", async () => {
    const first = await buildHarness({ tools: SUPPORT_TOOLS, script: [SEARCH_STEP, EMAIL_STEP] });
    const request = requireApproval(await first.agent.run("Help"));

    const second = await buildHarness({
      tools: SUPPORT_TOOLS,
      script: [completion("Emailed.", [])],
      store: first.store,
    });
    const completed = await second.agent.resume(request.runId, request.requestId, {
      type: DecisionType.Approve,
      approver: "carol",
    });

    expect(completed.status).toBe(RunStatus.Completed);
    expect(second.toolCalls.map((call) => call.name)).toEqual(["send_email"]);
  });
});

describe("Agent — multiple tool calls in one turn", () => {
  it("pauses at the gated call and resumes from the same cursor", async () => {
    const harness = await buildHarness({
      tools: [
        { name: "lookup_order", risk: RiskTier.Safe },
        { name: "issue_refund", risk: RiskTier.Sensitive, result: { refunded: true } },
      ],
      script: [
        completion(null, [
          toolCall("c1", "lookup_order", { id: "ord-1" }),
          toolCall("c2", "issue_refund", { amount: 10 }),
        ]),
        completion("Refund issued.", []),
      ],
    });

    const suspended = await harness.agent.run("Refund order ord-1");
    expect(harness.toolCalls.map((call) => call.name)).toEqual(["lookup_order"]);
    expect(suspended.approval?.toolCall.name).toBe("issue_refund");

    const request = requireApproval(suspended);
    const completed = await harness.agent.resume(request.runId, request.requestId, APPROVE);

    expect(completed.status).toBe(RunStatus.Completed);
    expect(harness.toolCalls.map((call) => call.name)).toEqual(["lookup_order", "issue_refund"]);
  });
});

describe("Agent — errors", () => {
  it("raises UnknownToolError when the model names an unregistered tool", async () => {
    const harness = await buildHarness({
      tools: [],
      script: [completion(null, [toolCall("c1", "ghost_tool", {})])],
    });

    await expect(harness.agent.run("x")).rejects.toBeInstanceOf(UnknownToolError);
  });

  it("raises RunNotFoundError when resuming an unknown run", async () => {
    const harness = await buildHarness({ tools: [], script: [completion("hi", [])] });

    await expect(
      harness.agent.resume("run-missing" as RunId, "req-1" as RequestId, APPROVE),
    ).rejects.toBeInstanceOf(RunNotFoundError);
  });
});

describe("Agent — audit", () => {
  it("records the full audit trail with the injected clock", async () => {
    const harness = await buildHarness({ tools: SUPPORT_TOOLS, script: SUPPORT_SCRIPT });
    const request = requireApproval(await harness.agent.run("Help"));
    await harness.agent.resume(request.runId, request.requestId, APPROVE);

    const types = harness.audit.all().map((event) => event.type);
    expect(types).toContain(AuditEventType.ModelCalled);
    expect(types).toContain(AuditEventType.ToolExecuted);
    expect(types).toContain(AuditEventType.ApprovalRequested);
    expect(types).toContain(AuditEventType.ApprovalDecided);
    expect(types).toContain(AuditEventType.RunCompleted);
    expect(harness.audit.all()[0]?.at).toBe(FIXED_AT);
  });

  it("renders object and undefined tool results as strings", async () => {
    const harness = await buildHarness({
      tools: [
        { name: "as_object", risk: RiskTier.Safe, result: { ok: true } },
        { name: "as_nothing", risk: RiskTier.Safe, result: undefined },
      ],
      script: [
        completion(null, [toolCall("c1", "as_object", {})]),
        completion(null, [toolCall("c2", "as_nothing", {})]),
        completion("done", []),
      ],
    });

    const state = await harness.agent.run("x");

    const toolMessages = state.messages.filter((message) => message.role === MessageRole.Tool);
    expect(toolMessages[0]?.content).toBe('{"ok":true}');
    expect(toolMessages[1]?.content).toBe("null");
  });
});
