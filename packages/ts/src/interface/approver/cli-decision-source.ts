import { createInterface } from "node:readline/promises";

import { type ApprovalDecision, DecisionType } from "../../domain/approval";
import type { ApprovalRequest } from "../../domain/approval";
import type { DecisionSource } from "./approver";

/**
 * A decision source that prompts a human on the terminal: it prints the proposed
 * action and reads approve / reject from stdin. This is an I/O entry point and is
 * not unit-tested; the testable path is `autoApproveDecisionSource`.
 */
export function cliDecisionSource(approver: string): DecisionSource {
  return async (request: ApprovalRequest): Promise<ApprovalDecision> => {
    const readline = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const { name, args } = request.toolCall;
      process.stdout.write(`\n[APPROVAL NEEDED] ${name}(${JSON.stringify(args)})\n`);
      const answer = (await readline.question("approve / reject? [a/r]: ")).trim().toLowerCase();
      if (answer === "a") {
        return { type: DecisionType.Approve, approver };
      }
      return { type: DecisionType.Reject, approver, reason: "Rejected by the operator" };
    } finally {
      readline.close();
    }
  };
}
