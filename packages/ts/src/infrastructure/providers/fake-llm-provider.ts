import type { CompletionResult, LlmProvider } from "../../application/ports/llm-provider";

/** Raised when a FakeLlmProvider is called more times than it was scripted for. */
export class ScriptExhaustedError extends Error {
  constructor() {
    super("FakeLlmProvider script exhausted: more completions were requested than provided");
    this.name = "ScriptExhaustedError";
  }
}

/**
 * Returns scripted completions in order, one per call. For deterministic tests
 * and demos — no network and no model.
 */
export class FakeLlmProvider implements LlmProvider {
  private readonly script: CompletionResult[];
  private callIndex = 0;

  constructor(script: readonly CompletionResult[]) {
    this.script = [...script];
  }

  complete(): Promise<CompletionResult> {
    const result = this.script[this.callIndex];
    if (result === undefined) {
      return Promise.reject(new ScriptExhaustedError());
    }
    this.callIndex += 1;
    return Promise.resolve(result);
  }
}
