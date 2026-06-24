import { appendFile } from "node:fs/promises";

import type { AuditSink } from "../../application/ports/audit-sink";
import type { AuditEvent } from "../../domain/audit";

/** Writes a single line somewhere. Injected so the sink stays testable. */
export type LineWriter = (line: string) => void | Promise<void>;

/** Writes each audit event as one JSON line through an injected writer. */
export class LineAuditSink implements AuditSink {
  constructor(private readonly writeLine: LineWriter) {}

  async record(event: AuditEvent): Promise<void> {
    await this.writeLine(JSON.stringify(event));
  }
}

/** An audit sink that prints JSON lines to stdout. */
export function stdoutAuditSink(): LineAuditSink {
  return new LineAuditSink((line) => {
    process.stdout.write(`${line}\n`);
  });
}

/** An audit sink that appends JSON lines to a file (JSONL). */
export function fileAuditSink(path: string): LineAuditSink {
  return new LineAuditSink((line) => appendFile(path, `${line}\n`, "utf8"));
}
