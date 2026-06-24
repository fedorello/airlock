import { describe, expect, it } from "vitest";

import {
  AnthropicProvider,
  type CompletionRequest,
  type FetchLike,
  MessageRole,
  OpenAiProvider,
  ProviderHttpError,
  ProviderResponseError,
  RiskTier,
  type ToolCallId,
} from "../src/index";

interface CapturedRequest {
  readonly url: string;
  readonly body: Record<string, unknown>;
}

/** A fetch that records the request and returns a canned JSON response. */
function stubFetch(responseBody: unknown, status = 200) {
  const requests: CapturedRequest[] = [];
  const fetch: FetchLike = (input, init) => {
    const raw = init?.body;
    requests.push({
      url: String(input),
      body: typeof raw === "string" ? (JSON.parse(raw) as Record<string, unknown>) : {},
    });
    return Promise.resolve(new Response(JSON.stringify(responseBody), { status }));
  };
  return { fetch, requests };
}

const TEXT_REQUEST: CompletionRequest = {
  system: "You are careful.",
  messages: [{ role: MessageRole.User, content: "Help me" }],
  tools: [],
};

describe("AnthropicProvider", () => {
  it("maps a text response", async () => {
    const stub = stubFetch({ content: [{ type: "text", text: "Hello there." }] });
    const provider = new AnthropicProvider({ apiKey: "k", model: "claude-x", fetch: stub.fetch });

    const result = await provider.complete(TEXT_REQUEST);

    expect(result.text).toBe("Hello there.");
    expect(result.toolCalls).toEqual([]);
    expect(stub.requests[0]?.url).toBe("https://api.anthropic.com/v1/messages");
  });

  it("maps a tool-use response", async () => {
    const stub = stubFetch({
      content: [{ type: "tool_use", id: "tu-1", name: "send_email", input: { to: "a@x.test" } }],
    });
    const provider = new AnthropicProvider({ apiKey: "k", model: "claude-x", fetch: stub.fetch });

    const result = await provider.complete(TEXT_REQUEST);

    expect(result.text).toBeNull();
    expect(result.toolCalls).toEqual([
      { id: "tu-1", name: "send_email", args: { to: "a@x.test" } },
    ]);
  });

  it("maps the conversation and tools into the request body", async () => {
    const stub = stubFetch({ content: [{ type: "text", text: "ok" }] });
    const provider = new AnthropicProvider({ apiKey: "k", model: "claude-x", fetch: stub.fetch });

    await provider.complete({
      system: "sys",
      messages: [
        { role: MessageRole.User, content: "hi" },
        {
          role: MessageRole.Assistant,
          content: "thinking",
          toolCalls: [{ id: "c1" as ToolCallId, name: "lookup", args: { id: 1 } }],
        },
        { role: MessageRole.Tool, toolCallId: "c1" as ToolCallId, content: "found" },
      ],
      tools: [
        {
          name: "lookup",
          description: "look",
          parameters: { type: "object" },
          risk: RiskTier.Safe,
        },
      ],
    });

    expect(stub.requests[0]?.body["messages"]).toEqual([
      { role: "user", content: "hi" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "thinking" },
          { type: "tool_use", id: "c1", name: "lookup", input: { id: 1 } },
        ],
      },
      { role: "user", content: [{ type: "tool_result", tool_use_id: "c1", content: "found" }] },
    ]);
    expect(stub.requests[0]?.body["tools"]).toEqual([
      { name: "lookup", description: "look", input_schema: { type: "object" } },
    ]);
  });

  it("honours a custom base URL and max tokens", async () => {
    const stub = stubFetch({ content: [{ type: "text", text: "ok" }] });
    const provider = new AnthropicProvider({
      apiKey: "k",
      model: "claude-x",
      maxTokens: 256,
      baseUrl: "https://proxy.test",
      fetch: stub.fetch,
    });

    await provider.complete(TEXT_REQUEST);

    expect(stub.requests[0]?.url).toBe("https://proxy.test/v1/messages");
    expect(stub.requests[0]?.body["max_tokens"]).toBe(256);
  });

  it("throws on a non-2xx response", async () => {
    const stub = stubFetch("rate limited", 429);
    const provider = new AnthropicProvider({ apiKey: "k", model: "claude-x", fetch: stub.fetch });

    await expect(provider.complete(TEXT_REQUEST)).rejects.toBeInstanceOf(ProviderHttpError);
  });
});

describe("OpenAiProvider", () => {
  it("maps a tool-call response and honours a custom base URL", async () => {
    const stub = stubFetch({
      choices: [
        {
          message: {
            content: null,
            tool_calls: [{ id: "oc-1", function: { name: "refund", arguments: '{"amount":10}' } }],
          },
        },
      ],
    });
    const provider = new OpenAiProvider({
      apiKey: "k",
      model: "gpt-x",
      baseUrl: "https://openrouter.ai/api/v1",
      fetch: stub.fetch,
    });

    const result = await provider.complete(TEXT_REQUEST);

    expect(result.text).toBeNull();
    expect(result.toolCalls).toEqual([{ id: "oc-1", name: "refund", args: { amount: 10 } }]);
    expect(stub.requests[0]?.url).toBe("https://openrouter.ai/api/v1/chat/completions");
  });

  it("prepends the system message and maps assistant and tool turns", async () => {
    const stub = stubFetch({ choices: [{ message: { content: "done" } }] });
    const provider = new OpenAiProvider({ apiKey: "k", model: "gpt-x", fetch: stub.fetch });

    await provider.complete({
      system: "sys",
      messages: [
        {
          role: MessageRole.Assistant,
          content: "",
          toolCalls: [{ id: "c1" as ToolCallId, name: "t", args: { a: 1 } }],
        },
        { role: MessageRole.Tool, toolCallId: "c1" as ToolCallId, content: "r" },
      ],
      tools: [],
    });

    expect(stub.requests[0]?.body["messages"]).toEqual([
      { role: "system", content: "sys" },
      {
        role: "assistant",
        content: null,
        tool_calls: [{ id: "c1", type: "function", function: { name: "t", arguments: '{"a":1}' } }],
      },
      { role: "tool", tool_call_id: "c1", content: "r" },
    ]);
  });

  it("throws when the response has no choices", async () => {
    const stub = stubFetch({ choices: [] });
    const provider = new OpenAiProvider({ apiKey: "k", model: "gpt-x", fetch: stub.fetch });

    await expect(provider.complete(TEXT_REQUEST)).rejects.toBeInstanceOf(ProviderResponseError);
  });
});
