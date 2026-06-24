"""AuditSink port: an append-only record of everything an agent does."""

from typing import Protocol

from airlock.domain.audit import AuditEvent


class AuditSink(Protocol):
    async def record(self, event: AuditEvent) -> None: ...
