import type { Redis } from "ioredis";

import type { Logger } from "@/core/logger";
import type { ApprovalReader, DecisionPublisher } from "@/application/ports";
import {
  type ApprovalDecidedEvent,
  EventTopic,
  RUN_KEY_PREFIX,
  type RunState,
  runStateSchema,
} from "@/domain/contract";
import {
  type PendingApproval,
  toPendingApproval,
} from "@/domain/pending-approval";

const SCAN_BATCH = 100;

/** Reads runs from the Redis run store and publishes decisions. A malformed run
 * is logged and skipped rather than failing the whole list. */
export class RedisApprovalGateway implements ApprovalReader, DecisionPublisher {
  constructor(
    private readonly redis: Redis,
    private readonly logger: Logger,
  ) {}

  async listPending(): Promise<PendingApproval[]> {
    const states = await this.loadAllRuns();
    return states
      .map(toPendingApproval)
      .filter((approval): approval is PendingApproval => approval !== null);
  }

  async getRun(runId: string): Promise<RunState | null> {
    const raw = await this.redis.get(`${RUN_KEY_PREFIX}${runId}`);
    return raw === null ? null : this.parseRun(raw, runId);
  }

  async publish(event: ApprovalDecidedEvent): Promise<void> {
    await this.redis.publish(EventTopic.ApprovalDecided, JSON.stringify(event));
  }

  private async loadAllRuns(): Promise<RunState[]> {
    const keys = await this.scanKeys(`${RUN_KEY_PREFIX}*`);
    const states: RunState[] = [];
    for (const key of keys) {
      const raw = await this.redis.get(key);
      const state = raw === null ? null : this.parseRun(raw, key);
      if (state !== null) {
        states.push(state);
      }
    }
    return states;
  }

  private async scanKeys(pattern: string): Promise<string[]> {
    const keys: string[] = [];
    let cursor = "0";
    do {
      const [next, batch] = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        SCAN_BATCH,
      );
      keys.push(...batch);
      cursor = next;
    } while (cursor !== "0");
    return keys;
  }

  private parseRun(raw: string, key: string): RunState | null {
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      this.logger.warn("skipping run with invalid JSON", { key });
      return null;
    }
    const result = runStateSchema.safeParse(json);
    if (!result.success) {
      this.logger.warn("skipping run with unexpected shape", { key });
      return null;
    }
    return result.data;
  }
}
