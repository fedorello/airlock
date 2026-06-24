import { describe, expect, it } from "vitest";

import { RunStatus, decisionSchema, runStateSchema } from "@/domain/contract";

const VALID_RUN = {
  runId: "run-1",
  status: "awaiting_approval",
  messages: [
    { role: "user", content: "Refund Alice" },
    {
      role: "assistant",
      content: "",
      toolCalls: [{ id: "c1", name: "issue_refund", args: { amount: 49.99 } }],
    },
  ],
  pendingToolCalls: [
    { id: "c1", name: "issue_refund", args: { amount: 49.99 } },
  ],
  cursor: 0,
  approval: {
    runId: "run-1",
    requestId: "req-1",
    toolCall: { id: "c1", name: "issue_refund", args: { amount: 49.99 } },
    risk: "sensitive",
    context: {},
  },
  metadata: {},
};

describe("runStateSchema", () => {
  it("parses a valid awaiting run", () => {
    const run = runStateSchema.parse(VALID_RUN);

    expect(run.status).toBe(RunStatus.AwaitingApproval);
    expect(run.approval?.toolCall.name).toBe("issue_refund");
  });

  it("rejects an unknown status", () => {
    expect(() =>
      runStateSchema.parse({ ...VALID_RUN, status: "paused" }),
    ).toThrow();
  });

  it("rejects a missing field", () => {
    expect(() =>
      runStateSchema.parse({ ...VALID_RUN, runId: undefined }),
    ).toThrow();
  });
});

describe("decisionSchema", () => {
  it("parses approve, edit, and reject", () => {
    expect(decisionSchema.parse({ type: "approve", approver: "a" }).type).toBe(
      "approve",
    );
    expect(
      decisionSchema.parse({
        type: "edit",
        approver: "a",
        editedArgs: { x: 1 },
      }).type,
    ).toBe("edit");
    expect(
      decisionSchema.parse({ type: "reject", approver: "a", reason: "no" })
        .type,
    ).toBe("reject");
  });

  it("rejects an edit without editedArgs", () => {
    expect(() =>
      decisionSchema.parse({ type: "edit", approver: "a" }),
    ).toThrow();
  });
});
