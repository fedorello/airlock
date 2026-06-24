import type { RequestId, RunId, ToolCallId } from "../../domain/identifiers";

/** Produces the branded identifiers used across a run. Injected for determinism. */
export interface IdGenerator {
  runId(): RunId;
  requestId(): RequestId;
  toolCallId(): ToolCallId;
}
