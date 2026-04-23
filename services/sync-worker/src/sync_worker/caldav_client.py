# SPDX-License-Identifier: AGPL-3.0-or-later
"""Thin wrapper around python-caldav v3.

Encapsulates authentication and event fetching so the rest of the
application never imports caldav directly.
"""

from __future__ import annotations

import logging
from datetime import datetime
from typing import Iterator

import caldav  # pip package: caldav
from caldav import Calendar, DAVClient

logger = logging.getLogger(__name__)


class CalDAVClient:
    """Wraps a python-caldav DAVClient for a single calendar URL.

    Args:
        url:      Full CalDAV calendar URL (e.g. https://cal.example.com/dav/user/home/).
        username: HTTP Basic Auth username.
        password: HTTP Basic Auth password.
        timeout:  Socket timeout in seconds passed to the underlying DAVClient.
    """

    def __init__(
        self,
        url: str,
        username: str,
        password: str,
        timeout: int = 30,
    ) -> None:
        self._url = url
        self._username = username
        self._password = password
        self._timeout = timeout
        self._client: DAVClient | None = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _get_client(self) -> DAVClient:
        if self._client is None:
            self._client = DAVClient(
                url=self._url,
                username=self._username,
                password=self._password,
                timeout=self._timeout,
            )
        return self._client

    def _get_calendar(self) -> Calendar:
        client = self._get_client()
        # python-caldav interprets the URL as a calendar object directly when
        # calendar() is called with the URL argument.
        return client.calendar(url=self._url)

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def fetch_events_in_range(
        self,
        start: datetime,
        end: datetime,
    ) -> Iterator[caldav.Event]:
        """Yield CalDAV Event objects whose time range overlaps [start, end).

        Args:
            start: Range start (timezone-aware).
            end:   Range end (timezone-aware).

        Yields:
            caldav.Event objects with their .vobject_instance populated.
        """
        calendar = self._get_calendar()
        logger.debug(
            "Fetching events from CalDAV",
            extra={"url": self._url, "start": start.isoformat(), "end": end.isoformat()},
        )
        results = calendar.search(
            start=start,
            end=end,
            event=True,
            expand=False,  # We expand RRULE ourselves via dateutil
        )
        for event in results:
            yield event
