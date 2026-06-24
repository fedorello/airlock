import { randomUUID } from "node:crypto";

import type { IdGenerator } from "../../application/ports/id-generator";
import type { RequestId, RunId } from "../../domain/identifiers";

/** Production identifiers, backed by random UUIDs. */
export class UuidIdGenerator implements IdGenerator {
  runId(): RunId {
    return `run-${randomUUID()}` as RunId;
  }

  requestId(): RequestId {
    return `req-${randomUUID()}` as RequestId;
  }
}
