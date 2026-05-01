//go:build unit

package middleware_test

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

// silentLogger returns an slog.Logger whose output is discarded so panic logs
// don't pollute test output.
func silentLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(io.Discard, nil))
}

// chain mounts RequestID then Recover so the panic envelope can include the
// request_id sourced from the RequestID middleware.
func chain(cfg *config.Config, h http.Handler) http.Handler {
	return middleware.RequestID()(middleware.Recover(cfg, silentLogger())(h))
}

// TestRecover_ReturnsJSON500 asserts that a panicking handler is converted
// into a JSON 500 envelope with code=internal_error and a non-empty
// request_id sourced from the RequestID middleware.
func TestRecover_ReturnsJSON500(t *testing.T) {
	cfg := &config.Config{}

	panicker := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("boom")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()

	chain(cfg, panicker).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)
	assert.Equal(t, "application/json", rec.Header().Get("Content-Type"))

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))

	assert.Equal(t, "internal_error", body["code"])
	assert.Equal(t, float64(http.StatusInternalServerError), body["status"])
	assert.NotEmpty(t, body["message"], "message must be set")

	reqID, _ := body["request_id"].(string)
	assert.NotEmpty(t, reqID, "request_id must be set on panic envelope")

	_, hasStack := body["stack"]
	assert.False(t, hasStack, "stack must NOT appear without X-Debug + DebugErrors")
}

// TestRecover_XDebugWithDebugEnabled_IncludesStack asserts that when the
// caller sends X-Debug:1 AND Config.DebugErrors==true, the JSON envelope
// includes a non-empty stack field.
func TestRecover_XDebugWithDebugEnabled_IncludesStack(t *testing.T) {
	cfg := &config.Config{DebugErrors: true}

	panicker := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("kaboom")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Debug", "1")
	rec := httptest.NewRecorder()

	chain(cfg, panicker).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))

	stack, ok := body["stack"].(string)
	require.True(t, ok, "stack must be present and be a string when X-Debug=1 and DebugErrors=true")
	assert.NotEmpty(t, stack, "stack must be non-empty")
}

// TestRecover_XDebugWithDebugDisabled_OmitsStack asserts that even with
// X-Debug:1, the stack is omitted when Config.DebugErrors is false. This is
// the safe default for production.
func TestRecover_XDebugWithDebugDisabled_OmitsStack(t *testing.T) {
	cfg := &config.Config{DebugErrors: false}

	panicker := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		panic("nope")
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Debug", "1")
	rec := httptest.NewRecorder()

	chain(cfg, panicker).ServeHTTP(rec, req)

	require.Equal(t, http.StatusInternalServerError, rec.Code)

	var body map[string]any
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))

	_, hasStack := body["stack"]
	assert.False(t, hasStack, "stack must be omitted when DebugErrors=false even with X-Debug=1")
}
