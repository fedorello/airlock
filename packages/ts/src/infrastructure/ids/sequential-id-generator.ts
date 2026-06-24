import type { IdGenerator } from "../../application/ports/id-generator";
import type { RequestId, RunId } from "../../domain/identifiers";

/** Monotonic, predictable identifiers. For deterministic tests and demos. */
export class SequentialIdGenerator implements IdGenerator {
  private runCount = 0;
  private requestCount = 0;

  runId(): RunId {
    this.runCount += 1;
    return `run-${this.runCount}` as RunId;
  }

  requestId(): RequestId {
    this.requestCount += 1;
    return `req-${this.requestCount}` as RequestId;
  }
}
