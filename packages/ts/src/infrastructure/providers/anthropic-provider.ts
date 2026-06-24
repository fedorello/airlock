import { z } from "zod";

import type {
  CompletionRequest,
  CompletionResult,
  LlmProvider,
} from "../../application/ports/llm-provider";
import { type AssistantMessage, type Message, MessageRole } from "../../domain/conversation";
import type { ToolCallId } from "../../domain/identifiers";
import type { ToolCall, ToolDefinition } from "../../domain/tool";
import { type FetchLike, postJson } from "./http";

const DEFAULT_BASE_URL = "https://api.anthropic.com";
const DEFAULT_MAX_TOKENS = 1024;
const ANTHROPIC_VERSION = "2023-06-01";

export interface AnthropicProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  readonly maxTokens?: number;
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
}

const responseSchema = z.object({
  content: z.array(
    z.discriminatedUnion("type", [
      z.object({ type: z.literal("text"), text: z.string() }),
      z.object({
        type: z.literal("tool_use"),
        id: z.string(),
        name: z.string(),
        input: z.record(z.string(), z.unknown()),
      }),
    ]),
  ),
});

interface AnthropicWireMessage {
  readonly role: "user" | "assistant";
  readonly content: unknown;
}

/** Anthropic Claude provider over the Messages API (see ADR-0005, ADR-0007). */
export class AnthropicProvider implements LlmProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly maxTokens: number;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: AnthropicProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.maxTokens = options.maxTokens ?? DEFAULT_MAX_TOKENS;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const body = {
      model: this.model,
      max_tokens: this.maxTokens,
      system: request.system,
      messages: request.messages.map(toWireMessage),
      tools: request.tools.map(toWireTool),
    };
    const url = `${this.baseUrl}/v1/messages`;
    const raw = await postJson(this.fetchImpl, url, this.headers(), body);
    return parseResponse(raw);
  }

  private headers(): Record<string, string> {
    return { "x-api-key": this.apiKey, "anthropic-version": ANTHROPIC_VERSION };
  }
}

function toWireMessage(message: Message): AnthropicWireMessage {
  switch (message.role) {
    case MessageRole.User:
      return { role: "user", content: message.content };
    case MessageRole.Assistant:
      return { role: "assistant", content: assistantContent(message) };
    case MessageRole.Tool:
      return {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: message.toolCallId, content: message.content },
        ],
      };
  }
}

function assistantContent(message: AssistantMessage): unknown[] {
  const blocks: unknown[] = [];
  if (message.content.length > 0) {
    blocks.push({ type: "text", text: message.content });
  }
  for (const call of message.toolCalls) {
    blocks.push({ type: "tool_use", id: call.id, name: call.name, input: call.args });
  }
  return blocks;
}

function toWireTool(tool: ToolDefinition): unknown {
  return { name: tool.name, description: tool.description, input_schema: tool.parameters };
}

function parseResponse(raw: unknown): CompletionResult {
  const parsed = responseSchema.parse(raw);
  let text = "";
  const toolCalls: ToolCall[] = [];
  for (const block of parsed.content) {
    if (block.type === "text") {
      text += block.text;
    } else {
      toolCalls.push({ id: block.id as ToolCallId, name: block.name, args: block.input });
    }
  }
  return { text: text.length > 0 ? text : null, toolCalls };
}
