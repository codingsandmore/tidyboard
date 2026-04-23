//go:build unit || integration

// Package testutil provides helpers for unit and integration tests.
// ChaosMiddleware injects configurable failure modes into an http.Handler.
// It is intended for use ONLY in tests — never mount in production paths.
package testutil

import (
	"math/rand"
	"net"
	"net/http"
	"time"
)

// ChaosConfig controls the failure modes injected by ChaosMiddleware.
// All fields are optional; zero values disable the corresponding behaviour.
//
// Seed any test RNG before constructing to guarantee determinism:
//
//	cfg := testutil.ChaosConfig{LatencyMean: 50 * time.Millisecond, FailureRate: 0.1}
//	handler := testutil.ChaosMiddleware(cfg)(realHandler)
type ChaosConfig struct {
	// LatencyMean is the average artificial delay injected before forwarding
	// the request. Zero means no added latency.
	LatencyMean time.Duration

	// LatencyJitter is the maximum random delta added to LatencyMean.
	// Actual delay = LatencyMean + rand.Int63n(LatencyJitter).
	// Requires LatencyMean > 0 to have any effect.
	LatencyJitter time.Duration

	// FailureRate is the fraction of requests (0.0–1.0) that receive a
	// synthetic HTTP error response instead of being forwarded.
	FailureRate float64

	// FailureStatus is the HTTP status code returned for synthetic failures.
	// Defaults to 503 when FailureRate > 0 and FailureStatus is 0.
	FailureStatus int

	// DropConnection is the fraction of requests (0.0–1.0) where the TCP
	// connection is abruptly closed to simulate a network cut. The request
	// is not forwarded to the next handler.
	DropConnection float64

	// Seed is the RNG seed used for all random decisions. Using a fixed seed
	// makes chaos tests deterministic and non-flaky. Defaults to 1 if zero.
	Seed int64
}

// ChaosMiddleware returns an http.Handler middleware that wraps next with the
// failure modes described by cfg. It is safe for concurrent use.
//
// Failure evaluation order per request:
//  1. DropConnection — if triggered, hijack and close the TCP conn; return.
//  2. FailureRate    — if triggered, write FailureStatus (default 503); return.
//  3. LatencyMean    — sleep before forwarding to next.
//  4. Forward to next handler.
func ChaosMiddleware(cfg ChaosConfig) func(http.Handler) http.Handler {
	seed := cfg.Seed
	if seed == 0 {
		seed = 1
	}
	rng := rand.New(rand.NewSource(seed)) //nolint:gosec // test-only RNG

	failStatus := cfg.FailureStatus
	if failStatus == 0 {
		failStatus = http.StatusServiceUnavailable
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 1. Drop connection
			if cfg.DropConnection > 0 && rng.Float64() < cfg.DropConnection {
				if hijacker, ok := w.(http.Hijacker); ok {
					conn, _, err := hijacker.Hijack()
					if err == nil {
						_ = conn.Close()
						return
					}
				}
				// Fallback when hijacking is unavailable (e.g., httptest.ResponseRecorder):
				// close the underlying net.Conn if it is accessible via context.
				if nc, ok := r.Context().Value(ctxKeyNetConn{}).(net.Conn); ok {
					_ = nc.Close()
					return
				}
				// Last resort: return a connection-reset-like error status.
				http.Error(w, "connection reset by chaos", http.StatusBadGateway)
				return
			}

			// 2. Synthetic failure
			if cfg.FailureRate > 0 && rng.Float64() < cfg.FailureRate {
				http.Error(w, http.StatusText(failStatus), failStatus)
				return
			}

			// 3. Artificial latency
			if cfg.LatencyMean > 0 {
				jitter := time.Duration(0)
				if cfg.LatencyJitter > 0 {
					jitter = time.Duration(rng.Int63n(int64(cfg.LatencyJitter)))
				}
				time.Sleep(cfg.LatencyMean + jitter)
			}

			next.ServeHTTP(w, r)
		})
	}
}

// ctxKeyNetConn is the context key used to pass a raw net.Conn for drop-connection
// simulation in environments where http.Hijacker is not available.
type ctxKeyNetConn struct{}
