//go:build integration

package handler_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/handler"
)

// TestHealthHandler_Integration hits /health end-to-end.
// Gated on TIDYBOARD_TEST_DSN so `go test -tags=unit ./...` never touches Postgres.
func TestHealthHandler_Integration(t *testing.T) {
	if os.Getenv("TIDYBOARD_TEST_DSN") == "" {
		t.Skip("TIDYBOARD_TEST_DSN not set; skipping integration test")
	}

	h := handler.Health("test")
	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var body map[string]any
	err := json.Unmarshal(rec.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "ok", body["status"])
	assert.Equal(t, "test", body["version"])
}

// TestReadyHandler_NoPing returns 200 when no ping func is provided.
func TestReadyHandler_NoPing(t *testing.T) {
	if os.Getenv("TIDYBOARD_TEST_DSN") == "" {
		t.Skip("TIDYBOARD_TEST_DSN not set; skipping integration test")
	}

	h := handler.Ready(handler.ReadyConfig{})
	req := httptest.NewRequest(http.MethodGet, "/ready", nil)
	rec := httptest.NewRecorder()

	h.ServeHTTP(rec, req)

	require.Equal(t, http.StatusOK, rec.Code)

	var body map[string]any
	err := json.Unmarshal(rec.Body.Bytes(), &body)
	require.NoError(t, err)
	assert.Equal(t, "ready", body["status"])
}
