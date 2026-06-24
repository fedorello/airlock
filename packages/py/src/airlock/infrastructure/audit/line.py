"""Audit sinks that write one JSON line per event (JSONL)."""

import sys
from collections.abc import Callable
from pathlib import Path

from airlock.domain.audit import AuditEvent


class LineAuditSink:
    """Writes each audit event as a JSON line via the injected `write_line`."""

    def __init__(self, write_line: Callable[[str], None]) -> None:
        self._write_line = write_line

    async def record(self, event: AuditEvent) -> None:
        self._write_line(event.model_dump_json())


def _write_stdout(line: str) -> None:
    sys.stdout.write(f"{line}\n")


def stdout_audit_sink() -> LineAuditSink:
    """Writes audit events to stdout."""
    return LineAuditSink(_write_stdout)


def file_audit_sink(path: Path) -> LineAuditSink:
    """Appends audit events to a file."""

    def append(line: str) -> None:
        with path.open("a", encoding="utf-8") as handle:
            handle.write(f"{line}\n")

    return LineAuditSink(append)
