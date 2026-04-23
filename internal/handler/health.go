package handler

import (
	"context"
	"net/http"
	"time"

	"github.com/tidyboard/tidyboard/internal/handler/respond"
)

// healthResponse is returned by GET /health.
type healthResponse struct {
	Status    string    `json:"status"`
	Timestamp time.Time `json:"timestamp"`
	Version   string    `json:"version,omitempty"`
}

// readyResponse is returned by GET /ready.
type readyResponse struct {
	Status   string            `json:"status"`
	Checks   map[string]string `json:"checks"`
	Failures []string          `json:"failures,omitempty"`
}

// Health handles GET /health — always returns 200 if the process is up (liveness).
func Health(version string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		respond.JSON(w, http.StatusOK, healthResponse{
			Status:    "ok",
			Timestamp: time.Now().UTC(),
			Version:   version,
		})
	}
}

// ReadyConfig holds the optional dependency ping functions for GET /ready.
type ReadyConfig struct {
	// DB is called with a 1-second timeout to check the database pool.
	DB func(ctx context.Context) error
	// Redis is called with a 500 ms timeout to check the Redis connection.
	Redis func(ctx context.Context) error
	// SyncWorker is called with a 1-second timeout; nil means skip.
	SyncWorker func(ctx context.Context) error
	// RecipeScraper is called with a 1-second timeout; nil means skip.
	RecipeScraper func(ctx context.Context) error
}

// Ready handles GET /ready — performs dependency health checks (readiness probe).
// Returns 200 {"status":"ok",...} when all checks pass, or
// 503 {"status":"degraded",...} listing the failures.
func Ready(cfg ReadyConfig) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		checks := make(map[string]string)
		var failures []string

		run := func(name string, timeout time.Duration, fn func(ctx context.Context) error) {
			if fn == nil {
				return
			}
			ctx, cancel := context.WithTimeout(r.Context(), timeout)
			defer cancel()
			if err := fn(ctx); err != nil {
				checks[name] = "fail: " + err.Error()
				failures = append(failures, name)
			} else {
				checks[name] = "ok"
			}
		}

		run("db", time.Second, cfg.DB)
		run("redis", 500*time.Millisecond, cfg.Redis)
		run("sync_worker", time.Second, cfg.SyncWorker)
		run("recipe_scraper", time.Second, cfg.RecipeScraper)

		if len(failures) > 0 {
			respond.JSON(w, http.StatusServiceUnavailable, readyResponse{
				Status:   "degraded",
				Checks:   checks,
				Failures: failures,
			})
			return
		}
		respond.JSON(w, http.StatusOK, readyResponse{
			Status: "ok",
			Checks: checks,
		})
	}
}
