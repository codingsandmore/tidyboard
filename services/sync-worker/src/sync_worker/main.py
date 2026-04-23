# SPDX-License-Identifier: AGPL-3.0-or-later
"""FastAPI application for the Tidyboard CalDAV sync worker.

Endpoints:
  GET  /health  — liveness probe
  POST /sync    — pull events from a CalDAV calendar and return them normalized
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .caldav_client import CalDAVClient
from .clock import Clock, RealClock
from .config import Settings, get_settings
from .ical_client import fetch_and_parse
from .logging_config import configure_logging
from .sync import pull_events

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class SyncRequest(BaseModel):
    """Body for POST /sync."""

    household_id: str = Field(..., description="Tidyboard household UUID")
    calendar_url: str = Field(..., description="Full CalDAV calendar URL")
    username: str = Field(..., description="CalDAV Basic Auth username")
    password: str = Field(..., description="CalDAV Basic Auth password")
    range_start: str = Field(..., description="ISO 8601 UTC datetime — window start")
    range_end: str = Field(..., description="ISO 8601 UTC datetime — window end")


class SyncICalRequest(BaseModel):
    """Body for POST /sync/ical."""

    household_id: str = Field(..., description="Tidyboard household UUID")
    calendar_id: str = Field(..., description="Tidyboard calendar UUID")
    ics_url: str = Field(..., description="Public iCal (.ics) URL")
    range_start: str = Field(..., description="ISO 8601 UTC datetime — window start")
    range_end: str = Field(..., description="ISO 8601 UTC datetime — window end")


class HealthResponse(BaseModel):
    status: str


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------


def create_app(
    settings: Settings | None = None,
    clock: Clock | None = None,
) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        settings: Optional Settings override (useful in tests).
        clock:    Optional Clock override (useful in tests).
    """
    _settings = settings or get_settings()
    _clock: Clock = clock or RealClock()

    configure_logging(_settings.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI):  # type: ignore[misc]
        logger.info(
            "sync-worker starting",
            extra={"port": _settings.port, "log_level": _settings.log_level},
        )
        yield
        logger.info("sync-worker shutting down")

    app = FastAPI(
        title="Tidyboard CalDAV Sync Worker",
        version="0.1.0",
        lifespan=lifespan,
    )

    @app.get("/health", response_model=HealthResponse, tags=["ops"])
    async def health() -> HealthResponse:
        """Liveness probe — always returns 200 while the process is alive."""
        return HealthResponse(status="ok")

    @app.post("/sync", tags=["sync"])
    async def sync(body: SyncRequest) -> list[dict[str, Any]]:
        """Pull events from a CalDAV calendar and return them normalized.

        Returns a JSON array of event objects:
          external_id, summary, dtstart, dtend, rrule, location, description
        """
        try:
            range_start = datetime.fromisoformat(body.range_start)
            range_end = datetime.fromisoformat(body.range_end)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid datetime format: {exc}",
            ) from exc

        if range_start.tzinfo is None or range_end.tzinfo is None:
            raise HTTPException(
                status_code=422,
                detail="range_start and range_end must include timezone info (use UTC, e.g. 2025-01-01T00:00:00+00:00)",
            )

        client = CalDAVClient(
            url=body.calendar_url,
            username=body.username,
            password=body.password,
            timeout=_settings.timeout_seconds,
        )

        try:
            events = pull_events(
                client=client,
                range_start=range_start,
                range_end=range_end,
                clock=_clock,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "CalDAV sync failed",
                exc_info=exc,
                extra={"household_id": body.household_id},
            )
            raise HTTPException(
                status_code=502,
                detail=f"CalDAV sync failed: {exc}",
            ) from exc

        return events

    @app.post("/sync/ical", tags=["sync"])
    async def sync_ical(body: SyncICalRequest) -> list[dict[str, Any]]:
        """Pull events from a public iCal URL and return them normalized.

        Returns a JSON array of event objects:
          external_id, summary, dtstart, dtend, rrule, location, description
        """
        try:
            range_start = datetime.fromisoformat(body.range_start)
            range_end = datetime.fromisoformat(body.range_end)
        except ValueError as exc:
            raise HTTPException(
                status_code=422,
                detail=f"Invalid datetime format: {exc}",
            ) from exc

        if range_start.tzinfo is None or range_end.tzinfo is None:
            raise HTTPException(
                status_code=422,
                detail="range_start and range_end must include timezone info (use UTC, e.g. 2025-01-01T00:00:00+00:00)",
            )

        try:
            events = fetch_and_parse(
                ics_url=body.ics_url,
                range_start=range_start,
                range_end=range_end,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception(
                "iCal sync failed",
                exc_info=exc,
                extra={"household_id": body.household_id, "calendar_id": body.calendar_id},
            )
            raise HTTPException(
                status_code=502,
                detail=f"iCal sync failed: {exc}",
            ) from exc

        return events

    return app


# ---------------------------------------------------------------------------
# Entrypoint (uvicorn)
# ---------------------------------------------------------------------------

app = create_app()
