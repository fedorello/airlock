import type { ApprovalDecision, ApprovalRequest } from "./approval";
import type { RequestId, RunId } from "./identifiers";

/** Topics on the event bus. Approval flow plus run lifecycle. */
export const EventTopic = {
  ApprovalRequested: "approval.requested",
  ApprovalDecided: "approval.decided",
  RunCompleted: "run.completed",
  RunFailed: "run.failed",
} as const;
export type EventTopic = (typeof EventTopic)[keyof typeof EventTopic];

/** Published when the loop suspends on a gated tool call. */
export type ApprovalRequestedEvent = ApprovalRequest;

/** Published by an approver; consumed by the runner to resume. */
export interface ApprovalDecidedEvent {
  readonly runId: RunId;
  readonly requestId: RequestId;
  readonly decision: ApprovalDecision;
}

export interface RunCompletedEvent {
  readonly runId: RunId;
}

export interface RunFailedEvent {
  readonly runId: RunId;
  readonly reason: string;
}
