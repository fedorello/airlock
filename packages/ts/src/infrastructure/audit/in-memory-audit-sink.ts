import type { AuditSink } from "../../application/ports/audit-sink";
import type { AuditEvent } from "../../domain/audit";

/** Collects audit events in memory so tests can inspect what happened. */
export class InMemoryAuditSink implements AuditSink {
  private readonly events: AuditEvent[] = [];

  record(event: AuditEvent): Promise<void> {
    this.events.push(event);
    return Promise.resolve();
  }

  /** All events recorded so far, in order. */
  all(): readonly AuditEvent[] {
    return this.events;
  }
}
