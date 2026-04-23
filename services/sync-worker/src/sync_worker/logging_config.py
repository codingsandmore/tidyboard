# SPDX-License-Identifier: AGPL-3.0-or-later
"""Structured JSON logging configuration for the sync worker."""

from __future__ import annotations

import logging
import sys

try:
    import structlog

    _USE_STRUCTLOG = True
except ImportError:
    _USE_STRUCTLOG = False


def configure_logging(level: str = "INFO") -> None:
    """Configure root logging with JSON output.

    Falls back to stdlib JSON-ish formatting when structlog is not installed.

    Args:
        level: Log level string, e.g. "DEBUG", "INFO", "WARNING".
    """
    numeric_level = getattr(logging, level.upper(), logging.INFO)

    if _USE_STRUCTLOG:
        import structlog

        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                structlog.stdlib.add_log_level,
                structlog.stdlib.add_logger_name,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer(),
            ],
            wrapper_class=structlog.stdlib.BoundLogger,
            context_class=dict,
            logger_factory=structlog.stdlib.LoggerFactory(),
            cache_logger_on_first_use=True,
        )
        logging.basicConfig(
            format="%(message)s",
            stream=sys.stdout,
            level=numeric_level,
        )
    else:
        # Minimal stdlib fallback: produce pseudo-JSON lines.
        logging.basicConfig(
            format='{"time": "%(asctime)s", "level": "%(levelname)s", "logger": "%(name)s", "message": "%(message)s"}',
            stream=sys.stdout,
            level=numeric_level,
        )
