import { Redis } from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  EventTopic,
  RedisEventBus,
  RedisRunStore,
  type RunId,
  type RunState,
  RunStatus,
} from "../src/index";

const REDIS_URL = process.env["AIRLOCK_REDIS_URL"] ?? "redis://127.0.0.1:6379";

/** True when a Redis is reachable, so the suite can skip cleanly without one. */
async function redisReachable(): Promise<boolean> {
  const client = new Redis(REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
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

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve!: () => void;
  const promise = new Promise<void>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error("timed out waiting for the event"));
    }, ms);
  });
  return Promise.race([promise, timeout]);
}

function awaitingRun(runId: string): RunState {
  return {
    runId: runId as RunId,
    status: RunStatus.AwaitingApproval,
    messages: [],
    pendingToolCalls: [],
    cursor: 0,
    approval: null,
    metadata: {},
  };
}

describe.skipIf(!available)("RedisRunStore (integration)", () => {
  let redis: Redis;
  let store: RedisRunStore;

  beforeAll(async () => {
    redis = new Redis(REDIS_URL);
    await redis.flushdb();
    store = new RedisRunStore(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  it("returns null for an unknown run", async () => {
    expect(await store.load("run-unknown" as RunId)).toBeNull();
  });

  it("round-trips run state through Redis", async () => {
    const state = awaitingRun("run-it-1");

    await store.save(state);

    expect(await store.load(state.runId)).toEqual(state);
  });
});

describe.skipIf(!available)("RedisEventBus (integration)", () => {
  let publisher: Redis;
  let subscriber: Redis;
  let bus: RedisEventBus;

  beforeAll(() => {
    publisher = new Redis(REDIS_URL);
    subscriber = new Redis(REDIS_URL);
    bus = new RedisEventBus(publisher, subscriber);
  });

  afterAll(async () => {
    await publisher.quit();
    await subscriber.quit();
  });

  it("delivers a published event to a subscriber", async () => {
    const received: unknown[] = [];
    const got = deferred();
    await bus.subscribe(EventTopic.RunCompleted, (event) => {
      received.push(event);
      got.resolve();
    });

    await bus.publish(EventTopic.RunCompleted, { runId: "run-it-2" });
    await withTimeout(got.promise, 3000);

    expect(received).toEqual([{ runId: "run-it-2" }]);
  });
});
