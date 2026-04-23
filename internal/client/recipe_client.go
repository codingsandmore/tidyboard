package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"
)

// RecipeClient calls the recipe-scraper Python microservice.
type RecipeClient struct {
	baseURL    string
	http       *http.Client
	maxRetries int
}

// RecipeClientOption configures a RecipeClient.
type RecipeClientOption func(*RecipeClient)

// WithRecipeRetries sets the number of retries on 5xx or timeout (default 1).
func WithRecipeRetries(n int) RecipeClientOption {
	return func(c *RecipeClient) { c.maxRetries = n }
}

// NewRecipeClient constructs a RecipeClient.
// baseURL should be e.g. "http://localhost:8082" (no trailing slash).
// timeout controls per-request deadline (0 → 15 s default).
func NewRecipeClient(baseURL string, timeout time.Duration, opts ...RecipeClientOption) *RecipeClient {
	if timeout <= 0 {
		timeout = 15 * time.Second
	}
	c := &RecipeClient{
		baseURL:    baseURL,
		http:       &http.Client{Timeout: timeout},
		maxRetries: 1,
	}
	for _, o := range opts {
		o(c)
	}
	return c
}

// Ingredient is one line item in a recipe.
type Ingredient struct {
	Amount string `json:"amt"`
	Name   string `json:"name"`
}

// ScrapedRecipe is the normalised recipe returned by the scraper service.
// Field names match what the Python service actually produces (see normalize.py).
type ScrapedRecipe struct {
	Title        string       `json:"title"`
	SourceURL    string       `json:"source_url"`
	SourceDomain string       `json:"source_domain"`
	ImageURL     *string      `json:"image_url"`
	PrepMinutes  *int         `json:"prep_minutes"`
	CookMinutes  *int         `json:"cook_minutes"`
	TotalMinutes *int         `json:"total_minutes"`
	Servings     *int         `json:"servings"`
	ServingsUnit string       `json:"servings_unit"`
	Ingredients  []Ingredient `json:"ingredients"`
	Instructions []string     `json:"instructions"`
	Tags         []string     `json:"tags"`
}

// Health calls GET /health and returns nil when the service is alive.
func (c *RecipeClient) Health(ctx context.Context) error {
	resp, _, err := c.doRecipe(ctx, http.MethodGet, "/health", nil)
	if err != nil {
		return fmt.Errorf("recipe client: health: %w", err)
	}
	resp.Body.Close()
	return nil
}

// Scrape calls POST /scrape with the given URL and returns the parsed recipe.
// The url argument is not logged to avoid leaking credentials embedded in URLs.
func (c *RecipeClient) Scrape(ctx context.Context, url string) (*ScrapedRecipe, error) {
	payload := struct {
		URL string `json:"url"`
	}{URL: url}

	body, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("recipe client: marshal request: %w", err)
	}

	resp, raw, err := c.doRecipe(ctx, http.MethodPost, "/scrape", body)
	if err != nil {
		return nil, fmt.Errorf("recipe client: scrape: %w", err)
	}
	defer resp.Body.Close()

	var recipe ScrapedRecipe
	if err := json.Unmarshal(raw, &recipe); err != nil {
		return nil, fmt.Errorf("recipe client: decode response: %w", err)
	}
	return &recipe, nil
}

// doRecipe performs an HTTP request with retry on 5xx / timeout and structured logging.
func (c *RecipeClient) doRecipe(ctx context.Context, method, path string, body []byte) (*http.Response, []byte, error) {
	url := c.baseURL + path
	var (
		resp *http.Response
		raw  []byte
		err  error
	)

	attempts := c.maxRetries + 1
	for attempt := 0; attempt < attempts; attempt++ {
		resp, raw, err = c.attemptRecipe(ctx, method, url, body)
		if err == nil {
			return resp, raw, nil
		}
		if ctx.Err() != nil {
			break
		}
	}
	return nil, nil, err
}

func (c *RecipeClient) attemptRecipe(ctx context.Context, method, url string, body []byte) (*http.Response, []byte, error) {
	var reqBody io.Reader
	if body != nil {
		reqBody = bytes.NewReader(body)
	}

	req, err := http.NewRequestWithContext(ctx, method, url, reqBody)
	if err != nil {
		return nil, nil, fmt.Errorf("build request: %w", err)
	}
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	req.Header.Set("Accept", "application/json")

	start := time.Now()
	resp, err := c.http.Do(req)
	duration := time.Since(start)

	if err != nil {
		slog.InfoContext(ctx, "recipe client request",
			"method", method,
			"url", url,
			"error", err,
			"duration_ms", duration.Milliseconds(),
		)
		return nil, nil, fmt.Errorf("http request: %w", err)
	}

	raw, readErr := io.ReadAll(resp.Body)
	resp.Body.Close()

	slog.InfoContext(ctx, "recipe client request",
		"method", method,
		"url", url,
		"status", resp.StatusCode,
		"duration_ms", duration.Milliseconds(),
	)

	if readErr != nil {
		return nil, nil, fmt.Errorf("read response body: %w", readErr)
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		snippet := raw
		if len(snippet) > 200 {
			snippet = snippet[:200]
		}
		return nil, nil, &HTTPError{
			StatusCode: resp.StatusCode,
			Body:       string(snippet),
		}
	}

	resp.Body = io.NopCloser(bytes.NewReader(raw))
	return resp, raw, nil
}
