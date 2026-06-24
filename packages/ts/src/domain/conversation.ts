import type { ToolCallId } from "./identifiers";
import type { ToolCall } from "./tool";

export const MessageRole = {
  User: "user",
  Assistant: "assistant",
  Tool: "tool",
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export interface UserMessage {
  readonly role: typeof MessageRole.User;
  readonly content: string;
}

export interface AssistantMessage {
  readonly role: typeof MessageRole.Assistant;
  readonly content: string;
  readonly toolCalls: readonly ToolCall[];
}

export interface ToolMessage {
  readonly role: typeof MessageRole.Tool;
  readonly toolCallId: ToolCallId;
  readonly content: string;
}

export type Message = UserMessage | AssistantMessage | ToolMessage;
