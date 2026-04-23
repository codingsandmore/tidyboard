# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pydantic-settings configuration for the recipe scraper.

All settings are prefixed with TIDYBOARD_SCRAPER_ and can be overridden
via environment variables or a .env file.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="TIDYBOARD_SCRAPER_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    log_level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR)")
    port: int = Field(default=8002, description="TCP port uvicorn listens on")
    timeout_seconds: int = Field(
        default=10,
        description="HTTP timeout in seconds for recipe fetch requests",
    )
    max_html_bytes: int = Field(
        default=5_242_880,
        description="Maximum HTML size in bytes for recipe import (5 MB default)",
    )


def get_settings() -> Settings:
    """Return a Settings instance."""
    return Settings()
