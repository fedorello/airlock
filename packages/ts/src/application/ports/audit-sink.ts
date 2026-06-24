import type { AuditEvent } from "../../domain/audit";

/** Append-only record of everything an agent does. */
export interface AuditSink {
  record(event: AuditEvent): Promise<void>;
}
