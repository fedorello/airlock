import type { RunState } from "../../domain/run";
import type { Tool, ToolCall } from "../../domain/tool";

export interface GateDecisionInput {
  readonly tool: Tool;
  readonly toolCall: ToolCall;
  readonly state: RunState;
}

/**
 * Decides whether a specific tool call needs human approval. Kept out of tool
 * definitions and out of the prompt, so the rule is deterministic and testable
 * (see ADR-0003).
 */
export interface GatePolicy {
  requiresApproval(input: GateDecisionInput): boolean;
}
