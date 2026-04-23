# SPDX-License-Identifier: AGPL-3.0-or-later
"""Integration tests for the recipe scraper — uses vcrpy cassettes (no real network).

Tests tagged @pytest.mark.integration are excluded from the unit-test run:
    pytest -m "not integration" tests/
"""

from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

import pytest

from recipe_scraper.clock import FrozenClock
from recipe_scraper.scraper import _bs4_title, scrape_recipe

UTC = timezone.utc

# ---------------------------------------------------------------------------
# _bs4_title unit tests (no network)
# ---------------------------------------------------------------------------


class TestBs4Title:
    def test_extracts_title_tag(self):
        html = "<html><head><title>My Recipe | Food Blog</title></head><body></body></html>"
        assert _bs4_title(html) == "My Recipe | Food Blog"

    def test_falls_back_to_h1(self):
        html = "<html><head></head><body><h1>Great Pasta</h1></body></html>"
        assert _bs4_title(html) == "Great Pasta"

    def test_returns_none_for_empty_html(self):
        assert _bs4_title("") is None

    def test_malformed_html_doesnt_raise(self):
        # Should not raise — just return None or best-effort title
        result = _bs4_title("<not valid html ><<")
        assert result is None or isinstance(result, str)


# ---------------------------------------------------------------------------
# scrape_recipe unit tests (mock httpx — no network)
# ---------------------------------------------------------------------------


SIMPLE_HTML = """
<html>
<head>
  <title>Test Recipe</title>
  <script type="application/ld+json">
  {
    "@context": "http://schema.org",
    "@type": "Recipe",
    "name": "Test Guacamole",
    "prepTime": "PT10M",
    "cookTime": "PT0M",
    "totalTime": "PT10M",
    "recipeYield": "4 servings",
    "recipeIngredient": ["2 avocados", "1 lime, juiced", "salt to taste"],
    "recipeInstructions": [
      {"@type": "HowToStep", "text": "Mash avocados."},
      {"@type": "HowToStep", "text": "Add lime juice and salt."}
    ]
  }
  </script>
</head>
<body><h1>Test Guacamole</h1></body>
</html>
"""


class TestScrapeRecipeUnit:
    """Mocks httpx so no real HTTP requests are made."""

    def _mock_response(self, html: str, status_code: int = 200) -> MagicMock:
        resp = MagicMock()
        resp.text = html
        resp.content = html.encode()
        resp.status_code = status_code
        resp.raise_for_status = MagicMock()
        return resp

    def test_returns_normalized_recipe(self, frozen_clock):
        with patch("recipe_scraper.scraper.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get.return_value = self._mock_response(SIMPLE_HTML)
            mock_client_cls.return_value = mock_client

            result = scrape_recipe(
                url="https://example.com/guacamole",
                clock=frozen_clock,
                timeout_seconds=10,
            )

        assert result["source_url"] == "https://example.com/guacamole"
        assert result["source_domain"] == "example.com"
        assert isinstance(result["ingredients"], list)
        assert isinstance(result["instructions"], list)
        assert "tags" in result

    def test_bs4_fallback_on_scraper_failure(self, frozen_clock):
        """When recipe-scrapers raises, fall back to BeautifulSoup title."""
        simple_html = "<html><head><title>Just A Title</title></head><body></body></html>"
        with patch("recipe_scraper.scraper.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            mock_client.get.return_value = self._mock_response(simple_html)
            mock_client_cls.return_value = mock_client

            with patch("recipe_scraper.scraper.scrape_html", side_effect=Exception("no recipe")):
                result = scrape_recipe(
                    url="https://example.com/not-a-recipe",
                    clock=frozen_clock,
                )

        assert result["title"] == "Just A Title"
        assert result["ingredients"] == []
        assert result["instructions"] == []

    def test_html_too_large_raises_value_error(self, frozen_clock):
        large_html = "x" * 100
        with patch("recipe_scraper.scraper.httpx.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_client.__enter__ = MagicMock(return_value=mock_client)
            mock_client.__exit__ = MagicMock(return_value=False)
            resp = self._mock_response(large_html)
            resp.content = b"x" * 100
            mock_client.get.return_value = resp
            mock_client_cls.return_value = mock_client

            with pytest.raises(ValueError, match="exceeds limit"):
                scrape_recipe(
                    url="https://example.com/huge",
                    clock=frozen_clock,
                    max_html_bytes=50,
                )


# ---------------------------------------------------------------------------
# Integration test placeholder (vcrpy cassette)
# ---------------------------------------------------------------------------


@pytest.mark.integration
class TestScraperIntegration:
    """Real HTTP scrape tests recorded with vcrpy.

    To record:
      1. Delete the cassette file
      2. Run pytest with --vcr-record=all
      3. Commit the cassette

    To replay: just run pytest (cassette is replayed, no network).
    """

    def test_placeholder_integration(self):
        pytest.skip("No VCR cassette recorded yet — run against a live URL first")
