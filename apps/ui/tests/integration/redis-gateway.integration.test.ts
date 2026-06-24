import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { SilentLogger } from "@/core/logger";
import { RUN_KEY_PREFIX } from "@/domain/contract";
import { RedisApprovalGateway } from "@/infrastructure/redis/redis-approval-gateway";

const REDIS_URL = process.env.AIRLOCK_REDIS_URL ?? "redis://127.0.0.1:6379";
const RUN_ID = "ui-itest-1";

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

function awaitingRunJson(): string {
  return JSON.stringify({
    runId: RUN_ID,
    status: "awaiting_approval",
    messages: [{ role: "user", content: "Refund the customer" }],
    pendingToolCalls: [
      { id: "c1", name: "issue_refund", args: { amount: 49.99 } },
    ],
    cursor: 0,
    approval: {
      runId: RUN_ID,
      requestId: "req-1",
      toolCall: { id: "c1", name: "issue_refund", args: { amount: 49.99 } },
      risk: "sensitive",
      context: {},
    },
    metadata: {},
  });
}

describe.skipIf(!available)("RedisApprovalGateway (real Redis)", () => {
  let redis: Redis;
  let gateway: RedisApprovalGateway;

  beforeAll(async () => {
    redis = new Redis(REDIS_URL);
    gateway = new RedisApprovalGateway(redis, new SilentLogger());
    await redis.set(`${RUN_KEY_PREFIX}${RUN_ID}`, awaitingRunJson());
  });

  afterAll(async () => {
    await redis.del(`${RUN_KEY_PREFIX}${RUN_ID}`);
    await redis.quit();
  });

  it("lists the seeded run as pending", async () => {
    const pending = await gateway.listPending();
    const ours = pending.find((approval) => approval.runId === RUN_ID);

    expect(ours?.toolName).toBe("issue_refund");
    expect(ours?.risk).toBe("sensitive");
  });

  it("reads a run by id and misses an unknown one", async () => {
    expect((await gateway.getRun(RUN_ID))?.runId).toBe(RUN_ID);
    expect(await gateway.getRun("nope-xyz")).toBeNull();
  });

  it("publishes the decided event", async () => {
    const subscriber = new Redis(REDIS_URL);
    const received = new Promise<string>((resolve) => {
      void subscriber.subscribe("approval.decided").then(() => {
        subscriber.on("message", (_channel, message) => {
          resolve(message);
        });
      });
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    await gateway.publish({
      runId: RUN_ID,
      requestId: "req-1",
      decision: { type: "approve", approver: "operator" },
    });

    const message = JSON.parse(await received) as { runId: string };
    expect(message.runId).toBe(RUN_ID);
    await subscriber.quit();
  });
});
