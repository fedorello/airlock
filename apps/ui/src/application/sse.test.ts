import { describe, expect, it } from "vitest";

import { formatSse, sseKeepAlive } from "@/application/sse";
import { EventTopic } from "@/domain/contract";

describe("formatSse", () => {
  it("formats an event as a data frame ending in a blank line", () => {
    const frame = formatSse({ topic: EventTopic.RunCompleted, runId: "run-1" });

    expect(frame).toBe('data: {"topic":"run.completed","runId":"run-1"}\n\n');
  });
});

describe("sseKeepAlive", () => {
  it("is an ignored comment frame", () => {
    expect(sseKeepAlive()).toBe(": keep-alive\n\n");
  });
});
