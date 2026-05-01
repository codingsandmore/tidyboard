//go:build unit

package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

func TestRequestID_Generates(t *testing.T) {
	var ctxValue string
	h := middleware.RequestID()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxValue = middleware.RequestIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	got := rec.Header().Get("X-Request-ID")
	require.NotEmpty(t, got, "X-Request-ID header must be set when none provided")
	assert.Equal(t, got, ctxValue, "context value must match echoed header")
}

func TestRequestID_Echoes(t *testing.T) {
	const incoming = "11111111-2222-3333-4444-555555555555"
	var ctxValue string
	h := middleware.RequestID()(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		ctxValue = middleware.RequestIDFromContext(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("X-Request-ID", incoming)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, incoming, rec.Header().Get("X-Request-ID"), "incoming X-Request-ID must be echoed back")
	assert.Equal(t, incoming, ctxValue, "context value must equal incoming header")
}
