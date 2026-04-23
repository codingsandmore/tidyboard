# SPDX-License-Identifier: AGPL-3.0-or-later
"""Normalize raw recipe-scrapers output into the canonical Tidyboard Recipe shape.

The canonical shape mirrors the Go backend's Recipe data model (spec §6.4.1):
  title, source_url, source_domain, image_url,
  prep_minutes, cook_minutes, total_minutes,
  servings, servings_unit,
  ingredients (list of {amt, name}),
  instructions (list of str),
  tags.

Duration fields from recipe-scrapers are already in minutes (int | None).
"""

from __future__ import annotations

import logging
import re
from typing import Any
from urllib.parse import urlparse

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Type alias
# ---------------------------------------------------------------------------

NormalizedRecipe = dict[str, Any]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _domain(url: str) -> str:
    """Extract the bare domain from a URL (strips www.)."""
    try:
        hostname = urlparse(url).hostname or ""
        return re.sub(r"^www\.", "", hostname)
    except Exception:
        return ""


_UNITS = (
    "cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|"
    "grams?|g|kg|ml|l|litres?|liters?|cloves?|pinch|bunch|bunches|"
    "slices?|cans?|packages?|pkg|large|medium|small|whole"
)

_AMOUNT_RE = re.compile(
    r"^"
    r"([\d]+(?:[./][\d]+)?(?:\s+[\d]+(?:[./][\d]+)?)*"   # numeric part: "1", "1/2", "1 1/2"
    r"(?:\s+(?:" + _UNITS + r"))?)"                        # optional unit
    r"\s+(.*)",
    re.IGNORECASE,
)


def _parse_ingredient(raw: str) -> dict[str, str]:
    """Split a raw ingredient string into {amt, name}.

    Best-effort: the first token(s) that look like an amount are taken as
    `amt`; the remainder is `name`.  This is intentionally simple — the Go
    backend's ingredient_matcher service performs the authoritative parse.

    Examples:
      "2 cups flour"           → {"amt": "2 cups", "name": "flour"}
      "1/2 tsp salt"           → {"amt": "1/2 tsp", "name": "salt"}
      "1 1/2 cups milk"        → {"amt": "1 1/2 cups", "name": "milk"}
      "garlic clove"           → {"amt": "", "name": "garlic clove"}
    """
    raw = raw.strip()
    if not raw:
        return {"amt": "", "name": ""}
    m = _AMOUNT_RE.match(raw)
    if m:
        return {"amt": m.group(1).strip(), "name": m.group(2).strip()}
    return {"amt": "", "name": raw}


def _minutes(value: Any) -> int | None:
    """Coerce a duration value to integer minutes, or return None."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Main normalize function
# ---------------------------------------------------------------------------


def normalize(scraped: Any, source_url: str) -> NormalizedRecipe:
    """Convert a recipe_scrapers scraper object into a NormalizedRecipe dict.

    Args:
        scraped:    A recipe_scrapers scraper instance (duck-typed).
        source_url: The original URL the recipe was fetched from.

    Returns:
        NormalizedRecipe dict ready for the Go backend to consume.
    """

    def safe(method_name: str, default: Any = None) -> Any:
        """Call a scraper method safely, returning default on any error."""
        try:
            return getattr(scraped, method_name)()
        except Exception:
            return default

    title: str = safe("title") or "Untitled Recipe"
    image_url: str | None = safe("image")
    prep_minutes: int | None = _minutes(safe("prep_time"))
    cook_minutes: int | None = _minutes(safe("cook_time"))
    total_minutes: int | None = _minutes(safe("total_time"))
    servings_raw: Any = safe("yields")
    servings: int | None = None
    servings_unit: str = "servings"
    if servings_raw:
        # yields() returns e.g. "4 servings" or "12 cookies"
        m = re.match(r"(\d+)\s*(.*)", str(servings_raw).strip())
        if m:
            servings = int(m.group(1))
            unit = m.group(2).strip()
            if unit:
                servings_unit = unit

    raw_ingredients: list[str] = safe("ingredients") or []
    ingredients = [_parse_ingredient(ing) for ing in raw_ingredients]

    raw_instructions: Any = safe("instructions")
    if isinstance(raw_instructions, str):
        # Split on newlines or numbered list markers
        instructions = [
            line.strip()
            for line in re.split(r"\n+|\r\n+", raw_instructions)
            if line.strip()
        ]
    elif isinstance(raw_instructions, list):
        instructions = [str(s).strip() for s in raw_instructions if str(s).strip()]
    else:
        instructions = []

    tags: list[str] = []
    for attr in ("tags", "category", "cuisine"):
        val = safe(attr)
        if isinstance(val, list):
            tags.extend(str(t).strip() for t in val if t)
        elif isinstance(val, str) and val.strip():
            tags.append(val.strip())

    return {
        "title": title,
        "source_url": source_url,
        "source_domain": _domain(source_url),
        "image_url": image_url,
        "prep_minutes": prep_minutes,
        "cook_minutes": cook_minutes,
        "total_minutes": total_minutes,
        "servings": servings,
        "servings_unit": servings_unit,
        "ingredients": ingredients,
        "instructions": instructions,
        "tags": list(dict.fromkeys(tags)),  # deduplicate, preserve order
    }
