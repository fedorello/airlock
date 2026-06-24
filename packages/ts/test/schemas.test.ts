import { describe, expect, it } from "vitest";

import { DecisionType, parseApprovalDecided, parseApprovalRequested, RiskTier } from "../src/index";

describe("parseApprovalDecided", () => {
  it("decodes an approve decision", () => {
    const event = parseApprovalDecided({
      runId: "run-1",
      requestId: "req-1",
      decision: { type: DecisionType.Approve, approver: "alice" },
    });

    expect(event.runId).toBe("run-1");
    expect(event.decision).toEqual({ type: DecisionType.Approve, approver: "alice" });
  });

  it("decodes an edit decision with arguments", () => {
    const event = parseApprovalDecided({
      runId: "run-1",
      requestId: "req-1",
      decision: { type: DecisionType.Edit, approver: "alice", editedArgs: { to: "x@y.test" } },
    });

    expect(event.decision).toEqual({
      type: DecisionType.Edit,
      approver: "alice",
      editedArgs: { to: "x@y.test" },
    });
  });

  it("rejects a malformed event", () => {
    expect(() => parseApprovalDecided({ runId: "run-1" })).toThrow();
  });

  it("rejects an unknown decision type", () => {
    expect(() =>
      parseApprovalDecided({
        runId: "run-1",
        requestId: "req-1",
        decision: { type: "maybe", approver: "alice" },
      }),
    ).toThrow();
  });
});

describe("parseApprovalRequested", () => {
  it("decodes a valid request", () => {
    const request = parseApprovalRequested({
      runId: "run-1",
      requestId: "req-1",
      toolCall: { id: "c1", name: "send_email", args: { to: "x@y.test" } },
      risk: RiskTier.Sensitive,
      context: {},
    });

    expect(request.toolCall.name).toBe("send_email");
    expect(request.risk).toBe(RiskTier.Sensitive);
  });

  it("rejects a malformed request", () => {
    expect(() => parseApprovalRequested({ runId: "run-1" })).toThrow();
  });
});
