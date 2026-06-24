"""Redis-backed run store: run state persisted as JSON (ADR-0004)."""

from __future__ import annotations

from typing import TYPE_CHECKING

from airlock.domain.run import RunState

if TYPE_CHECKING:
    from redis.asyncio import Redis

    from airlock.domain.identifiers import RunId

_KEY_PREFIX = "airlock:run:"


class RedisRunStore:
    def __init__(self, client: Redis) -> None:
        self._client = client

    async def save(self, state: RunState) -> None:
        await self._client.set(f"{_KEY_PREFIX}{state.run_id}", state.model_dump_json())

    async def load(self, run_id: RunId) -> RunState | None:
        raw = await self._client.get(f"{_KEY_PREFIX}{run_id}")
        if raw is None:
            return None
        return RunState.model_validate_json(raw)
