//go:build unit

package service_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/service"
)

// scraperServer starts an httptest server that returns the given status and body
// for any request to /scrape.
func scraperServer(t *testing.T, statusCode int, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

// minimalScrapedRecipe returns a JSON string for a valid ScrapedRecipe.
func minimalScrapedRecipe() string {
	prep := 10
	cook := 20
	total := 30
	servings := 4
	m := map[string]any{
		"title":         "Pasta Carbonara",
		"source_url":    "https://example.com/pasta",
		"source_domain": "example.com",
		"image_url":     nil,
		"prep_minutes":  prep,
		"cook_minutes":  cook,
		"total_minutes": total,
		"servings":      servings,
		"servings_unit": "servings",
		"ingredients":   []any{},
		"instructions":  []any{},
		"tags":          []any{"pasta", "italian"},
	}
	b, _ := json.Marshal(m)
	return string(b)
}

// TestRecipeClient_Scrape_Success verifies the client correctly decodes a happy-path
// scraper response. This exercises the same code path that RecipeService.Import uses
// for the network call.
func TestRecipeClient_Scrape_Success(t *testing.T) {
	srv := scraperServer(t, http.StatusOK, minimalScrapedRecipe())
	rc := client.NewRecipeClient(srv.URL, 0)

	recipe, err := rc.Scrape(context.Background(), "https://example.com/pasta")
	require.NoError(t, err)
	assert.Equal(t, "Pasta Carbonara", recipe.Title)
	assert.Equal(t, "example.com", recipe.SourceDomain)
	assert.Equal(t, []string{"pasta", "italian"}, recipe.Tags)
	prepWant := 10
	assert.Equal(t, &prepWant, recipe.PrepMinutes)
}

// TestRecipeService_Import_ScraperFailed verifies that a non-2xx from the scraper
// maps to ErrScraperFailed.
func TestRecipeService_Import_ScraperFailed(t *testing.T) {
	srv := scraperServer(t, http.StatusInternalServerError, `{"error":"scrape failed"}`)
	rc := client.NewRecipeClient(srv.URL, 0)
	svc := service.NewRecipeService(nil, rc)

	_, err := svc.Import(context.Background(), uuid.New(), uuid.New(), "https://example.com/pasta")
	require.Error(t, err)
	assert.ErrorIs(t, err, service.ErrScraperFailed)
}

// TestRecipeService_Import_ScraperTimeout verifies that a cancelled context maps
// to ErrScraperTimeout.
func TestRecipeService_Import_ScraperTimeout(t *testing.T) {
	srv := scraperServer(t, http.StatusOK, minimalScrapedRecipe())
	rc := client.NewRecipeClient(srv.URL, 0)
	svc := service.NewRecipeService(nil, rc)

	// Cancel the context before making the request.
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := svc.Import(ctx, uuid.New(), uuid.New(), "https://example.com/pasta")
	require.Error(t, err)
	assert.ErrorIs(t, err, service.ErrScraperTimeout)
}

// TestRecipeService_Import_NilScraper verifies that a nil scraper returns ErrScraperFailed.
func TestRecipeService_Import_NilScraper(t *testing.T) {
	svc := service.NewRecipeService(nil, nil)
	_, err := svc.Import(context.Background(), uuid.New(), uuid.New(), "https://example.com/pasta")
	require.Error(t, err)
	assert.ErrorIs(t, err, service.ErrScraperFailed)
}
