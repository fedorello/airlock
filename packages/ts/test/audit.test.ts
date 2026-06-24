import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type AuditEvent,
  fileAuditSink,
  LineAuditSink,
  type RunId,
  stdoutAuditSink,
} from "../src/index";

function auditEvent(type: AuditEvent["type"]): AuditEvent {
  return { runId: "run-1" as RunId, type, at: "2026-01-01T00:00:00.000Z", data: {} };
}

describe("LineAuditSink", () => {
  it("writes each event as a JSON line through the injected writer", async () => {
    const lines: string[] = [];
    const sink = new LineAuditSink((line) => {
      lines.push(line);
    });

    await sink.record(auditEvent("model_called"));

    expect(lines).toEqual([JSON.stringify(auditEvent("model_called"))]);
  });
});

describe("stdoutAuditSink", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("prints a JSON line to stdout", async () => {
    const write = vi.spyOn(process.stdout, "write").mockReturnValue(true);

    await stdoutAuditSink().record(auditEvent("run_completed"));

    expect(write).toHaveBeenCalledWith(`${JSON.stringify(auditEvent("run_completed"))}\n`);
  });
});

describe("fileAuditSink", () => {
  it("appends JSON lines to a file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "airlock-audit-"));
    const path = join(dir, "audit.jsonl");
    const sink = fileAuditSink(path);

    await sink.record(auditEvent("model_called"));
    await sink.record(auditEvent("run_completed"));
    const contents = await readFile(path, "utf8");
    await rm(dir, { recursive: true, force: true });

    const lines = contents.trimEnd().split("\n");
    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ type: "model_called" });
  });
});
