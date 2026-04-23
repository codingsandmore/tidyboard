# SPDX-License-Identifier: AGPL-3.0-or-later
"""FastAPI application for the Tidyboard recipe scraper.

Endpoints:
  GET  /health  — liveness probe
  POST /scrape  — fetch a URL and return a normalized recipe
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from .clock import Clock, RealClock
from .config import Settings, get_settings
from .logging_config import configure_logging
from .scraper import scrape_recipe

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class ScrapeRequest(BaseModel):
    """Body for POST /scrape."""

    url: str = Field(..., description="Full URL of the recipe page to scrape")


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
            "recipe-scraper starting",
            extra={"port": _settings.port, "log_level": _settings.log_level},
        )
        yield
        logger.info("recipe-scraper shutting down")

    app = FastAPI(
        title="Tidyboard Recipe Scraper",
        version="0.1.0",
        lifespan=lifespan,
    )

    @app.get("/health", response_model=HealthResponse, tags=["ops"])
    async def health() -> HealthResponse:
        """Liveness probe — always returns 200 while the process is alive."""
        return HealthResponse(status="ok")

    @app.post("/scrape", tags=["scrape"])
    async def scrape(body: ScrapeRequest) -> dict[str, Any]:
        """Fetch a recipe URL and return a normalized recipe object.

        Returns a JSON object with:
          title, source_url, source_domain, image_url,
          prep_minutes, cook_minutes, total_minutes,
          servings, servings_unit,
          ingredients ([{amt, name}]),
          instructions ([str]),
          tags ([str])
        """
        if not body.url.startswith(("http://", "https://")):
            raise HTTPException(
                status_code=422,
                detail="url must start with http:// or https://",
            )

        try:
            result = scrape_recipe(
                url=body.url,
                clock=_clock,
                timeout_seconds=_settings.timeout_seconds,
                max_html_bytes=_settings.max_html_bytes,
            )
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except Exception as exc:  # noqa: BLE001
            logger.exception("Recipe scrape failed", exc_info=exc, extra={"url": body.url})
            raise HTTPException(
                status_code=502,
                detail=f"Failed to fetch recipe: {exc}",
            ) from exc

        return result

    return app


# ---------------------------------------------------------------------------
# Entrypoint (uvicorn)
# ---------------------------------------------------------------------------

app = create_app()
