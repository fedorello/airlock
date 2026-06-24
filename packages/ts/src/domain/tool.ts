import type { ToolCallId } from "./identifiers";

/** Risk classification that drives whether a tool call needs human approval. */
export const RiskTier = {
  /** Read-only; runs automatically. */
  Safe: "safe",
  /** Side-effecting; gated behind human approval. */
  Sensitive: "sensitive",
} as const;
export type RiskTier = (typeof RiskTier)[keyof typeof RiskTier];

/** A JSON Schema object describing a tool's parameters. */
export type JsonSchema = Readonly<Record<string, unknown>>;

/** What the model is shown about a tool. Carries no executable behavior. */
export interface ToolDefinition {
  readonly name: string;
  readonly description: string;
  readonly parameters: JsonSchema;
  readonly risk: RiskTier;
}

/** The model's request to invoke a tool. */
export interface ToolCall {
  readonly id: ToolCallId;
  readonly name: string;
  readonly args: Readonly<Record<string, unknown>>;
}

/** Executes a tool's side effect. The only place an effect happens. */
export type ToolHandler = (args: Readonly<Record<string, unknown>>) => Promise<unknown>;

/** A tool definition bound to its handler. The handler is never sent to the model. */
export interface Tool extends ToolDefinition {
  readonly handler: ToolHandler;
}
