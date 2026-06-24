import { z } from "zod";

import { type ApprovalDecision, type ApprovalRequest, DecisionType } from "../domain/approval";
import type { ApprovalDecidedEvent } from "../domain/events";
import type { RequestId, RunId, ToolCallId } from "../domain/identifiers";
import { RiskTier } from "../domain/tool";

const argsSchema = z.record(z.string(), z.unknown());

const decisionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal(DecisionType.Approve), approver: z.string() }),
  z.object({ type: z.literal(DecisionType.Edit), approver: z.string(), editedArgs: argsSchema }),
  z.object({ type: z.literal(DecisionType.Reject), approver: z.string(), reason: z.string() }),
]);

const approvalDecidedSchema = z.object({
  runId: z.string(),
  requestId: z.string(),
  decision: decisionSchema,
});

const approvalRequestedSchema = z.object({
  runId: z.string(),
  requestId: z.string(),
  toolCall: z.object({ id: z.string(), name: z.string(), args: argsSchema }),
  risk: z.enum([RiskTier.Safe, RiskTier.Sensitive]),
  context: argsSchema,
});

/** Validate and decode an `approval.decided` event from the bus. */
export function parseApprovalDecided(raw: unknown): ApprovalDecidedEvent {
  const parsed = approvalDecidedSchema.parse(raw);
  return {
    runId: parsed.runId as RunId,
    requestId: parsed.requestId as RequestId,
    decision: parsed.decision as ApprovalDecision,
  };
}

/** Validate and decode an `approval.requested` event from the bus. */
export function parseApprovalRequested(raw: unknown): ApprovalRequest {
  const parsed = approvalRequestedSchema.parse(raw);
  return {
    runId: parsed.runId as RunId,
    requestId: parsed.requestId as RequestId,
    toolCall: {
      id: parsed.toolCall.id as ToolCallId,
      name: parsed.toolCall.name,
      args: parsed.toolCall.args,
    },
    risk: parsed.risk,
    context: parsed.context,
  };
}
