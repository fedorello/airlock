"""Clock implementations."""

from datetime import UTC, datetime


class SystemClock:
    """Production clock: the current instant in UTC."""

    def now(self) -> datetime:
        return datetime.now(UTC)


class FixedClock:
    """A clock pinned to a fixed instant. Makes time deterministic in tests."""

    def __init__(self, instant: datetime) -> None:
        self._instant = instant

    def now(self) -> datetime:
        return self._instant
