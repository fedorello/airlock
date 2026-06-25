import { describe, expect, it } from "vitest";

import { assessActionRisk } from "./assess-risk";

describe("assessActionRisk", () => {
  it("flags a large transfer to an external recipient", () => {
    const flags = assessActionRisk("wire_transfer", {
      to: "security@account-recovery.io",
      amount: 5000,
    });

    expect(flags).toContain("Moves $5,000.00");
    expect(flags).toContain("Sends to security@account-recovery.io");
  });

  it("does not flag a small refund with no recipient", () => {
    expect(
      assessActionRisk("issue_refund", { orderId: "ord-42", amount: 49.99 }),
    ).toEqual([]);
  });

  it("flags destructive tools", () => {
    expect(assessActionRisk("delete_account", {})).toContain(
      "Deletes or destroys data",
    );
  });
});
