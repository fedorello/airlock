"""In-memory run store. Stores the serialized form so the agent never shares a
mutable reference with the store (and serializability is exercised)."""

from airlock.domain.identifiers import RunId
from airlock.domain.run import RunState


class InMemoryRunStore:
    def __init__(self) -> None:
        self._states: dict[str, str] = {}

    async def save(self, state: RunState) -> None:
        self._states[state.run_id] = state.model_dump_json()

    async def load(self, run_id: RunId) -> RunState | None:
        raw = self._states.get(run_id)
        if raw is None:
            return None
        return RunState.model_validate_json(raw)
