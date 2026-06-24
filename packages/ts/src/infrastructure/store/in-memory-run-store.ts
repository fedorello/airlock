import type { RunStore } from "../../application/ports/run-store";
import type { RunId } from "../../domain/identifiers";
import type { RunState } from "../../domain/run";

/**
 * Keeps run state in memory. Saves and loads deep copies, so the agent never
 * shares a mutable reference with the store — this mirrors a real serializing
 * store and exercises that RunState is serializable.
 */
export class InMemoryRunStore implements RunStore {
  private readonly states = new Map<string, RunState>();

  save(state: RunState): Promise<void> {
    this.states.set(state.runId, structuredClone(state));
    return Promise.resolve();
  }

  load(runId: RunId): Promise<RunState | null> {
    const stored = this.states.get(runId);
    return Promise.resolve(stored === undefined ? null : structuredClone(stored));
  }
}
