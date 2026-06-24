import {
  type Message,
  type RiskTier,
  type RunState,
  RunStatus,
} from "./contract";

/** The view model for one sensitive action waiting at the gate. */
export interface PendingApproval {
  runId: string;
  requestId: string;
  toolName: string;
  args: Record<string, unknown>;
  risk: RiskTier;
  request: string;
  timeline: Message[];
}

/** Derive the pending approval from a run, or null if the run is not waiting. */
export function toPendingApproval(state: RunState): PendingApproval | null {
  if (state.status !== RunStatus.AwaitingApproval || state.approval === null) {
    return null;
  }
  const { approval } = state;
  return {
    runId: state.runId,
    requestId: approval.requestId,
    toolName: approval.toolCall.name,
    args: approval.toolCall.args,
    risk: approval.risk,
    request: firstUserMessage(state.messages),
    timeline: state.messages,
  };
}

function firstUserMessage(messages: Message[]): string {
  const first = messages.find((message) => message.role === "user");
  return first?.content ?? "";
}
