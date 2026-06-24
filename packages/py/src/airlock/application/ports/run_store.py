"""RunStore port: persists run state so a run can pause and resume (ADR-0004)."""

from typing import Protocol

from airlock.domain.identifiers import RunId
from airlock.domain.run import RunState


class RunStore(Protocol):
    async def save(self, state: RunState) -> None: ...

    async def load(self, run_id: RunId) -> RunState | None: ...
