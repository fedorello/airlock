import { Redis } from "ioredis";
import { describe, expect, it } from "vitest";

import { SilentLogger } from "@/core/logger";
import type { ApprovalEvent } from "@/application/ports";
import { RedisEventSource } from "@/infrastructure/redis/redis-event-source";

const REDIS_URL = process.env.AIRLOCK_REDIS_URL ?? "redis://127.0.0.1:6379";

async function redisReachable(): Promise<boolean> {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    retryStrategy: () => null,
  });
  try {
    await client.connect();
    await client.ping();
    return true;
  } catch {
    return false;
  } finally {
    client.disconnect();
  }
}

const available = await redisReachable();

describe.skipIf(!available)("RedisEventSource (real Redis)", () => {
  it("delivers a published approval.requested event", async () => {
    const publisher = new Redis(REDIS_URL);
    const subscriber = new Redis(REDIS_URL);
    const source = new RedisEventSource(subscriber, new SilentLogger());

    const received = new Promise<ApprovalEvent>((resolve) => {
      void source.subscribe((event) => {
        resolve(event);
      });
    });
    await new Promise((resolve) => setTimeout(resolve, 150));

    await publisher.publish(
      "approval.requested",
      JSON.stringify({
        runId: "evt-run-1",
        requestId: "evt-req-1",
        toolCall: { id: "c1", name: "send_email", args: { to: "a@b" } },
        risk: "sensitive",
        context: {},
      }),
    );

    const event = await received;
    expect(event.topic).toBe("approval.requested");
    if (event.topic === "approval.requested") {
      expect(event.request.toolCall.name).toBe("send_email");
    }

    await publisher.quit();
    await subscriber.quit();
  });
});
