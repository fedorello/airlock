import { describe, expect, it } from "vitest";

import { loadSettings, ProviderName } from "../src/index";

describe("loadSettings", () => {
  it("parses a full environment", () => {
    const settings = loadSettings({
      AIRLOCK_PROVIDER: "openai",
      AIRLOCK_MODEL: "gpt-x",
      AIRLOCK_API_KEY: "secret",
      AIRLOCK_BASE_URL: "https://openrouter.ai/api/v1",
      AIRLOCK_REDIS_URL: "redis://cache:6379",
      AIRLOCK_SYSTEM_PROMPT: "Be careful.",
    });

    expect(settings.provider).toBe(ProviderName.OpenAI);
    expect(settings.model).toBe("gpt-x");
    expect(settings.baseUrl).toBe("https://openrouter.ai/api/v1");
    expect(settings.redisUrl).toBe("redis://cache:6379");
  });

  it("applies defaults for optional values", () => {
    const settings = loadSettings({ AIRLOCK_MODEL: "claude-x", AIRLOCK_API_KEY: "secret" });

    expect(settings.provider).toBe(ProviderName.Anthropic);
    expect(settings.redisUrl).toBe("redis://localhost:6379");
    expect(settings.systemPrompt.length).toBeGreaterThan(0);
    expect(settings.baseUrl).toBeUndefined();
  });

  it("throws when a required value is missing", () => {
    expect(() => loadSettings({ AIRLOCK_MODEL: "claude-x" })).toThrow();
  });

  it("throws on an unknown provider", () => {
    expect(() =>
      loadSettings({ AIRLOCK_PROVIDER: "gemini", AIRLOCK_MODEL: "m", AIRLOCK_API_KEY: "k" }),
    ).toThrow();
  });

  it("throws on a malformed base URL", () => {
    expect(() =>
      loadSettings({ AIRLOCK_MODEL: "m", AIRLOCK_API_KEY: "k", AIRLOCK_BASE_URL: "not-a-url" }),
    ).toThrow();
  });
});
