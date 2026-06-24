import { describe, expect, it, vi } from "vitest";

import { SilentLogger } from "@/core/logger";
import { SubmitDecision } from "@/application/submit-decision";

describe("SubmitDecision", () => {
  it("publishes the decided event built from the inputs", async () => {
    const publish = vi.fn(() => Promise.resolve());

    await new SubmitDecision({ publish }, new SilentLogger()).execute(
      "run-1",
      "req-1",
      {
        type: "reject",
        approver: "operator",
        reason: "not allowed",
      },
    );

    expect(publish).toHaveBeenCalledWith({
      runId: "run-1",
      requestId: "req-1",
      decision: { type: "reject", approver: "operator", reason: "not allowed" },
    });
  });
});
