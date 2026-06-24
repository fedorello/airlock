"""In-process event bus. Both sides of the bus, awaited in order."""

from pydantic import BaseModel

from airlock.application.ports.event_bus import EventHandler
from airlock.domain.events import EventTopic


class InMemoryEventBus:
    """Implements publish and subscribe. `publish` serializes the event to a
    JSON-compatible payload (as the Redis bus does) and awaits every handler, so
    the flow stays deterministic in tests."""

    def __init__(self) -> None:
        self._handlers: dict[EventTopic, list[EventHandler]] = {}

    async def publish(self, topic: EventTopic, event: BaseModel) -> None:
        payload = event.model_dump(mode="json")
        for handler in self._handlers.get(topic, []):
            result = handler(payload)
            if result is not None:
                await result

    async def subscribe(self, topic: EventTopic, handler: EventHandler) -> None:
        self._handlers.setdefault(topic, []).append(handler)
