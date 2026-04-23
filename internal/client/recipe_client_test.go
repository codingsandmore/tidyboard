//go:build unit

package client_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/client"
)

func TestRecipeClient_Health_OK(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodGet, r.Method)
		assert.Equal(t, "/health", r.URL.Path)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"status":"ok"}`))
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second)
	err := c.Health(context.Background())
	require.NoError(t, err)
}

func TestRecipeClient_Health_ServiceDown(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusServiceUnavailable)
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second, client.WithRecipeRetries(0))
	err := c.Health(context.Background())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "503")
}

func TestRecipeClient_Scrape_ParsesResponse(t *testing.T) {
	imageURL := "https://example.com/image.jpg"
	prepMin := 15
	cookMin := 30
	totalMin := 45
	servings := 4

	fixture := map[string]any{
		"title":         "Chocolate Cake",
		"source_url":    "https://example.com/chocolate-cake",
		"source_domain": "example.com",
		"image_url":     imageURL,
		"prep_minutes":  prepMin,
		"cook_minutes":  cookMin,
		"total_minutes": totalMin,
		"servings":      servings,
		"servings_unit": "servings",
		"ingredients": []map[string]string{
			{"amt": "2 cups", "name": "flour"},
			{"amt": "1 cup", "name": "sugar"},
			{"amt": "", "name": "pinch of salt"},
		},
		"instructions": []string{
			"Preheat oven to 180°C.",
			"Mix dry ingredients.",
			"Bake for 30 minutes.",
		},
		"tags": []string{"dessert", "chocolate"},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		assert.Equal(t, http.MethodPost, r.Method)
		assert.Equal(t, "/scrape", r.URL.Path)
		assert.Equal(t, "application/json", r.Header.Get("Content-Type"))

		var body map[string]any
		require.NoError(t, json.NewDecoder(r.Body).Decode(&body))
		assert.Contains(t, body, "url")

		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		require.NoError(t, json.NewEncoder(w).Encode(fixture))
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second)
	got, err := c.Scrape(context.Background(), "https://example.com/chocolate-cake")
	require.NoError(t, err)
	require.NotNil(t, got)

	assert.Equal(t, "Chocolate Cake", got.Title)
	assert.Equal(t, "https://example.com/chocolate-cake", got.SourceURL)
	assert.Equal(t, "example.com", got.SourceDomain)
	require.NotNil(t, got.ImageURL)
	assert.Equal(t, imageURL, *got.ImageURL)
	require.NotNil(t, got.PrepMinutes)
	assert.Equal(t, prepMin, *got.PrepMinutes)
	require.NotNil(t, got.CookMinutes)
	assert.Equal(t, cookMin, *got.CookMinutes)
	require.NotNil(t, got.TotalMinutes)
	assert.Equal(t, totalMin, *got.TotalMinutes)
	require.NotNil(t, got.Servings)
	assert.Equal(t, servings, *got.Servings)
	assert.Equal(t, "servings", got.ServingsUnit)

	require.Len(t, got.Ingredients, 3)
	assert.Equal(t, "2 cups", got.Ingredients[0].Amount)
	assert.Equal(t, "flour", got.Ingredients[0].Name)
	assert.Equal(t, "", got.Ingredients[2].Amount)
	assert.Equal(t, "pinch of salt", got.Ingredients[2].Name)

	require.Len(t, got.Instructions, 3)
	assert.Equal(t, "Preheat oven to 180°C.", got.Instructions[0])

	assert.Equal(t, []string{"dessert", "chocolate"}, got.Tags)
}

func TestRecipeClient_Scrape_NullableFields(t *testing.T) {
	fixture := map[string]any{
		"title":         "Mystery Soup",
		"source_url":    "https://example.com/soup",
		"source_domain": "example.com",
		"image_url":     nil,
		"prep_minutes":  nil,
		"cook_minutes":  nil,
		"total_minutes": nil,
		"servings":      nil,
		"servings_unit": "servings",
		"ingredients":   []any{},
		"instructions":  []string{},
		"tags":          []string{},
	}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		require.NoError(t, json.NewEncoder(w).Encode(fixture))
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second)
	got, err := c.Scrape(context.Background(), "https://example.com/soup")
	require.NoError(t, err)
	require.NotNil(t, got)

	assert.Nil(t, got.ImageURL)
	assert.Nil(t, got.PrepMinutes)
	assert.Nil(t, got.CookMinutes)
	assert.Nil(t, got.TotalMinutes)
	assert.Nil(t, got.Servings)
	assert.Empty(t, got.Ingredients)
	assert.Empty(t, got.Instructions)
	assert.Empty(t, got.Tags)
}

func TestRecipeClient_Scrape_5xxTriggersRetry(t *testing.T) {
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := callCount.Add(1)
		if n == 1 {
			w.WriteHeader(http.StatusBadGateway)
			_, _ = w.Write([]byte(`{"detail":"upstream error"}`))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{"title":"Cake","source_url":"https://x.com","source_domain":"x.com","image_url":null,"prep_minutes":null,"cook_minutes":null,"total_minutes":null,"servings":null,"servings_unit":"servings","ingredients":[],"instructions":[],"tags":[]}`))
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second, client.WithRecipeRetries(1))
	got, err := c.Scrape(context.Background(), "https://x.com/cake")
	require.NoError(t, err)
	assert.Equal(t, "Cake", got.Title)
	assert.EqualValues(t, 2, callCount.Load())
}

func TestRecipeClient_Scrape_5xxExhaustsRetries(t *testing.T) {
	var callCount atomic.Int32

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		callCount.Add(1)
		w.WriteHeader(http.StatusInternalServerError)
		_, _ = w.Write([]byte(`{"detail":"broken"}`))
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second, client.WithRecipeRetries(2))
	_, err := c.Scrape(context.Background(), "https://x.com/cake")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "500")
	assert.EqualValues(t, 3, callCount.Load())
}

func TestRecipeClient_Scrape_ContextCancellation(t *testing.T) {
	started := make(chan struct{}, 1)
	// Signal start then unblock within a bounded time so httptest.Server.Close
	// does not hang waiting for the handler goroutine.
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		started <- struct{}{}
		select {
		case <-r.Context().Done():
		case <-time.After(2 * time.Second):
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte(`{}`))
	}))
	defer srv.Close()

	ctx, cancel := context.WithCancel(context.Background())

	c := client.NewRecipeClient(srv.URL, 5*time.Second, client.WithRecipeRetries(0))

	done := make(chan error, 1)
	go func() {
		_, err := c.Scrape(ctx, "https://example.com/recipe")
		done <- err
	}()

	<-started
	cancel()

	select {
	case err := <-done:
		require.Error(t, err)
		assert.Contains(t, err.Error(), "context canceled")
	case <-time.After(3 * time.Second):
		t.Fatal("Scrape did not abort after context cancellation")
	}
}

func TestRecipeClient_Scrape_422Error(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnprocessableEntity)
		_, _ = w.Write([]byte(`{"detail":"url must start with http:// or https://"}`))
	}))
	defer srv.Close()

	c := client.NewRecipeClient(srv.URL, 5*time.Second, client.WithRecipeRetries(0))
	_, err := c.Scrape(context.Background(), "ftp://bad-url")
	require.Error(t, err)
	assert.Contains(t, err.Error(), "422")
}
