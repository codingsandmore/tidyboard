# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pull CalDAV events and normalize them into the Tidyboard event shape.

The normalized form matches the Go backend's Event data model:
  external_id  — UID from the VEVENT component (used for dedup)
  summary      — SUMMARY property
  dtstart      — ISO 8601 datetime string (UTC)
  dtend        — ISO 8601 datetime string (UTC); computed from DURATION if absent
  rrule        — raw RRULE string or null
  location     — LOCATION property or null
  description  — DESCRIPTION property or null
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

from icalendar import Calendar as ICalCalendar
from icalendar import vDatetime

from .caldav_client import CalDAVClient
from .clock import Clock
from .rrule_expand import expand_rrule

logger = logging.getLogger(__name__)

# Shape returned for each occurrence of a (possibly recurring) event.
NormalizedEvent = dict[str, Any]


def _to_utc(dt: datetime | None) -> datetime | None:
    """Convert an aware datetime to UTC, or return None."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        # Treat naive datetimes as UTC (safe default)
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    """Format a datetime as ISO 8601 UTC string or return None."""
    if dt is None:
        return None
    utc = _to_utc(dt)
    assert utc is not None
    return utc.isoformat()


def _extract_vevent_fields(vevent: Any) -> dict[str, Any]:
    """Extract raw fields from a VEVENT icalendar component."""
    uid = str(vevent.get("uid", "")) or None
    summary = str(vevent.get("summary", "")) or None
    location = str(vevent.get("location", "")) or None
    description = str(vevent.get("description", "")) or None

    dtstart_prop = vevent.get("dtstart")
    dtstart: datetime | None = None
    if dtstart_prop is not None:
        raw = dtstart_prop.dt
        if isinstance(raw, datetime):
            dtstart = raw
        else:
            # all-day date — convert to midnight UTC
            dtstart = datetime(raw.year, raw.month, raw.day, tzinfo=timezone.utc)

    dtend_prop = vevent.get("dtend")
    dtend: datetime | None = None
    if dtend_prop is not None:
        raw = dtend_prop.dt
        if isinstance(raw, datetime):
            dtend = raw
        else:
            dtend = datetime(raw.year, raw.month, raw.day, tzinfo=timezone.utc)
    elif vevent.get("duration") and dtstart is not None:
        duration = vevent.get("duration").dt
        dtend = dtstart + duration
    elif dtstart is not None:
        # Default: 1 hour
        dtend = dtstart + timedelta(hours=1)

    rrule_prop = vevent.get("rrule")
    rrule_str: str | None = None
    if rrule_prop is not None:
        # icalendar returns vRecur; convert to string representation
        rrule_str = rrule_prop.to_ical().decode()

    exdates: list[datetime] = []
    for ex in vevent.get("exdate", []):
        # exdate can be a list or a single vDDDLists
        try:
            dts = ex.dts if hasattr(ex, "dts") else [ex]
            for d in dts:
                raw = d.dt if hasattr(d, "dt") else d
                if isinstance(raw, datetime):
                    exdates.append(raw)
        except Exception:
            pass

    return {
        "uid": uid,
        "summary": summary,
        "dtstart": dtstart,
        "dtend": dtend,
        "rrule": rrule_str,
        "location": location,
        "description": description,
        "exdates": exdates,
        "duration": dtend - dtstart if (dtstart and dtend) else timedelta(hours=1),
    }


def pull_events(
    client: CalDAVClient,
    range_start: datetime,
    range_end: datetime,
    clock: Clock,
) -> list[NormalizedEvent]:
    """Fetch CalDAV events in [range_start, range_end) and normalize them.

    Recurring events are expanded via dateutil.rrule; each occurrence
    becomes a separate entry in the returned list with the same external_id.

    Args:
        client:      Configured CalDAVClient.
        range_start: Start of the time window (UTC-aware).
        range_end:   End of the time window (UTC-aware).
        clock:       Clock dependency (used for logging/audit timestamps).

    Returns:
        List of normalized event dicts.
    """
    fetched_at = clock.now()
    logger.info(
        "Starting CalDAV pull",
        extra={
            "range_start": range_start.isoformat(),
            "range_end": range_end.isoformat(),
            "fetched_at": fetched_at.isoformat(),
        },
    )

    results: list[NormalizedEvent] = []

    for caldav_event in client.fetch_events_in_range(range_start, range_end):
        try:
            ical_data = caldav_event.data
            cal = ICalCalendar.from_ical(ical_data)
            for component in cal.walk():
                if component.name != "VEVENT":
                    continue

                fields = _extract_vevent_fields(component)
                dtstart = fields["dtstart"]
                if dtstart is None:
                    logger.warning("VEVENT missing DTSTART, skipping")
                    continue

                if fields["rrule"]:
                    # Expand recurring events into individual occurrences
                    occurrences = expand_rrule(
                        dtstart=_to_utc(dtstart),  # type: ignore[arg-type]
                        rrule_string=fields["rrule"],
                        range_start=range_start,
                        range_end=range_end,
                        exdates=[_to_utc(ex) for ex in fields["exdates"] if _to_utc(ex)],  # type: ignore[misc]
                    )
                    duration: timedelta = fields["duration"]
                    for occ in occurrences:
                        results.append(
                            {
                                "external_id": fields["uid"],
                                "summary": fields["summary"],
                                "dtstart": _iso(occ),
                                "dtend": _iso(occ + duration),
                                "rrule": fields["rrule"],
                                "location": fields["location"],
                                "description": fields["description"],
                            }
                        )
                else:
                    results.append(
                        {
                            "external_id": fields["uid"],
                            "summary": fields["summary"],
                            "dtstart": _iso(dtstart),
                            "dtend": _iso(fields["dtend"]),
                            "rrule": None,
                            "location": fields["location"],
                            "description": fields["description"],
                        }
                    )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to parse CalDAV event", exc_info=exc)
            continue

    logger.info("CalDAV pull complete", extra={"event_count": len(results)})
    return results
