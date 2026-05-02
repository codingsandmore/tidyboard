//go:build unit

package service_test

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/ai"
	"github.com/tidyboard/tidyboard/internal/client"
	"github.com/tidyboard/tidyboard/internal/service"
)

// TestNormalize_PhotoStub_NoOCR verifies the photo path produces a clear
// "fill in details" stub draft when OCR/AI are unavailable. This is the
// "degrades clearly" acceptance criterion from issue #87.
func TestNormalize_PhotoStub_NoOCR(t *testing.T) {
	n := service.NewNormalizer(nil, ai.Disabled())

	resp, err := n.NormalizeImport(context.Background(), service.SmartImportRequest{
		Kind:         service.SmartImportKindPhoto,
		PhotoDataURL: "data:image/jpeg;base64,AAAA",
	})
	require.NoError(t, err)
	require.NotNil(t, resp)

	// Draft is present and clearly marked as photo source.
	assert.Equal(t, "photo", resp.Draft.Source)
	assert.Equal(t, "data:image/jpeg;base64,AAAA", resp.Draft.ImageURL,
		"photo data URL must round-trip onto the draft so the review screen can show it")
	assert.Empty(t, resp.Draft.Title, "stub draft has empty title — user fills it in")
	assert.NotEmpty(t, resp.Draft.Description, "stub must explain why OCR is off so user knows what to do")

	// AI disabled: Normalized stays nil, AIError stays empty.
	assert.Nil(t, resp.Normalized, "disabled provider must NOT populate Normalized")
	assert.Empty(t, resp.AIError, "disabled provider is the silent happy path, not an error")
	assert.Equal(t, "disabled", resp.AIProvider)
}

// TestNormalize_URL_DisabledAI verifies a URL import with AI off returns a
// scraped draft and no normalized variant. The reviewed-create flow must
// work without any AI configured at all (acceptance criterion).
func TestNormalize_URL_DisabledAI(t *testing.T) {
	scraperSrv := scraperServer(t, http.StatusOK, minimalScrapedRecipe())
	rc := client.NewRecipeClient(scraperSrv.URL, 0)

	n := service.NewNormalizer(rc, ai.Disabled())

	resp, err := n.NormalizeImport(context.Background(), service.SmartImportRequest{
		Kind: service.SmartImportKindURL,
		URL:  "https://example.com/pasta",
	})
	require.NoError(t, err)
	require.NotNil(t, resp)

	assert.Equal(t, "Pasta Carbonara", resp.Draft.Title)
	assert.Equal(t, "example.com", resp.Draft.SourceDomain)
	assert.Equal(t, "url", resp.Draft.Source)
	assert.Nil(t, resp.Normalized, "disabled provider must NOT populate Normalized")
	assert.Equal(t, "disabled", resp.AIProvider)
}

// TestNormalize_OllamaNormalize verifies that when an Ollama provider is
// configured the AI cleanup runs and Normalized is populated with the
// AI's response merged onto the draft. We mock the provider at the HTTP
// RoundTripper layer per pre-staged context.
func TestNormalize_OllamaNormalize(t *testing.T) {
	scraperSrv := scraperServer(t, http.StatusOK, minimalScrapedRecipe())
	rc := client.NewRecipeClient(scraperSrv.URL, 0)

	// Ollama stub: returns a structured-JSON cleanup that re-titles and
	// adds categories.
	var sawAICall bool
	ollamaSrv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sawAICall = true
		assert.Equal(t, "/api/generate", r.URL.Path,
			"Normalizer must call Ollama's /api/generate endpoint")
		assert.Equal(t, http.MethodPost, r.Method)
		body, _ := io.ReadAll(r.Body)
		_ = body
		// Compose a valid Ollama response: outer envelope wraps a JSON
		// string in `response`.
		ollamaPayload := map[string]any{
			"title":      "Pasta Carbonara",
			"tags":       []string{"pasta", "italian", "weeknight"},
			"categories": []string{"dinner"},
			"difficulty": "easy",
		}
		raw, _ := json.Marshal(ollamaPayload)
		envelope := map[string]any{
			"model":    "gemma3",
			"response": string(raw),
			"done":     true,
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_ = json.NewEncoder(w).Encode(envelope)
	}))
	t.Cleanup(ollamaSrv.Close)

	provider := ai.NewOllamaClient(ollamaSrv.URL, "gemma3")
	n := service.NewNormalizer(rc, provider)

	resp, err := n.NormalizeImport(context.Background(), service.SmartImportRequest{
		Kind: service.SmartImportKindURL,
		URL:  "https://example.com/pasta",
	})
	require.NoError(t, err)
	require.NotNil(t, resp)
	assert.True(t, sawAICall, "Ollama provider must be invoked when configured")

	// Draft is the raw scrape — must NOT carry AI categories.
	assert.Empty(t, resp.Draft.Categories, "Draft is the raw scrape, AI changes go in Normalized")

	// Normalized is the AI-tweaked draft.
	require.NotNil(t, resp.Normalized, "configured Ollama must populate Normalized")
	assert.Equal(t, "Pasta Carbonara", resp.Normalized.Title)
	assert.Equal(t, []string{"dinner"}, resp.Normalized.Categories)
	assert.Contains(t, resp.Normalized.Tags, "weeknight")
	assert.Equal(t, "ollama", resp.AIProvider)
	assert.Empty(t, resp.AIError)
}

// TestNormalize_OllamaUnreachable_FallsBackToDraft verifies graceful
// degradation when the configured Ollama provider is unreachable. The
// scraped draft must still be returned; the AIError must be populated
// so the UI can show a small "AI couldn't tidy this" hint.
func TestNormalize_OllamaUnreachable_FallsBackToDraft(t *testing.T) {
	scraperSrv := scraperServer(t, http.StatusOK, minimalScrapedRecipe())
	rc := client.NewRecipeClient(scraperSrv.URL, 0)

	// Point at a non-existent port to trigger a network error fast.
	provider := ai.NewOllamaClient("http://127.0.0.1:1", "gemma3")
	n := service.NewNormalizer(rc, provider)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	resp, err := n.NormalizeImport(ctx, service.SmartImportRequest{
		Kind: service.SmartImportKindURL,
		URL:  "https://example.com/pasta",
	})
	require.NoError(t, err, "AI failure must NOT fail the call — issue #87 acceptance")
	require.NotNil(t, resp)

	assert.Equal(t, "Pasta Carbonara", resp.Draft.Title)
	assert.Nil(t, resp.Normalized, "unreachable AI must NOT populate Normalized")
	assert.NotEmpty(t, resp.AIError, "unreachable AI must surface AIError so UI can show hint")
}

// TestNormalize_URL_NoScraper verifies that a missing scraper for kind=url
// returns ErrScraperFailed, mirroring RecipeService.Import behaviour.
func TestNormalize_URL_NoScraper(t *testing.T) {
	n := service.NewNormalizer(nil, ai.Disabled())
	_, err := n.NormalizeImport(context.Background(), service.SmartImportRequest{
		Kind: service.SmartImportKindURL,
		URL:  "https://example.com/pasta",
	})
	require.Error(t, err)
	assert.True(t, errors.Is(err, service.ErrScraperFailed),
		"missing scraper must produce ErrScraperFailed; got %v", err)
}

// TestNormalize_DraftToCreateRequest verifies the draft-to-create-request
// helper preserves user-edited fields. The frontend posts the (possibly
// user-edited) draft through this helper to POST /v1/recipes.
func TestNormalize_DraftToCreateRequest(t *testing.T) {
	d := service.RecipeDraft{
		Title:        "User Edited Title",
		Description:  "User notes",
		SourceURL:    "https://example.com/x",
		Servings:     6,
		ServingsUnit: "servings",
		Categories:   []string{"dinner"},
		Tags:         []string{"weeknight"},
		Difficulty:   "medium",
	}
	req := d.ToCreateRequest()
	assert.Equal(t, "User Edited Title", req.Title)
	assert.Equal(t, []string{"dinner"}, req.Categories)
	assert.Equal(t, "medium", req.Difficulty)
}

// silenceUnused keeps the linter happy if assertions get refactored;
// strings.NewReader stays in scope for any future body-shape checks.
var _ = strings.NewReader
