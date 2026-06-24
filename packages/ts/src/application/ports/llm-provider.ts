import type { Message } from "../../domain/conversation";
import type { ToolCall, ToolDefinition } from "../../domain/tool";

export interface CompletionRequest {
  readonly system: string;
  readonly messages: readonly Message[];
  readonly tools: readonly ToolDefinition[];
}

export interface CompletionResult {
  /** The model's text answer, or null when it only emitted tool calls. */
  readonly text: string | null;
  readonly toolCalls: readonly ToolCall[];
}

/**
 * Normalized, model-agnostic completion port (see ADR-0005). Each vendor is an
 * adapter that translates to and from this shape. One method, tool-use in and
 * tool-calls out.
 */
export interface LlmProvider {
  complete(request: CompletionRequest): Promise<CompletionResult>;
}
