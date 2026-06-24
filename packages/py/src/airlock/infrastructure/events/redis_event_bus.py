"""Redis Pub/Sub event bus (ADR-0002). A dedicated subscriber connection feeds
a background listener (`run`) that dispatches to per-topic handlers."""

from __future__ import annotations

import json
from typing import TYPE_CHECKING

from airlock.application.ports.event_bus import EventHandler
from airlock.domain.events import EventTopic

if TYPE_CHECKING:
    from collections.abc import Mapping

    from pydantic import BaseModel
    from redis.asyncio import Redis
    from redis.asyncio.client import PubSub


class RedisEventBus:
    def __init__(self, publisher: Redis, subscriber: Redis) -> None:
        self._publisher = publisher
        self._subscriber = subscriber
        self._handlers: dict[str, list[EventHandler]] = {}
        self._pubsub: PubSub | None = None

    async def publish(self, topic: EventTopic, event: BaseModel) -> None:
        await self._publisher.publish(topic.value, event.model_dump_json())

    async def subscribe(self, topic: EventTopic, handler: EventHandler) -> None:
        self._handlers.setdefault(topic.value, []).append(handler)
        await self._ensure_pubsub().subscribe(topic.value)

    async def run(self) -> None:
        """Listen for messages and dispatch them until the task is cancelled."""
        async for message in self._ensure_pubsub().listen():
            await self._dispatch(message)

    def _ensure_pubsub(self) -> PubSub:
        if self._pubsub is None:
            self._pubsub = self._subscriber.pubsub()
        return self._pubsub

    async def _dispatch(self, message: Mapping[str, object]) -> None:
        if message.get("type") != "message":
            return
        channel = _as_text(message["channel"])
        payload: object = json.loads(_as_text(message["data"]))
        for handler in self._handlers.get(channel, []):
            result = handler(payload)
            if result is not None:
                await result


def _as_text(value: object) -> str:
    if isinstance(value, bytes):
        return value.decode("utf-8")
    return str(value)
