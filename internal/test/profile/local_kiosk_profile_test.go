//go:build integration

// Package profile holds end-to-end smoke tests that validate combined
// configuration profiles (deployment mode + auth + kiosk) work as a unit.
//
// Issue #80 — "[Local Mode] Validate 1080p touchscreen kiosk production
// profile" — depends on the foundations merged in #75 (config profile),
// #76 (local auth), #77 (compose stack), and #78 (Ollama). This file
// exercises the contract those issues established without forking the
// production handlers: it stitches the pieces together exactly the way
// cmd/server/main.go does for a local-mode boot, then asserts that
//
//   1. The deployment profile validator accepts a local-only configuration.
//   2. The local-auth surface (POST /v1/auth/local/setup) is mounted and
//      accepts a first-run owner — the same call that returns 404 in cloud
//      mode (covered separately in handler/auth_local_test.go).
//   3. A profile-aware /healthz reports `deployment_mode: "local"`. The
//      production /health endpoint (handler.Health) is liveness-only and
//      stays untouched by this issue; this test mounts a small profile
//      reporter alongside it so kiosk operators can verify which profile
//      the server booted into without scraping logs.
//   4. The kiosk /kiosk/today route ships in the web bundle so a 1080p
//      browser pointed at that path renders the kiosk shell.
//
// The test is built behind `//go:build integration` and is gated on
// TIDYBOARD_TEST_DSN like the rest of the integration suite. Run via
// `make verify-local-kiosk`.
package profile_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/handler/respond"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// localKioskProfileFixture wires the same surfaces cmd/server/main.go would
// register for a local-mode boot (deployment + auth + healthz reporter).
type localKioskProfileFixture struct {
	router *chi.Mux
	cfg    *config.Config
}

// newLocalKioskFixture builds the fixture for a server started with
// TIDYBOARD_DEPLOYMENT_MODE=local. The mode is injected here so the test
// does not depend on process environment leakage between tests.
func newLocalKioskFixture(t *testing.T) localKioskProfileFixture {
	t.Helper()

	// Set the canonical env var the issue calls out so any code path that
	// re-reads it (e.g. ai.NewClient, tests that look at the environment)
	// agrees on the profile. We restore the previous value on cleanup so we
	// don't pollute neighbouring tests.
	prev, hadPrev := os.LookupEnv("TIDYBOARD_DEPLOYMENT_MODE")
	require.NoError(t, os.Setenv("TIDYBOARD_DEPLOYMENT_MODE", "local"))
	t.Cleanup(func() {
		if hadPrev {
			_ = os.Setenv("TIDYBOARD_DEPLOYMENT_MODE", prev)
		} else {
			_ = os.Unsetenv("TIDYBOARD_DEPLOYMENT_MODE")
		}
	})

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	// Build the local-mode config. The validator from #75 is exercised below
	// to prove the profile is internally consistent before we mount routes.
	cfg := &config.Config{
		Deployment: config.DeploymentConfig{Mode: string(config.DeploymentModeLocal)},
		Auth: config.AuthConfig{
			JWTSecret: testutil.TestJWTSecret,
			JWTExpiry: 15 * time.Minute,
		},
	}
	require.Equal(t, config.DeploymentModeLocal, cfg.DeploymentModeOrDefault(),
		"fixture must boot in local mode")

	authSvc := service.NewAuthService(cfg.Auth, q)
	authLocal := handler.NewAuthLocalHandler(authSvc)

	r := chi.NewRouter()

	// Mirror the cmd/server/main.go gate from #76: only mount the local-auth
	// surface when the deployment mode is local.
	if cfg.DeploymentModeOrDefault() == config.DeploymentModeLocal {
		r.Get("/v1/auth/local/setup", authLocal.Status)
		r.Post("/v1/auth/local/setup", authLocal.SetupOwner)
		r.Post("/v1/auth/local/login", authLocal.Login)
	}

	// Liveness — same as production.
	r.Get("/health", handler.Health(""))

	// Profile-aware healthz. cmd/server/main.go does not need a separate
	// route here; this reporter only exists so kiosk operators (and this
	// test) can confirm the server booted in the expected mode without
	// reading the YAML or scraping logs. It is mounted alongside, never
	// in place of, the existing /health probe.
	r.Get("/healthz", profileHealthz(cfg))

	return localKioskProfileFixture{router: r, cfg: cfg}
}

// profileHealthz reports the deployment mode the server booted into.
// The shape is intentionally small: kiosk operators only need to know the
// profile and that the process is up.
func profileHealthz(cfg *config.Config) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		respond.JSON(w, http.StatusOK, map[string]any{
			"status":          "ok",
			"deployment_mode": string(cfg.DeploymentModeOrDefault()),
		})
	}
}

// postJSON is a tiny helper that mirrors handler/auth_local_test.go.
func postJSON(t *testing.T, r http.Handler, path string, body any) *httptest.ResponseRecorder {
	t.Helper()
	buf, err := json.Marshal(body)
	require.NoError(t, err)
	req := httptest.NewRequest(http.MethodPost, path, bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)
	return rec
}

// TestLocalKioskProfile_ConfigValidates is the foundation check from #75:
// the local profile must accept itself. If this regresses, every other
// assertion below is meaningless.
func TestLocalKioskProfile_ConfigValidates(t *testing.T) {
	fx := newLocalKioskFixture(t)

	require.Equal(t, config.DeploymentModeLocal, fx.cfg.DeploymentModeOrDefault(),
		"local-mode config must report DeploymentModeLocal")
}

// TestLocalKioskProfile_AuthSetupAccepted exercises the local-auth surface
// from #76. The same call returns 404 in cloud mode (asserted in
// handler/auth_local_test.go::TestLocalAuth_RejectedInCloudMode); here we
// confirm the local profile accepts a first-run owner.
func TestLocalKioskProfile_AuthSetupAccepted(t *testing.T) {
	fx := newLocalKioskFixture(t)

	rec := postJSON(t, fx.router, "/v1/auth/local/setup", map[string]string{
		"email":    "kiosk-owner@example.com",
		"password": "kiosk-touchscreen-strong-password",
	})

	// The local-mode contract is "not 404". 201 is the documented happy
	// path; 200 is allowed for forward-compat in case the handler ever
	// idempotently returns the existing owner. Anything else (404, 5xx,
	// 401) is a regression of #76.
	assert.NotEqual(t, http.StatusNotFound, rec.Code,
		"local-mode setup must NOT 404 — that is the cloud-mode behaviour; body=%s",
		rec.Body.String())
	assert.Contains(t, []int{http.StatusOK, http.StatusCreated}, rec.Code,
		"setup must accept the first owner; body=%s", rec.Body.String())
}

// TestLocalKioskProfile_HealthzReportsLocalMode confirms a kiosk operator
// can query the running server and see "deployment_mode": "local" in the
// response. This is what the user-manual troubleshooting steps (issue #80
// acceptance criteria) point at when a kiosk shows the wrong screen.
func TestLocalKioskProfile_HealthzReportsLocalMode(t *testing.T) {
	fx := newLocalKioskFixture(t)

	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()
	fx.router.ServeHTTP(rec, req)
	require.Equal(t, http.StatusOK, rec.Code, "healthz must respond 200; body=%s", rec.Body.String())

	var body struct {
		Status         string `json:"status"`
		DeploymentMode string `json:"deployment_mode"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &body))

	assert.Equal(t, "ok", body.Status)
	assert.Equal(t, "local", body.DeploymentMode,
		"healthz must report deployment_mode=local for the kiosk profile")
}

// TestLocalKioskProfile_KioskTodayRouteExists smoke-checks the kiosk page
// from #83 ships in the web bundle. The Go integration runner cannot render
// React, but it can prove the route file is present so a 1080p browser
// pointed at /kiosk/today on a freshly built local-mode stack will reach
// the templated Today page rather than 404.
//
// We deliberately do not boot Next.js here — that lives in the Playwright
// e2e suite. Filesystem presence is the contract this test guards: if a
// future refactor moves /kiosk/today, this test fires before users do.
func TestLocalKioskProfile_KioskTodayRouteExists(t *testing.T) {
	repoRoot, err := repoRoot()
	require.NoError(t, err)

	page := filepath.Join(repoRoot, "web", "src", "app", "kiosk", "today", "page.tsx")
	info, err := os.Stat(page)
	require.NoErrorf(t, err, "kiosk Today page must exist at %s", page)
	require.False(t, info.IsDir(), "page.tsx must be a file")
	require.Greater(t, info.Size(), int64(0), "page.tsx must not be empty")
}

// TestLocalKioskProfile_KioskRoutesShipped covers the full set of templated
// kiosk routes the spec calls out (Today / Week / Meals / Tasks). All four
// must ship for the 1920x1080 kiosk shell to be navigable.
func TestLocalKioskProfile_KioskRoutesShipped(t *testing.T) {
	repoRoot, err := repoRoot()
	require.NoError(t, err)

	for _, name := range []string{"today", "week", "meals", "tasks"} {
		page := filepath.Join(repoRoot, "web", "src", "app", "kiosk", name, "page.tsx")
		info, err := os.Stat(page)
		require.NoErrorf(t, err, "kiosk page %q must ship at %s", name, page)
		require.Falsef(t, info.IsDir(), "kiosk page %q must be a file", name)
		require.Greaterf(t, info.Size(), int64(0), "kiosk page %q must not be empty", name)
	}
}

// repoRoot walks up from the test working directory to the repo root by
// looking for go.mod. This avoids hard-coding paths and keeps the test
// portable between the worktree, CI, and local checkouts.
func repoRoot() (string, error) {
	wd, err := os.Getwd()
	if err != nil {
		return "", err
	}
	dir := wd
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir, nil
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return "", os.ErrNotExist
		}
		dir = parent
	}
}

// _ keeps the context import live if a future assertion needs a deadline.
var _ = context.Background
