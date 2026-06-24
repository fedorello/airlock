import type { RequestId, RunId } from "./identifiers";
import type { RiskTier, ToolCall } from "./tool";

/** Raised when a gated tool call is reached and the run suspends for a human. */
export interface ApprovalRequest {
  readonly runId: RunId;
  readonly requestId: RequestId;
  readonly toolCall: ToolCall;
  readonly risk: RiskTier;
  /** Run metadata an approver may need to decide (tenant, channel, ...). */
  readonly context: Readonly<Record<string, unknown>>;
}

export const DecisionType = {
  Approve: "approve",
  Edit: "edit",
  Reject: "reject",
} as const;
export type DecisionType = (typeof DecisionType)[keyof typeof DecisionType];

export interface ApproveDecision {
  readonly type: typeof DecisionType.Approve;
  readonly approver: string;
}

export interface EditDecision {
  readonly type: typeof DecisionType.Edit;
  readonly approver: string;
  readonly editedArgs: Readonly<Record<string, unknown>>;
}

export interface RejectDecision {
  readonly type: typeof DecisionType.Reject;
  readonly approver: string;
  readonly reason: string;
}

export type ApprovalDecision = ApproveDecision | EditDecision | RejectDecision;
