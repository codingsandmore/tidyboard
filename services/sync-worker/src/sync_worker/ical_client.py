# SPDX-License-Identifier: AGPL-3.0-or-later
"""iCal URL client — fetches and parses a public .ics feed.

Returns the same normalized event shape as caldav_client / sync.py:
    { external_id, summary, dtstart, dtend, rrule, location, description }

Uses httpx for fetching (10 s timeout, max 5 MB), icalendar for parsing,
and dateutil for RRULE expansion (same as the CalDAV path).
"""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx
from icalendar import Calendar as ICalCalendar

from .rrule_expand import expand_rrule

logger = logging.getLogger(__name__)

_MAX_RESPONSE_BYTES = 5 * 1024 * 1024  # 5 MB
_FETCH_TIMEOUT = 10  # seconds

# Normalized event dict (same shape as sync.py NormalizedEvent).
NormalizedEvent = dict[str, Any]


def _to_utc(dt: datetime | None) -> datetime | None:
    """Convert an aware datetime to UTC; treat naive as UTC."""
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    utc = _to_utc(dt)
    return utc.isoformat() if utc is not None else None


def _extract_fields(vevent: Any) -> dict[str, Any]:
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
        dtend = dtstart + vevent.get("duration").dt
    elif dtstart is not None:
        dtend = dtstart + timedelta(hours=1)

    rrule_prop = vevent.get("rrule")
    rrule_str: str | None = None
    if rrule_prop is not None:
        rrule_str = rrule_prop.to_ical().decode()

    exdates: list[datetime] = []
    for ex in vevent.get("exdate", []):
        try:
            dts = ex.dts if hasattr(ex, "dts") else [ex]
            for d in dts:
                raw = d.dt if hasattr(d, "dt") else d
                if isinstance(raw, datetime):
                    exdates.append(raw)
        except Exception:  # noqa: BLE001
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
        "duration": (dtend - dtstart) if (dtstart and dtend) else timedelta(hours=1),
    }


def fetch_and_parse(
    ics_url: str,
    range_start: datetime,
    range_end: datetime,
) -> list[NormalizedEvent]:
    """Fetch an iCal feed from *ics_url* and return normalized events in the range.

    Args:
        ics_url:     Public URL of the .ics feed.
        range_start: Start of the query window (UTC-aware).
        range_end:   End of the query window (UTC-aware).

    Returns:
        List of normalized event dicts ready for upsert.

    Raises:
        httpx.HTTPError: on non-2xx responses or network errors.
        ValueError:      if the response exceeds 5 MB.
    """
    logger.info(
        "Fetching iCal feed",
        extra={"url": ics_url, "range_start": range_start.isoformat(), "range_end": range_end.isoformat()},
    )

    with httpx.Client(timeout=_FETCH_TIMEOUT, follow_redirects=True) as client:
        response = client.get(ics_url)
        response.raise_for_status()

        raw_bytes = response.content
        if len(raw_bytes) > _MAX_RESPONSE_BYTES:
            raise ValueError(
                f"iCal feed response exceeds 5 MB limit ({len(raw_bytes)} bytes): {ics_url}"
            )

    results: list[NormalizedEvent] = []

    try:
        cal = ICalCalendar.from_ical(raw_bytes)
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to parse iCal feed", exc_info=exc, extra={"url": ics_url})
        raise

    for component in cal.walk():
        if component.name != "VEVENT":
            continue

        try:
            fields = _extract_fields(component)
        except Exception as exc:  # noqa: BLE001
            logger.exception("Failed to extract VEVENT fields, skipping", exc_info=exc)
            continue

        dtstart = fields["dtstart"]
        if dtstart is None:
            logger.warning("VEVENT missing DTSTART, skipping")
            continue

        dtstart_utc = _to_utc(dtstart)
        assert dtstart_utc is not None

        if fields["rrule"]:
            try:
                occurrences = expand_rrule(
                    dtstart=dtstart_utc,
                    rrule_string=fields["rrule"],
                    range_start=range_start,
                    range_end=range_end,
                    exdates=[_to_utc(ex) for ex in fields["exdates"] if _to_utc(ex)],  # type: ignore[misc]
                )
            except Exception as exc:  # noqa: BLE001
                logger.exception("RRULE expansion failed, skipping event", exc_info=exc)
                continue

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
            # Non-recurring: include only if it overlaps the range.
            if dtstart_utc < range_end and (_to_utc(fields["dtend"]) or dtstart_utc) >= range_start:
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

    logger.info("iCal parse complete", extra={"event_count": len(results)})
    return results
