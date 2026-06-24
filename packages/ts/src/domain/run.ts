import type { ApprovalRequest } from "./approval";
import type { Message } from "./conversation";
import type { RunId } from "./identifiers";
import type { ToolCall } from "./tool";

export const RunStatus = {
  Running: "running",
  AwaitingApproval: "awaiting_approval",
  Completed: "completed",
  Failed: "failed",
} as const;
export type RunStatus = (typeof RunStatus)[keyof typeof RunStatus];

/**
 * The single source of truth for a run. Fully serializable so it can be
 * persisted and resumed in another process (see ADR-0004).
 */
export interface RunState {
  readonly runId: RunId;
  status: RunStatus;
  messages: Message[];
  /** Tool calls from the current model turn, processed in order via `cursor`. */
  pendingToolCalls: readonly ToolCall[];
  cursor: number;
  /** The open approval request while `status` is `awaiting_approval`. */
  approval: ApprovalRequest | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}
