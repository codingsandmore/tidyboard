# SPDX-License-Identifier: AGPL-3.0-or-later
"""Integration tests for CalDAV sync — uses vcrpy cassettes (no real network).

These tests are tagged @pytest.mark.integration so they can be excluded from
the unit-test run:
    pytest -m "not integration" tests/
"""

from __future__ import annotations

import os
import textwrap
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from sync_worker.clock import FrozenClock
from sync_worker.sync import pull_events

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

UTC = timezone.utc

MINIMAL_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Tidyboard//SyncWorker//EN
    BEGIN:VEVENT
    UID:test-event-001@tidyboard.app
    SUMMARY:Team Standup
    DTSTART:20250610T090000Z
    DTEND:20250610T093000Z
    LOCATION:Zoom
    DESCRIPTION:Daily standup meeting
    END:VEVENT
    END:VCALENDAR
""")

RECURRING_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Tidyboard//SyncWorker//EN
    BEGIN:VEVENT
    UID:recurring-standup@tidyboard.app
    SUMMARY:Weekly Standup
    DTSTART:20250602T090000Z
    DTEND:20250602T093000Z
    RRULE:FREQ=WEEKLY;BYDAY=MO
    END:VEVENT
    END:VCALENDAR
""")


def _make_mock_event(ical_data: str) -> MagicMock:
    evt = MagicMock()
    evt.data = ical_data
    return evt


# ---------------------------------------------------------------------------
# Unit-level sync tests (mock the CalDAV client — no network)
# ---------------------------------------------------------------------------


class TestPullEventsUnit:
    """Tests that mock the CalDAV client; no network required."""

    def test_single_event_normalized(self, frozen_clock):
        mock_client = MagicMock()
        mock_client.fetch_events_in_range.return_value = [
            _make_mock_event(MINIMAL_ICAL)
        ]

        results = pull_events(
            client=mock_client,
            range_start=datetime(2025, 6, 1, tzinfo=UTC),
            range_end=datetime(2025, 7, 1, tzinfo=UTC),
            clock=frozen_clock,
        )

        assert len(results) == 1
        evt = results[0]
        assert evt["external_id"] == "test-event-001@tidyboard.app"
        assert evt["summary"] == "Team Standup"
        assert evt["dtstart"] == "2025-06-10T09:00:00+00:00"
        assert evt["dtend"] == "2025-06-10T09:30:00+00:00"
        assert evt["rrule"] is None
        assert evt["location"] == "Zoom"
        assert evt["description"] == "Daily standup meeting"

    def test_recurring_event_expanded(self, frozen_clock):
        mock_client = MagicMock()
        mock_client.fetch_events_in_range.return_value = [
            _make_mock_event(RECURRING_ICAL)
        ]

        results = pull_events(
            client=mock_client,
            range_start=datetime(2025, 6, 1, tzinfo=UTC),
            range_end=datetime(2025, 7, 1, tzinfo=UTC),
            clock=frozen_clock,
        )

        # June 2025 has 5 Mondays: 2, 9, 16, 23, 30
        assert len(results) == 5
        for evt in results:
            assert evt["external_id"] == "recurring-standup@tidyboard.app"
            assert evt["summary"] == "Weekly Standup"
            assert evt["rrule"] is not None

    def test_empty_calendar_returns_empty_list(self, frozen_clock):
        mock_client = MagicMock()
        mock_client.fetch_events_in_range.return_value = []

        results = pull_events(
            client=mock_client,
            range_start=datetime(2025, 6, 1, tzinfo=UTC),
            range_end=datetime(2025, 7, 1, tzinfo=UTC),
            clock=frozen_clock,
        )

        assert results == []

    def test_malformed_event_skipped_gracefully(self, frozen_clock):
        """A corrupt iCal payload should be skipped without crashing."""
        mock_client = MagicMock()
        mock_client.fetch_events_in_range.return_value = [
            _make_mock_event("NOT VALID ICAL DATA"),
            _make_mock_event(MINIMAL_ICAL),
        ]

        results = pull_events(
            client=mock_client,
            range_start=datetime(2025, 6, 1, tzinfo=UTC),
            range_end=datetime(2025, 7, 1, tzinfo=UTC),
            clock=frozen_clock,
        )

        # The valid event should still be returned
        assert len(results) == 1
        assert results[0]["summary"] == "Team Standup"


# ---------------------------------------------------------------------------
# Integration test placeholder (vcrpy cassette)
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestCalDAVIntegration:
    """Real CalDAV interaction tests recorded with vcrpy.

    To record a new cassette:
      1. Set environment variables: CALDAV_URL, CALDAV_USERNAME, CALDAV_PASSWORD
      2. Delete the cassette file and run pytest with --vcr-record=all
      3. Commit the cassette to the repo

    To replay: just run pytest normally (cassette is replayed, no network).
    """

    def test_placeholder_integration(self):
        """Placeholder — replace with a vcrpy-decorated test once cassettes exist."""
        pytest.skip("No VCR cassette recorded yet — run with a real CalDAV server first")
