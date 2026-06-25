import { describe, expect, it, vi } from "vitest";

import { SilentLogger } from "@/core/logger";
import {
  getRunResponse,
  listApprovalsResponse,
  submitDecisionResponse,
} from "@/application/handlers";
import type { ApprovalReader } from "@/application/ports";
import { SubmitDecision } from "@/application/submit-decision";
import { type RunState, RunStatus } from "@/domain/contract";

const completedRun: RunState = {
  runId: "run-1",
  status: RunStatus.Completed,
  messages: [],
  pendingToolCalls: [],
  cursor: 0,
  approval: null,
  metadata: {},
};

const reader: ApprovalReader = {
  listPending: () =>
    Promise.resolve([
      {
        runId: "run-1",
        requestId: "req-1",
        toolName: "send_email",
        args: {},
        risk: "sensitive",
        request: "hi",
        reasoning: "",
        timeline: [],
      },
    ]),
  getRun: (runId) => Promise.resolve(runId === "run-1" ? completedRun : null),
};

describe("listApprovalsResponse", () => {
  it("returns the pending approvals", async () => {
    const response = await listApprovalsResponse(reader);
    const body = (await response.json()) as { approvals: unknown[] };

    expect(response.status).toBe(200);
    expect(body.approvals).toHaveLength(1);
  });
});

describe("getRunResponse", () => {
  it("returns the run when found", async () => {
    const response = await getRunResponse(reader, "run-1");

    expect(response.status).toBe(200);
  });

  it("returns 404 when the run is not found", async () => {
    const response = await getRunResponse(reader, "missing");

    expect(response.status).toBe(404);
  });
});

describe("submitDecisionResponse", () => {
  it("publishes a valid decision", async () => {
    const publish = vi.fn(() => Promise.resolve());
    const service = new SubmitDecision({ publish }, new SilentLogger());

    const response = await submitDecisionResponse(service, "run-1", {
      requestId: "req-1",
      decision: { type: "approve", approver: "me" },
    });

    expect(response.status).toBe(200);
    expect(publish).toHaveBeenCalledWith({
      runId: "run-1",
      requestId: "req-1",
      decision: { type: "approve", approver: "me" },
    });
  });

  it("returns 400 on an invalid body", async () => {
    const publish = vi.fn(() => Promise.resolve());
    const service = new SubmitDecision({ publish }, new SilentLogger());

    const response = await submitDecisionResponse(service, "run-1", {
      decision: { type: "approve" },
    });

    expect(response.status).toBe(400);
    expect(publish).not.toHaveBeenCalled();
  });
});
