import { describe, expect, it } from "vitest";

import { type RunState, RunStatus } from "@/domain/contract";
import { toPendingApproval } from "@/domain/pending-approval";

function awaitingRun(overrides: Partial<RunState> = {}): RunState {
  return {
    runId: "run-1",
    status: RunStatus.AwaitingApproval,
    messages: [
      { role: "user", content: "Refund Alice" },
      { role: "assistant", content: "", toolCalls: [] },
    ],
    pendingToolCalls: [],
    cursor: 0,
    approval: {
      runId: "run-1",
      requestId: "req-1",
      toolCall: { id: "c1", name: "issue_refund", args: { amount: 49.99 } },
      risk: "sensitive",
      context: {},
    },
    metadata: {},
    ...overrides,
  };
}

describe("toPendingApproval", () => {
  it("maps an awaiting run to a pending approval", () => {
    const pending = toPendingApproval(awaitingRun());

    expect(pending).not.toBeNull();
    expect(pending?.requestId).toBe("req-1");
    expect(pending?.toolName).toBe("issue_refund");
    expect(pending?.args).toEqual({ amount: 49.99 });
    expect(pending?.risk).toBe("sensitive");
    expect(pending?.request).toBe("Refund Alice");
  });

  it("returns null for a run that is not awaiting approval", () => {
    expect(
      toPendingApproval(awaitingRun({ status: RunStatus.Completed })),
    ).toBeNull();
  });

  it("returns null when there is no approval", () => {
    expect(toPendingApproval(awaitingRun({ approval: null }))).toBeNull();
  });

  it("falls back to an empty request when there is no user message", () => {
    const pending = toPendingApproval(awaitingRun({ messages: [] }));

    expect(pending?.request).toBe("");
  });
});
