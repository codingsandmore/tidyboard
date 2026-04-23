//go:build unit

package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/tidyboard/tidyboard/internal/middleware"
)

func corsHandler(origins []string) http.Handler {
	return middleware.CORS(origins)(nextOK)
}

func TestCORS_AllowedOrigin_SetsHeaders(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodGet, "/api/data", nil)
	req.Header.Set("Origin", "https://app.tidyboard.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Equal(t, "https://app.tidyboard.com", rec.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "true", rec.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORS_DisallowedOrigin_NoACHeader(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodGet, "/api/data", nil)
	req.Header.Set("Origin", "https://evil.example.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"),
		"disallowed origin must not receive ACAO header")
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORS_Preflight_AllowedOrigin(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodOptions, "/api/data", nil)
	req.Header.Set("Origin", "https://app.tidyboard.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusNoContent, rec.Code)
	assert.Equal(t, "https://app.tidyboard.com", rec.Header().Get("Access-Control-Allow-Origin"))
	assert.Equal(t, "3600", rec.Header().Get("Access-Control-Max-Age"))
	assert.Equal(t, "true", rec.Header().Get("Access-Control-Allow-Credentials"))
}

func TestCORS_Preflight_DisallowedOrigin(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodOptions, "/api/data", nil)
	req.Header.Set("Origin", "https://attacker.example.com")
	req.Header.Set("Access-Control-Request-Method", "POST")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusForbidden, rec.Code)
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_NoOriginHeader_Passthrough(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodGet, "/api/data", nil)
	// No Origin header — regular non-CORS request.
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, http.StatusOK, rec.Code)
	assert.Empty(t, rec.Header().Get("Access-Control-Allow-Origin"))
}

func TestCORS_MultipleOrigins(t *testing.T) {
	h := corsHandler([]string{
		"https://app.tidyboard.com",
		"https://staging.tidyboard.com",
	})

	for _, origin := range []string{"https://app.tidyboard.com", "https://staging.tidyboard.com"} {
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		req.Header.Set("Origin", origin)
		rec := httptest.NewRecorder()
		h.ServeHTTP(rec, req)
		assert.Equal(t, origin, rec.Header().Get("Access-Control-Allow-Origin"), "origin %s should be allowed", origin)
	}
}

func TestCORS_VaryHeader(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	req.Header.Set("Origin", "https://app.tidyboard.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Contains(t, rec.Header().Get("Vary"), "Origin")
}

func TestCORS_PreflightCacheAge(t *testing.T) {
	h := corsHandler([]string{"https://app.tidyboard.com"})

	req := httptest.NewRequest(http.MethodOptions, "/api/test", nil)
	req.Header.Set("Origin", "https://app.tidyboard.com")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)

	assert.Equal(t, "3600", rec.Header().Get("Access-Control-Max-Age"))
}
