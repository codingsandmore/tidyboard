# SPDX-License-Identifier: AGPL-3.0-or-later
"""Recipe fetching and scraping with graceful fallback to BeautifulSoup.

Pipeline:
  1. Fetch URL with httpx (respects timeout_seconds from config).
  2. Try recipe-scrapers (supports 631+ sites).
  3. On failure, fall back to BeautifulSoup title extraction so we always
     return at least { title, source_url, source_domain }.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from bs4 import BeautifulSoup
from recipe_scrapers import scrape_html

from .clock import Clock
from .normalize import NormalizedRecipe, normalize

logger = logging.getLogger(__name__)

_DEFAULT_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (compatible; Tidyboard/0.1; +https://tidyboard.app)"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
}


def scrape_recipe(
    url: str,
    clock: Clock,
    timeout_seconds: int = 10,
    max_html_bytes: int = 5_242_880,
) -> NormalizedRecipe:
    """Fetch a URL and extract recipe data.

    Args:
        url:             Full URL of the recipe page.
        clock:           Clock dependency (used for audit/logging timestamps).
        timeout_seconds: HTTP request timeout.
        max_html_bytes:  Maximum HTML body size accepted (bytes).

    Returns:
        NormalizedRecipe dict.

    Raises:
        httpx.HTTPError:  Network or HTTP error fetching the URL.
        ValueError:       URL is invalid or HTML exceeds size limit.
    """
    fetched_at = clock.now()
    logger.info(
        "Fetching recipe URL",
        extra={"url": url, "fetched_at": fetched_at.isoformat()},
    )

    with httpx.Client(
        follow_redirects=True,
        timeout=timeout_seconds,
        headers=_DEFAULT_HEADERS,
    ) as client:
        response = client.get(url)
        response.raise_for_status()

    content_length = len(response.content)
    if content_length > max_html_bytes:
        raise ValueError(
            f"HTML response size {content_length} exceeds limit {max_html_bytes}"
        )

    html = response.text

    # --- Attempt 1: recipe-scrapers ----------------------------------------
    try:
        scraped = scrape_html(html, org_url=url)
        result = normalize(scraped, source_url=url)
        logger.info(
            "recipe-scrapers succeeded",
            extra={"url": url, "title": result.get("title")},
        )
        return result
    except Exception as exc:  # noqa: BLE001
        logger.warning(
            "recipe-scrapers failed, falling back to BeautifulSoup",
            extra={"url": url, "error": str(exc)},
        )

    # --- Attempt 2: BeautifulSoup title-only fallback -----------------------
    title = _bs4_title(html) or url
    logger.info(
        "BeautifulSoup fallback result",
        extra={"url": url, "title": title},
    )
    from .normalize import _domain  # local import to avoid circular

    return {
        "title": title,
        "source_url": url,
        "source_domain": _domain(url),
        "image_url": None,
        "prep_minutes": None,
        "cook_minutes": None,
        "total_minutes": None,
        "servings": None,
        "servings_unit": "servings",
        "ingredients": [],
        "instructions": [],
        "tags": [],
    }


def _bs4_title(html: str) -> str | None:
    """Extract the page <title> using BeautifulSoup."""
    try:
        soup = BeautifulSoup(html, "html.parser")
        tag = soup.find("title")
        if tag:
            return tag.get_text(strip=True) or None
        h1 = soup.find("h1")
        if h1:
            return h1.get_text(strip=True) or None
    except Exception:
        pass
    return None
