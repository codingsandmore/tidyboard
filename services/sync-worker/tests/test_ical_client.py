# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for ical_client.py — no network required.

Network-reliant tests are marked @pytest.mark.integration and skipped by default.
Run with:  pytest -m integration tests/test_ical_client.py
"""

from __future__ import annotations

import textwrap
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from sync_worker.ical_client import fetch_and_parse

# ---------------------------------------------------------------------------
# Fixture iCal data
# ---------------------------------------------------------------------------

UTC = timezone.utc

MINIMAL_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Test//iCal//EN
    BEGIN:VEVENT
    UID:ical-event-001@tidyboard.app
    SUMMARY:Team Standup
    DTSTART:20250610T090000Z
    DTEND:20250610T093000Z
    LOCATION:Zoom
    DESCRIPTION:Daily standup meeting
    END:VEVENT
    END:VCALENDAR
""").encode()

RECURRING_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Test//iCal//EN
    BEGIN:VEVENT
    UID:weekly-standup@tidyboard.app
    SUMMARY:Weekly Standup
    DTSTART:20250602T090000Z
    DTEND:20250602T093000Z
    RRULE:FREQ=WEEKLY;BYDAY=MO
    END:VEVENT
    END:VCALENDAR
""").encode()

ALLDAY_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Test//iCal//EN
    BEGIN:VEVENT
    UID:all-day-event@tidyboard.app
    SUMMARY:Company Holiday
    DTSTART;VALUE=DATE:20250615
    DTEND;VALUE=DATE:20250616
    END:VEVENT
    END:VCALENDAR
""").encode()

MULTI_EVENT_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Test//iCal//EN
    BEGIN:VEVENT
    UID:event-a@tidyboard.app
    SUMMARY:Event A
    DTSTART:20250610T100000Z
    DTEND:20250610T110000Z
    END:VEVENT
    BEGIN:VEVENT
    UID:event-b@tidyboard.app
    SUMMARY:Event B
    DTSTART:20250620T140000Z
    DTEND:20250620T150000Z
    END:VEVENT
    END:VCALENDAR
""").encode()

OUT_OF_RANGE_ICAL = textwrap.dedent("""\
    BEGIN:VCALENDAR
    VERSION:2.0
    PRODID:-//Test//iCal//EN
    BEGIN:VEVENT
    UID:past-event@tidyboard.app
    SUMMARY:Past Event
    DTSTART:20240101T090000Z
    DTEND:20240101T100000Z
    END:VEVENT
    END:VCALENDAR
""").encode()

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_response(content: bytes, status_code: int = 200) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    resp.content = content
    resp.raise_for_status = MagicMock()
    return resp


RANGE_START = datetime(2025, 6, 1, tzinfo=UTC)
RANGE_END = datetime(2025, 7, 1, tzinfo=UTC)


# ---------------------------------------------------------------------------
# Unit tests (mock httpx — no network)
# ---------------------------------------------------------------------------


class TestFetchAndParseUnit:
    """Tests that mock httpx.Client; no network required."""

    def _call(self, ical_bytes: bytes) -> list[dict]:
        with patch("sync_worker.ical_client.httpx.Client") as MockClient:
            instance = MockClient.return_value.__enter__.return_value
            instance.get.return_value = _make_response(ical_bytes)
            return fetch_and_parse("http://example.com/cal.ics", RANGE_START, RANGE_END)

    def test_single_event_normalized(self):
        results = self._call(MINIMAL_ICAL)

        assert len(results) == 1
        evt = results[0]
        assert evt["external_id"] == "ical-event-001@tidyboard.app"
        assert evt["summary"] == "Team Standup"
        assert evt["dtstart"] == "2025-06-10T09:00:00+00:00"
        assert evt["dtend"] == "2025-06-10T09:30:00+00:00"
        assert evt["rrule"] is None
        assert evt["location"] == "Zoom"
        assert evt["description"] == "Daily standup meeting"

    def test_recurring_event_expanded(self):
        results = self._call(RECURRING_ICAL)

        # June 2025 has 5 Mondays: 2, 9, 16, 23, 30
        assert len(results) == 5
        for evt in results:
            assert evt["external_id"] == "weekly-standup@tidyboard.app"
            assert evt["summary"] == "Weekly Standup"
            assert evt["rrule"] is not None
        # Confirm ascending order
        starts = [evt["dtstart"] for evt in results]
        assert starts == sorted(starts)

    def test_allday_event_normalized(self):
        results = self._call(ALLDAY_ICAL)

        assert len(results) == 1
        evt = results[0]
        assert evt["external_id"] == "all-day-event@tidyboard.app"
        assert evt["summary"] == "Company Holiday"
        # All-day dates are converted to midnight UTC
        assert "2025-06-15" in evt["dtstart"]

    def test_multiple_events_returned(self):
        results = self._call(MULTI_EVENT_ICAL)

        assert len(results) == 2
        summaries = {e["summary"] for e in results}
        assert summaries == {"Event A", "Event B"}

    def test_event_outside_range_excluded(self):
        results = self._call(OUT_OF_RANGE_ICAL)
        assert results == []

    def test_empty_calendar_returns_empty_list(self):
        empty_ical = textwrap.dedent("""\
            BEGIN:VCALENDAR
            VERSION:2.0
            PRODID:-//Test//iCal//EN
            END:VCALENDAR
        """).encode()
        results = self._call(empty_ical)
        assert results == []

    def test_oversized_response_raises_value_error(self):
        huge_bytes = b"X" * (5 * 1024 * 1024 + 1)
        with patch("sync_worker.ical_client.httpx.Client") as MockClient:
            instance = MockClient.return_value.__enter__.return_value
            instance.get.return_value = _make_response(huge_bytes)
            with pytest.raises(ValueError, match="5 MB"):
                fetch_and_parse("http://example.com/cal.ics", RANGE_START, RANGE_END)

    def test_http_error_propagates(self):
        import httpx

        with patch("sync_worker.ical_client.httpx.Client") as MockClient:
            instance = MockClient.return_value.__enter__.return_value
            instance.get.return_value = _make_response(b"", status_code=404)
            instance.get.return_value.raise_for_status.side_effect = httpx.HTTPStatusError(
                "404", request=MagicMock(), response=MagicMock()
            )
            with pytest.raises(httpx.HTTPStatusError):
                fetch_and_parse("http://example.com/cal.ics", RANGE_START, RANGE_END)

    def test_malformed_ical_raises(self):
        with patch("sync_worker.ical_client.httpx.Client") as MockClient:
            instance = MockClient.return_value.__enter__.return_value
            instance.get.return_value = _make_response(b"NOT VALID ICAL DATA AT ALL")
            # Should raise (propagated from icalendar.from_ical)
            with pytest.raises(Exception):
                fetch_and_parse("http://example.com/cal.ics", RANGE_START, RANGE_END)


# ---------------------------------------------------------------------------
# Integration tests (real network) — skipped by default
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestICalClientIntegration:
    """Real HTTP tests — run only with -m integration."""

    def test_public_ical_feed(self):
        """Smoke-test against a known public iCal feed (e.g. a holiday calendar)."""
        pytest.skip("No public iCal URL configured — set one and remove this skip.")
