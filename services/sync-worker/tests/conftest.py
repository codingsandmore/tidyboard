# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pytest fixtures for the sync-worker test suite."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from sync_worker.clock import FrozenClock


@pytest.fixture()
def frozen_clock() -> FrozenClock:
    """A FrozenClock fixed at 2025-06-01T12:00:00Z for deterministic tests."""
    return FrozenClock(fixed=datetime(2025, 6, 1, 12, 0, 0, tzinfo=timezone.utc))


@pytest.fixture()
def utc_range():
    """Return a (range_start, range_end) pair spanning 2025-06."""
    start = datetime(2025, 6, 1, 0, 0, 0, tzinfo=timezone.utc)
    end = datetime(2025, 7, 1, 0, 0, 0, tzinfo=timezone.utc)
    return start, end
