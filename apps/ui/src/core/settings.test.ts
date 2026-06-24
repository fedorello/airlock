import { describe, expect, it } from "vitest";

import { loadSettings } from "@/core/settings";

describe("loadSettings", () => {
  it("applies defaults when the environment is empty", () => {
    const settings = loadSettings({});

    expect(settings.redisUrl).toBe("redis://127.0.0.1:6379");
    expect(settings.logLevel).toBe("info");
    expect(settings.approverName).toBe("ui-operator");
    expect(settings.isProduction).toBe(false);
  });

  it("reads values from the environment", () => {
    const settings = loadSettings({
      AIRLOCK_REDIS_URL: "redis://r:6379",
      AIRLOCK_LOG_LEVEL: "debug",
      AIRLOCK_APPROVER_NAME: "alice",
      NODE_ENV: "production",
    });

    expect(settings.redisUrl).toBe("redis://r:6379");
    expect(settings.logLevel).toBe("debug");
    expect(settings.approverName).toBe("alice");
    expect(settings.isProduction).toBe(true);
  });

  it("rejects an invalid log level", () => {
    expect(() => loadSettings({ AIRLOCK_LOG_LEVEL: "verbose" })).toThrow();
  });
});
