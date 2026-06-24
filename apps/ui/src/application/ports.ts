import {
  type ApprovalDecidedEvent,
  type ApprovalRequest,
  EventTopic,
  type RunState,
} from "@/domain/contract";
import type { PendingApproval } from "@/domain/pending-approval";

/** Reads pending approvals and runs from the durable store (Interface Segregation:
 * the read side is separate from publishing and from the live stream). */
export interface ApprovalReader {
  listPending(): Promise<PendingApproval[]>;
  getRun(runId: string): Promise<RunState | null>;
}

/** Publishes the human's decision back onto the bus. */
export interface DecisionPublisher {
  publish(event: ApprovalDecidedEvent): Promise<void>;
}

/** A live event the UI reacts to. */
export type ApprovalEvent =
  | { topic: typeof EventTopic.ApprovalRequested; request: ApprovalRequest }
  | { topic: typeof EventTopic.RunCompleted; runId: string }
  | { topic: typeof EventTopic.RunFailed; runId: string };

export type ApprovalEventHandler = (event: ApprovalEvent) => void;
export type Unsubscribe = () => Promise<void>;

/** Streams live approval/run events (for SSE to the browser). */
export interface ApprovalEventSource {
  subscribe(handler: ApprovalEventHandler): Promise<Unsubscribe>;
}
