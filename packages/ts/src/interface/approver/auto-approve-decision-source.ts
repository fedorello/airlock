import { type ApprovalDecision, DecisionType } from "../../domain/approval";
import type { DecisionSource } from "./approver";

/**
 * A decision source that approves every request. For demos, smoke tests, and
 * automated end-to-end flows where no human is present. The optional `notify`
 * callback lets a caller observe each approval (e.g. to print it).
 */
export function autoApproveDecisionSource(
  approver: string,
  notify?: (message: string) => void,
): DecisionSource {
  return (request) => {
    notify?.(`[GATE] approving ${request.toolCall.name}(${JSON.stringify(request.toolCall.args)})`);
    const decision: ApprovalDecision = { type: DecisionType.Approve, approver };
    return Promise.resolve(decision);
  };
}
