import type { RunId } from "./identifiers";

export const AuditEventType = {
  ModelCalled: "model_called",
  ToolExecuted: "tool_executed",
  ApprovalRequested: "approval_requested",
  ApprovalDecided: "approval_decided",
  RunCompleted: "run_completed",
  RunFailed: "run_failed",
} as const;
export type AuditEventType = (typeof AuditEventType)[keyof typeof AuditEventType];

/** An immutable record of one thing that happened during a run. */
export interface AuditEvent {
  readonly runId: RunId;
  readonly type: AuditEventType;
  /** UTC ISO-8601 timestamp, taken from the Clock port. */
  readonly at: string;
  readonly data: Readonly<Record<string, unknown>>;
}
