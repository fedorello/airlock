"""Identifier generators."""

import uuid

from airlock.domain.identifiers import RequestId, RunId


class UuidIdGenerator:
    """Production identifiers, backed by random UUIDs."""

    def run_id(self) -> RunId:
        return RunId(f"run-{uuid.uuid4()}")

    def request_id(self) -> RequestId:
        return RequestId(f"req-{uuid.uuid4()}")


class SequentialIdGenerator:
    """Monotonic, predictable identifiers. For deterministic tests and demos."""

    def __init__(self) -> None:
        self._run_count = 0
        self._request_count = 0

    def run_id(self) -> RunId:
        self._run_count += 1
        return RunId(f"run-{self._run_count}")

    def request_id(self) -> RequestId:
        self._request_count += 1
        return RequestId(f"req-{self._request_count}")
