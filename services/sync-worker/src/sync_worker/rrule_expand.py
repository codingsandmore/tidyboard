# SPDX-License-Identifier: AGPL-3.0-or-later
"""RRULE expansion using dateutil.rrule with correct timezone handling.

RFC 5545 RRULE expansion is surprisingly subtle:
- DTSTART is the anchor; RRULE instances inherit its timezone.
- EXDATE values must be compared in the same tzinfo space.
- UNTIL in RRULE must be UTC when DTSTART is timezone-aware.
- COUNT limits the total number of occurrences.
- BYSETPOS, BYDAY, etc. are all handled by dateutil.rrule natively.

This module keeps the expansion logic isolated and fully unit-testable
without any network or CalDAV dependency.
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Sequence

from dateutil import rrule as du_rrule
from dateutil.parser import isoparse

logger = logging.getLogger(__name__)


def expand_rrule(
    dtstart: datetime,
    rrule_string: str | None,
    range_start: datetime,
    range_end: datetime,
    exdates: Sequence[datetime] = (),
) -> list[datetime]:
    """Expand an RFC 5545 RRULE string into concrete datetimes within a range.

    Args:
        dtstart:      Event start time (timezone-aware).
        rrule_string: Raw RRULE string, e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR".
                      Pass None or "" for non-recurring events — returns
                      [dtstart] if dtstart falls within the range.
        range_start:  Start of the query window (inclusive, timezone-aware).
        range_end:    End of the query window (exclusive, timezone-aware).
        exdates:      Sequence of datetime objects to exclude (EXDATE list).

    Returns:
        Sorted list of occurrence datetimes within [range_start, range_end).
        All returned datetimes carry the same tzinfo as dtstart.
    """
    # Normalise to UTC for comparison when dtstart is tz-aware
    if dtstart.tzinfo is None:
        raise ValueError("dtstart must be timezone-aware")
    if range_start.tzinfo is None or range_end.tzinfo is None:
        raise ValueError("range_start and range_end must be timezone-aware")

    # Non-recurring case
    if not rrule_string:
        if range_start <= dtstart < range_end:
            return [dtstart]
        return []

    # Build the rruleset so we can attach EXDATEs
    rule_set = du_rrule.rruleset()

    # dateutil expects the RRULE to be prefixed with "RRULE:" when using
    # rrulestr in full iCalendar line format, but also accepts bare strings.
    raw = rrule_string.strip()
    if not raw.upper().startswith("RRULE:"):
        raw = "RRULE:" + raw

    # rrulestr parses the line and returns an rrule (or rruleset).
    # ignoretz=False ensures timezone info in UNTIL is respected.
    parsed = du_rrule.rrulestr(
        raw,
        dtstart=dtstart,
        ignoretz=False,
    )
    rule_set.rrule(parsed)

    # Attach exclusion dates (normalised to same tz as dtstart)
    for exdate in exdates:
        if exdate.tzinfo is None:
            exdate = exdate.replace(tzinfo=dtstart.tzinfo)
        rule_set.exdate(exdate)

    # Collect occurrences within the window.
    # rruleset.between is inclusive on both ends; we want [start, end).
    occurrences = rule_set.between(
        after=range_start - timedelta(seconds=1),
        before=range_end,
        inc=True,
    )

    # Filter to strictly [range_start, range_end)
    result = [dt for dt in occurrences if range_start <= dt < range_end]
    logger.debug(
        "RRULE expansion",
        extra={
            "rrule": rrule_string,
            "dtstart": dtstart.isoformat(),
            "occurrences": len(result),
        },
    )
    return sorted(result)


def parse_iso_or_raise(value: str) -> datetime:
    """Parse an ISO 8601 datetime string, raising ValueError on failure."""
    try:
        dt = isoparse(value)
    except (ValueError, OverflowError) as exc:
        raise ValueError(f"Cannot parse datetime: {value!r}") from exc
    return dt
