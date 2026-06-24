import { z } from "zod";

import type {
  CompletionRequest,
  CompletionResult,
  LlmProvider,
} from "../../application/ports/llm-provider";
import { type Message, MessageRole } from "../../domain/conversation";
import type { ToolCallId } from "../../domain/identifiers";
import type { ToolCall, ToolDefinition } from "../../domain/tool";
import { type FetchLike, postJson, ProviderResponseError } from "./http";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";

export interface OpenAiProviderOptions {
  readonly apiKey: string;
  readonly model: string;
  /** Override for OpenAI-compatible endpoints (OpenRouter, Ollama, ...). */
  readonly baseUrl?: string;
  readonly fetch?: FetchLike;
}

const argsSchema = z.record(z.string(), z.unknown());
const responseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              function: z.object({ name: z.string(), arguments: z.string() }),
            }),
          )
          .optional(),
      }),
    }),
  ),
});

/** OpenAI (and OpenAI-compatible) provider over Chat Completions (ADR-0005, ADR-0007). */
export class OpenAiProvider implements LlmProvider {
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: FetchLike;

  constructor(options: OpenAiProviderOptions) {
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
    this.fetchImpl = options.fetch ?? globalThis.fetch;
  }

  async complete(request: CompletionRequest): Promise<CompletionResult> {
    const body = {
      model: this.model,
      messages: [
        { role: "system", content: request.system },
        ...request.messages.map(toWireMessage),
      ],
      tools: request.tools.map(toWireTool),
    };
    const url = `${this.baseUrl}/chat/completions`;
    const raw = await postJson(
      this.fetchImpl,
      url,
      { authorization: `Bearer ${this.apiKey}` },
      body,
    );
    return parseResponse(raw);
  }
}

function toWireMessage(message: Message): unknown {
  switch (message.role) {
    case MessageRole.User:
      return { role: "user", content: message.content };
    case MessageRole.Assistant:
      return {
        role: "assistant",
        content: message.content.length > 0 ? message.content : null,
        tool_calls:
          message.toolCalls.length > 0 ? message.toolCalls.map(toWireToolCall) : undefined,
      };
    case MessageRole.Tool:
      return { role: "tool", tool_call_id: message.toolCallId, content: message.content };
  }
}

function toWireToolCall(call: ToolCall): unknown {
  return {
    id: call.id,
    type: "function",
    function: { name: call.name, arguments: JSON.stringify(call.args) },
  };
}

function toWireTool(tool: ToolDefinition): unknown {
  return {
    type: "function",
    function: { name: tool.name, description: tool.description, parameters: tool.parameters },
  };
}

function parseResponse(raw: unknown): CompletionResult {
  const parsed = responseSchema.parse(raw);
  const [choice] = parsed.choices;
  if (choice === undefined) {
    throw new ProviderResponseError("OpenAI response contained no choices");
  }
  const toolCalls: ToolCall[] = (choice.message.tool_calls ?? []).map((call) => ({
    id: call.id as ToolCallId,
    name: call.function.name,
    args: argsSchema.parse(JSON.parse(call.function.arguments)),
  }));
  return { text: choice.message.content, toolCalls };
}
