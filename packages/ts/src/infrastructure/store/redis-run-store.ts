import type { RunStore } from "../../application/ports/run-store";
import type { RunId } from "../../domain/identifiers";
import type { RunState } from "../../domain/run";

/** The subset of a Redis client the run store needs. */
export interface RedisStringCommands {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<unknown>;
}

const KEY_PREFIX = "airlock:run:";

/** Persists run state in Redis as JSON (see ADR-0004). */
export class RedisRunStore implements RunStore {
  constructor(private readonly redis: RedisStringCommands) {}

  async save(state: RunState): Promise<void> {
    await this.redis.set(`${KEY_PREFIX}${state.runId}`, JSON.stringify(state));
  }

  async load(runId: RunId): Promise<RunState | null> {
    // The store only ever holds run state we serialized ourselves.
    const raw = await this.redis.get(`${KEY_PREFIX}${runId}`);
    return raw === null ? null : (JSON.parse(raw) as RunState);
  }
}
