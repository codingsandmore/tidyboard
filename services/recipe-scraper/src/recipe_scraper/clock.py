# SPDX-License-Identifier: AGPL-3.0-or-later
"""Clock interface — never call datetime.now() directly in production code.

All code that needs the current time must accept a Clock dependency
so that tests can inject a FrozenClock for deterministic behaviour.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from datetime import datetime, timezone


class Clock(ABC):
    """Abstract clock interface."""

    @abstractmethod
    def now(self) -> datetime:
        """Return the current time as a timezone-aware UTC datetime."""


class RealClock(Clock):
    """Wall-clock implementation backed by datetime.now(timezone.utc)."""

    def now(self) -> datetime:
        return datetime.now(timezone.utc)


class FrozenClock(Clock):
    """Deterministic clock for tests — always returns the same instant.

    Args:
        fixed: The datetime this clock always returns.  Must be timezone-aware.
    """

    def __init__(self, fixed: datetime) -> None:
        if fixed.tzinfo is None:
            raise ValueError("FrozenClock requires a timezone-aware datetime")
        self._fixed = fixed

    def now(self) -> datetime:
        return self._fixed
