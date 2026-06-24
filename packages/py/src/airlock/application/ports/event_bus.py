"""Event-bus ports. The publish and subscribe sides are separate (Interface
Segregation): the agent core depends only on EventPublisher; driving adapters
(the runner, approvers) depend on EventSubscriber."""

from collections.abc import Awaitable, Callable
from typing import Protocol

from pydantic import BaseModel

from airlock.domain.events import EventTopic

EventHandler = Callable[[object], Awaitable[None] | None]
"""Receives a JSON-compatible payload (a dict) and handles it."""


class EventPublisher(Protocol):
    async def publish(self, topic: EventTopic, event: BaseModel) -> None: ...


class EventSubscriber(Protocol):
    async def subscribe(self, topic: EventTopic, handler: EventHandler) -> None: ...
