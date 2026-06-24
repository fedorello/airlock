"""IdGenerator port: the identifiers the agent mints (run and request ids).

Tool-call ids come from the model, not from here."""

from typing import Protocol

from airlock.domain.identifiers import RequestId, RunId


class IdGenerator(Protocol):
    def run_id(self) -> RunId: ...

    def request_id(self) -> RequestId: ...
