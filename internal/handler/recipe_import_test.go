//go:build integration

package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// scraperStub starts an httptest server simulating the Python recipe scraper.
func scraperStub(t *testing.T, statusCode int, body string) *httptest.Server {
	t.Helper()
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(statusCode)
		_, _ = w.Write([]byte(body))
	}))
	t.Cleanup(srv.Close)
	return srv
}

func minimalScraperResponse() string {
	m := map[string]any{
		"title":         "Test Recipe",
		"source_url":    "https://example.com/test-recipe",
		"source_domain": "example.com",
		"image_url":     nil,
		"prep_minutes":  5,
		"cook_minutes":  15,
		"total_minutes": 20,
		"servings":      2,
		"servings_unit": "servings",
		"ingredients":   []any{},
		"instructions":  []any{"Step 1", "Step 2"},
		"tags":          []any{"quick", "easy"},
	}
	b, _ := json.Marshal(m)
	return string(b)
}

func setupRecipeImportHandler(t *testing.T, scraperURL string) (*httptest.Server, string) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	rc := client.NewRecipeClient(scraperURL, 0)
	recipeSvc := service.NewRecipeService(q, rc)
	h := handler.NewRecipeHandler(recipeSvc)

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/recipes/import", h.Import)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	accountID := uuid.New()
	householdID := uuid.New()
	memberID := uuid.New()
	token := testutil.MakeJWT(accountID, householdID, memberID, "admin")

	return srv, token
}

func TestRecipeImport_Success_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, token := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "Test Recipe", result["title"])
	assert.Equal(t, "example.com", result["source_domain"])
}

func TestRecipeImport_ScraperFails_Returns502_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusInternalServerError, `{"error":"scrape failed"}`)
	apiSrv, token := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadGateway, resp.StatusCode)
}

func TestRecipeImport_MissingURL_Returns400_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, token := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestRecipeImport_NoAuth_Returns401_Integration(t *testing.T) {
	scraperSrv := scraperStub(t, http.StatusOK, minimalScraperResponse())
	apiSrv, _ := setupRecipeImportHandler(t, scraperSrv.URL)

	body, _ := json.Marshal(map[string]string{"url": "https://example.com/test-recipe"})
	req, err := http.NewRequest(http.MethodPost, apiSrv.URL+"/v1/recipes/import", bytes.NewReader(body))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	// No Authorization header

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	assert.Equal(t, http.StatusUnauthorized, resp.StatusCode)
}
