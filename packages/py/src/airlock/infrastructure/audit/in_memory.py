"""In-memory audit sink. Collects events so tests can inspect them."""

from airlock.domain.audit import AuditEvent


class InMemoryAuditSink:
    def __init__(self) -> None:
        self._events: list[AuditEvent] = []

    async def record(self, event: AuditEvent) -> None:
        self._events.append(event)

    def all(self) -> tuple[AuditEvent, ...]:
        return tuple(self._events)
