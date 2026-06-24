"""Clock port: the current instant, injected so time is deterministic in tests."""

from datetime import datetime
from typing import Protocol


class Clock(Protocol):
    def now(self) -> datetime:
        """The current instant, as a timezone-aware UTC datetime."""
        ...
