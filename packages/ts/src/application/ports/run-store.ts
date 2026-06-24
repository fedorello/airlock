import type { RunId } from "../../domain/identifiers";
import type { RunState } from "../../domain/run";

/** Persists run state so a run can pause and resume anywhere (see ADR-0004). */
export interface RunStore {
  save(state: RunState): Promise<void>;
  load(runId: RunId): Promise<RunState | null>;
}
