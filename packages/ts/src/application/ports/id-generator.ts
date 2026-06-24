import type { RequestId, RunId } from "../../domain/identifiers";

/**
 * Produces the branded identifiers the agent mints: the run id and the approval
 * request id. Tool-call ids come from the model/provider, not from here.
 * Injected so identifiers are deterministic in tests.
 */
export interface IdGenerator {
  runId(): RunId;
  requestId(): RequestId;
}
