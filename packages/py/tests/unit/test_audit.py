"""Tests for the JSONL audit sinks."""

import json
from pathlib import Path

import pytest

from airlock import LineAuditSink, file_audit_sink, stdout_audit_sink
from airlock.domain.audit import AuditEvent, AuditEventType
from airlock.domain.identifiers import RunId

EVENT = AuditEvent(
    run_id=RunId("run-1"),
    type=AuditEventType.MODEL_CALLED,
    at="2026-01-01T00:00:00+00:00",
    data={"k": "v"},
)


async def test_line_sink_writes_one_json_line() -> None:
    lines: list[str] = []
    sink = LineAuditSink(lines.append)

    await sink.record(EVENT)

    assert len(lines) == 1
    assert json.loads(lines[0])["type"] == "model_called"


async def test_file_sink_appends_each_event(tmp_path: Path) -> None:
    path = tmp_path / "audit.log"
    sink = file_audit_sink(path)

    await sink.record(EVENT)
    await sink.record(EVENT)

    written = path.read_text(encoding="utf-8").strip().splitlines()
    assert len(written) == 2
    assert json.loads(written[0])["run_id"] == "run-1"


async def test_stdout_sink_prints_json(capsys: pytest.CaptureFixture[str]) -> None:
    sink = stdout_audit_sink()

    await sink.record(EVENT)

    captured = capsys.readouterr()
    assert json.loads(captured.out.strip())["type"] == "model_called"
