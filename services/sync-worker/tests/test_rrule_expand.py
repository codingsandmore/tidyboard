# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for RRULE expansion — no network, no CalDAV."""

from __future__ import annotations

from datetime import datetime, timezone

import pytest

from sync_worker.rrule_expand import expand_rrule


UTC = timezone.utc


def dt(year: int, month: int, day: int, hour: int = 0, minute: int = 0) -> datetime:
    return datetime(year, month, day, hour, minute, tzinfo=UTC)


# ---------------------------------------------------------------------------
# Non-recurring events
# ---------------------------------------------------------------------------


class TestNonRecurring:
    def test_event_in_range_returned(self):
        result = expand_rrule(
            dtstart=dt(2025, 6, 15, 10),
            rrule_string=None,
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert result == [dt(2025, 6, 15, 10)]

    def test_event_before_range_excluded(self):
        result = expand_rrule(
            dtstart=dt(2025, 5, 31, 23),
            rrule_string=None,
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert result == []

    def test_event_at_range_end_excluded(self):
        # range is [start, end) — end is exclusive
        result = expand_rrule(
            dtstart=dt(2025, 7, 1, 0),
            rrule_string=None,
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert result == []

    def test_empty_rrule_string_treated_as_non_recurring(self):
        result = expand_rrule(
            dtstart=dt(2025, 6, 10),
            rrule_string="",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert result == [dt(2025, 6, 10)]


# ---------------------------------------------------------------------------
# Weekly recurrence
# ---------------------------------------------------------------------------


class TestWeeklyRrule:
    def test_weekly_monday(self):
        # Every Monday starting 2025-06-02; June 2025 has 5 Mondays: 2, 9, 16, 23, 30
        result = expand_rrule(
            dtstart=dt(2025, 6, 2, 9),
            rrule_string="FREQ=WEEKLY;BYDAY=MO",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert len(result) == 5
        assert result[0] == dt(2025, 6, 2, 9)
        assert result[-1] == dt(2025, 6, 30, 9)

    def test_weekly_with_count(self):
        result = expand_rrule(
            dtstart=dt(2025, 6, 1, 8),
            rrule_string="FREQ=WEEKLY;COUNT=3",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 12, 1),
        )
        assert len(result) == 3

    def test_weekly_with_until(self):
        result = expand_rrule(
            dtstart=dt(2025, 6, 1, 8),
            rrule_string="FREQ=WEEKLY;UNTIL=20250615T090000Z",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        # Sundays at 08:00 UTC: June 1, 8, 15 — UNTIL is 09:00 UTC on June 15
        # so June 15 at 08:00 is before UNTIL and is included → 3 occurrences
        assert len(result) == 3


# ---------------------------------------------------------------------------
# Daily recurrence
# ---------------------------------------------------------------------------


class TestDailyRrule:
    def test_daily_all_june(self):
        result = expand_rrule(
            dtstart=dt(2025, 6, 1, 7),
            rrule_string="FREQ=DAILY",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert len(result) == 30  # June has 30 days

    def test_daily_interval_2(self):
        result = expand_rrule(
            dtstart=dt(2025, 6, 1, 7),
            rrule_string="FREQ=DAILY;INTERVAL=2;COUNT=5",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
        )
        assert len(result) == 5
        # Occurrences should be every other day
        dates = [r.day for r in result]
        assert dates == [1, 3, 5, 7, 9]


# ---------------------------------------------------------------------------
# Monthly recurrence
# ---------------------------------------------------------------------------


class TestMonthlyRrule:
    def test_monthly_first_of_month(self):
        result = expand_rrule(
            dtstart=dt(2025, 1, 1, 10),
            rrule_string="FREQ=MONTHLY;BYDAY=1MO",
            range_start=dt(2025, 1, 1),
            range_end=dt(2025, 7, 1),
        )
        # First Monday of each month Jan–Jun = 6 occurrences
        assert len(result) == 6


# ---------------------------------------------------------------------------
# EXDATE exclusion
# ---------------------------------------------------------------------------


class TestExdate:
    def test_exdate_removes_occurrence(self):
        # Weekly on Sundays; exclude the second Sunday (June 8)
        # June 2025 has 5 Sundays: 1, 8, 15, 22, 29 → minus 1 excluded = 4
        result = expand_rrule(
            dtstart=dt(2025, 6, 1, 9),
            rrule_string="FREQ=WEEKLY",
            range_start=dt(2025, 6, 1),
            range_end=dt(2025, 7, 1),
            exdates=[dt(2025, 6, 8, 9)],
        )
        assert len(result) == 4
        assert dt(2025, 6, 8, 9) not in result


# ---------------------------------------------------------------------------
# Error cases
# ---------------------------------------------------------------------------


class TestErrors:
    def test_naive_dtstart_raises(self):
        with pytest.raises(ValueError, match="timezone-aware"):
            expand_rrule(
                dtstart=datetime(2025, 6, 1, 9),  # no tzinfo
                rrule_string="FREQ=DAILY",
                range_start=dt(2025, 6, 1),
                range_end=dt(2025, 7, 1),
            )

    def test_naive_range_start_raises(self):
        with pytest.raises(ValueError, match="timezone-aware"):
            expand_rrule(
                dtstart=dt(2025, 6, 1, 9),
                rrule_string="FREQ=DAILY",
                range_start=datetime(2025, 6, 1),  # no tzinfo
                range_end=dt(2025, 7, 1),
            )
