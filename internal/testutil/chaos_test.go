//go:build unit

package testutil_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// okHandler is a trivial handler that returns 200 OK.
var okHandler = http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte("ok"))
})

func TestChaosMiddleware_NoConfig_PassThrough(t *testing.T) {
	// Zero config → no chaos, every request passes through.
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{Seed: 1})(okHandler)

	for i := 0; i < 10; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		mw.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code, "iteration %d: expected pass-through", i)
	}
}

func TestChaosMiddleware_FailureRate_AllFail(t *testing.T) {
	// FailureRate=1.0 → every request gets a 503.
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		FailureRate: 1.0,
		Seed:        42,
	})(okHandler)

	for i := 0; i < 10; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		mw.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusServiceUnavailable, rec.Code, "iteration %d", i)
	}
}

func TestChaosMiddleware_FailureRate_NeverFail(t *testing.T) {
	// FailureRate=0.0 → no synthetic failures.
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		FailureRate: 0.0,
		Seed:        42,
	})(okHandler)

	for i := 0; i < 20; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		mw.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code, "iteration %d", i)
	}
}

func TestChaosMiddleware_CustomFailureStatus(t *testing.T) {
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		FailureRate:   1.0,
		FailureStatus: http.StatusGatewayTimeout,
		Seed:          1,
	})(okHandler)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	mw.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusGatewayTimeout, rec.Code)
}

func TestChaosMiddleware_FailureRate_Partial_Deterministic(t *testing.T) {
	// With a fixed seed, the failure pattern must be reproducible.
	cfg := testutil.ChaosConfig{FailureRate: 0.5, Seed: 99}

	countFailures := func() int {
		mw := testutil.ChaosMiddleware(cfg)(okHandler)
		failures := 0
		for i := 0; i < 100; i++ {
			rec := httptest.NewRecorder()
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			mw.ServeHTTP(rec, req)
			if rec.Code == http.StatusServiceUnavailable {
				failures++
			}
		}
		return failures
	}

	first := countFailures()
	second := countFailures()
	assert.Equal(t, first, second, "deterministic: same seed must produce same failure count")
	// With rate=0.5 over 100 requests, expect 30–70 failures.
	assert.Greater(t, first, 20, "expected some failures with rate=0.5")
	assert.Less(t, first, 80, "expected some successes with rate=0.5")
}

func TestChaosMiddleware_Latency_Added(t *testing.T) {
	latency := 50 * time.Millisecond
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		LatencyMean: latency,
		Seed:        1,
	})(okHandler)

	start := time.Now()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	mw.ServeHTTP(rec, req)
	elapsed := time.Since(start)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.GreaterOrEqual(t, elapsed, latency, "expected at least %v of artificial latency", latency)
}

func TestChaosMiddleware_Latency_WithJitter(t *testing.T) {
	latency := 20 * time.Millisecond
	jitter := 30 * time.Millisecond
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		LatencyMean:   latency,
		LatencyJitter: jitter,
		Seed:          7,
	})(okHandler)

	start := time.Now()
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	mw.ServeHTTP(rec, req)
	elapsed := time.Since(start)

	require.Equal(t, http.StatusOK, rec.Code)
	assert.GreaterOrEqual(t, elapsed, latency, "must wait at least LatencyMean")
	assert.Less(t, elapsed, latency+jitter+10*time.Millisecond, "should not exceed mean+jitter+slack")
}

func TestChaosMiddleware_DropConnection_FallbackStatus(t *testing.T) {
	// httptest.ResponseRecorder does not implement http.Hijacker, so
	// ChaosMiddleware falls back to a 502 response. We verify the request
	// does NOT reach the inner handler (which would return 200).
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		DropConnection: 1.0,
		Seed:           1,
	})(okHandler)

	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	mw.ServeHTTP(rec, req)
	// The inner handler (200) must NOT have been called.
	assert.NotEqual(t, http.StatusOK, rec.Code, "inner handler must not be reached on drop")
}

func TestChaosMiddleware_DropConnection_NeverDrop(t *testing.T) {
	mw := testutil.ChaosMiddleware(testutil.ChaosConfig{
		DropConnection: 0.0,
		Seed:           1,
	})(okHandler)

	for i := 0; i < 10; i++ {
		rec := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodGet, "/", nil)
		mw.ServeHTTP(rec, req)
		assert.Equal(t, http.StatusOK, rec.Code)
	}
}
