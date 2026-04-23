//go:build unit

package handler_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/handler"
)

func TestHealthHandler_Unit(t *testing.T) {
	h := handler.Health("v1.2.3")
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "ok", body["status"])
	assert.Equal(t, "v1.2.3", body["version"])
}

// ---------------------------------------------------------------------------
// /ready — unit tests (no real DB or Redis needed)
// ---------------------------------------------------------------------------

func TestReadyHandler_AllChecksPass(t *testing.T) {
	h := handler.Ready(handler.ReadyConfig{
		DB: func(ctx context.Context) error { return nil },
		Redis: func(ctx context.Context) error { return nil },
	})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "ok", body["status"])
	checks := body["checks"].(map[string]any)
	assert.Equal(t, "ok", checks["db"])
	assert.Equal(t, "ok", checks["redis"])
}

func TestReadyHandler_DBFails_Returns503(t *testing.T) {
	h := handler.Ready(handler.ReadyConfig{
		DB: func(ctx context.Context) error { return errors.New("connection refused") },
	})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "degraded", body["status"])
	failures := body["failures"].([]any)
	assert.Contains(t, failures, "db")
}

func TestReadyHandler_RedisFails_Returns503(t *testing.T) {
	h := handler.Ready(handler.ReadyConfig{
		DB:    func(ctx context.Context) error { return nil },
		Redis: func(ctx context.Context) error { return errors.New("timeout") },
	})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "degraded", body["status"])
	failures := body["failures"].([]any)
	assert.Contains(t, failures, "redis")
	// DB should still show ok.
	checks := body["checks"].(map[string]any)
	assert.Equal(t, "ok", checks["db"])
}

func TestReadyHandler_NilChecks_Skipped(t *testing.T) {
	// Nil ping functions are skipped entirely.
	h := handler.Ready(handler.ReadyConfig{})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	assert.Equal(t, "ok", body["status"])
	// checks map should be empty (no nils included).
	checks := body["checks"].(map[string]any)
	assert.Empty(t, checks)
}

func TestReadyHandler_OptionalChecks_SyncAndRecipe(t *testing.T) {
	called := map[string]bool{}
	h := handler.Ready(handler.ReadyConfig{
		DB:            func(ctx context.Context) error { called["db"] = true; return nil },
		SyncWorker:    func(ctx context.Context) error { called["sync"] = true; return nil },
		RecipeScraper: func(ctx context.Context) error { called["recipe"] = true; return nil },
	})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.True(t, called["db"])
	assert.True(t, called["sync"])
	assert.True(t, called["recipe"])
}

func TestReadyHandler_MultipleFailures(t *testing.T) {
	h := handler.Ready(handler.ReadyConfig{
		DB:    func(ctx context.Context) error { return errors.New("db down") },
		Redis: func(ctx context.Context) error { return errors.New("redis down") },
	})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusServiceUnavailable, rec.Code)
	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))
	failures := body["failures"].([]any)
	assert.Len(t, failures, 2)
}
