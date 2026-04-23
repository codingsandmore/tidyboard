# SPDX-License-Identifier: AGPL-3.0-or-later
"""Unit tests for the recipe normalization layer."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest

from recipe_scraper.normalize import normalize, _parse_ingredient, _domain, _minutes


# ---------------------------------------------------------------------------
# _domain helper
# ---------------------------------------------------------------------------


class TestDomain:
    def test_strips_www(self):
        assert _domain("https://www.allrecipes.com/recipe/123/") == "allrecipes.com"

    def test_no_www(self):
        assert _domain("https://cooking.nytimes.com/recipes/1234") == "cooking.nytimes.com"

    def test_invalid_url(self):
        assert _domain("not-a-url") == ""


# ---------------------------------------------------------------------------
# _minutes helper
# ---------------------------------------------------------------------------


class TestMinutes:
    def test_int(self):
        assert _minutes(15) == 15

    def test_string_int(self):
        assert _minutes("30") == 30

    def test_none(self):
        assert _minutes(None) is None

    def test_non_numeric_string(self):
        assert _minutes("PT15M") is None


# ---------------------------------------------------------------------------
# _parse_ingredient helper
# ---------------------------------------------------------------------------


class TestParseIngredient:
    def test_amount_and_name(self):
        result = _parse_ingredient("2 cups flour")
        assert result["name"] == "flour"
        assert "2" in result["amt"]

    def test_fraction_amount(self):
        result = _parse_ingredient("1/2 tsp salt")
        assert "1/2" in result["amt"]
        assert result["name"] == "salt"

    def test_no_amount(self):
        result = _parse_ingredient("garlic clove")
        assert result["name"] == "garlic clove"
        assert result["amt"] == ""

    def test_empty_string(self):
        result = _parse_ingredient("")
        assert result["name"] == ""
        assert result["amt"] == ""


# ---------------------------------------------------------------------------
# normalize() with a mock scraper
# ---------------------------------------------------------------------------


def _make_scraper(
    title="Guacamole",
    image=None,
    prep_time=10,
    cook_time=0,
    total_time=10,
    yields="4 servings",
    ingredients=None,
    instructions="Mash avocados.\nAdd lime juice.\nSeason with salt.",
    tags=None,
    category=None,
    cuisine=None,
) -> MagicMock:
    scraper = MagicMock()
    scraper.title.return_value = title
    scraper.image.return_value = image
    scraper.prep_time.return_value = prep_time
    scraper.cook_time.return_value = cook_time
    scraper.total_time.return_value = total_time
    scraper.yields.return_value = yields
    scraper.ingredients.return_value = ingredients or [
        "2 ripe avocados",
        "1 tbsp lime juice",
        "1/2 tsp salt",
    ]
    scraper.instructions.return_value = instructions
    scraper.tags.return_value = tags or []
    scraper.category.return_value = category
    scraper.cuisine.return_value = cuisine
    return scraper


class TestNormalize:
    def test_basic_fields(self):
        scraper = _make_scraper()
        result = normalize(scraper, source_url="https://www.allrecipes.com/recipe/24074/")

        assert result["title"] == "Guacamole"
        assert result["source_url"] == "https://www.allrecipes.com/recipe/24074/"
        assert result["source_domain"] == "allrecipes.com"
        assert result["prep_minutes"] == 10
        assert result["cook_minutes"] == 0
        assert result["total_minutes"] == 10

    def test_servings_parsed(self):
        scraper = _make_scraper(yields="12 cookies")
        result = normalize(scraper, source_url="https://example.com/")
        assert result["servings"] == 12
        assert result["servings_unit"] == "cookies"

    def test_ingredients_normalized(self):
        scraper = _make_scraper()
        result = normalize(scraper, source_url="https://example.com/")
        assert isinstance(result["ingredients"], list)
        assert len(result["ingredients"]) == 3
        for ing in result["ingredients"]:
            assert "amt" in ing
            assert "name" in ing

    def test_instructions_split_from_string(self):
        scraper = _make_scraper(instructions="Step 1.\nStep 2.\nStep 3.")
        result = normalize(scraper, source_url="https://example.com/")
        assert result["instructions"] == ["Step 1.", "Step 2.", "Step 3."]

    def test_instructions_list_passthrough(self):
        scraper = _make_scraper(instructions=["Chop.", "Mix.", "Serve."])
        result = normalize(scraper, source_url="https://example.com/")
        assert result["instructions"] == ["Chop.", "Mix.", "Serve."]

    def test_tags_deduplicated(self):
        scraper = _make_scraper(
            tags=["vegetarian", "quick"],
            category="appetizer",
            cuisine="Mexican",
        )
        result = normalize(scraper, source_url="https://example.com/")
        tags = result["tags"]
        assert "vegetarian" in tags
        assert "quick" in tags
        assert "appetizer" in tags
        assert "Mexican" in tags
        assert len(tags) == len(set(tags))  # no duplicates

    def test_scraper_method_raises_returns_default(self):
        """If a scraper method raises, normalize should still succeed."""
        scraper = MagicMock()
        scraper.title.return_value = "Test"
        scraper.image.side_effect = Exception("not supported")
        scraper.prep_time.side_effect = Exception("not supported")
        scraper.cook_time.side_effect = Exception("not supported")
        scraper.total_time.side_effect = Exception("not supported")
        scraper.yields.side_effect = Exception("not supported")
        scraper.ingredients.return_value = []
        scraper.instructions.return_value = []
        scraper.tags.side_effect = Exception("not supported")
        scraper.category.side_effect = Exception("not supported")
        scraper.cuisine.side_effect = Exception("not supported")

        result = normalize(scraper, source_url="https://example.com/")
        assert result["title"] == "Test"
        assert result["prep_minutes"] is None
        assert result["ingredients"] == []

    def test_no_title_falls_back_to_untitled(self):
        scraper = MagicMock()
        scraper.title.return_value = None
        scraper.image.return_value = None
        scraper.prep_time.return_value = None
        scraper.cook_time.return_value = None
        scraper.total_time.return_value = None
        scraper.yields.return_value = None
        scraper.ingredients.return_value = []
        scraper.instructions.return_value = []
        scraper.tags.return_value = []
        scraper.category.return_value = None
        scraper.cuisine.return_value = None

        result = normalize(scraper, source_url="https://example.com/")
        assert result["title"] == "Untitled Recipe"
