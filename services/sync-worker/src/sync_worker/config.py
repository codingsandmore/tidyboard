# SPDX-License-Identifier: AGPL-3.0-or-later
"""Pydantic-settings configuration for the sync worker.

All settings are prefixed with TIDYBOARD_SYNC_ and can be overridden
via environment variables or a .env file.
"""

from __future__ import annotations

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="TIDYBOARD_SYNC_",
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    log_level: str = Field(default="INFO", description="Log level (DEBUG/INFO/WARNING/ERROR)")
    port: int = Field(default=8001, description="TCP port uvicorn listens on")
    timeout_seconds: int = Field(
        default=30,
        description="HTTP timeout in seconds for CalDAV requests",
    )


def get_settings() -> Settings:
    """Return a cached Settings instance.

    Using a plain function (rather than @lru_cache) keeps it easy to
    override in tests by patching the environment before import.
    """
    return Settings()
