//go:build integration

package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// localAuthFixture wires an httptest router that mounts the local auth
// endpoints exactly as cmd/server/main.go would when Deployment.Mode=local.
// We expose the cfg pointer so individual tests can flip the mode and assert
// the registration gate.
type localAuthFixture struct {
	r   *chi.Mux
	q   *query.Queries
	cfg *config.Config
}

func newLocalAuthFixture(t *testing.T, mode config.DeploymentMode) localAuthFixture {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	authSvc := service.NewAuthService(config.AuthConfig{
		JWTSecret: testutil.TestJWTSecret,
		JWTExpiry: 15 * time.Minute,
	}, q)
	authLocal := handler.NewAuthLocalHandler(authSvc)

	r := chi.NewRouter()
	cfg := &config.Config{Deployment: config.DeploymentConfig{Mode: string(mode)}}
	if cfg.DeploymentModeOrDefault() == config.DeploymentModeLocal {
		r.Get("/v1/auth/local/setup", authLocal.Status)
		r.Post("/v1/auth/local/setup", authLocal.SetupOwner)
		r.Post("/v1/auth/local/login", authLocal.Login)
	}
	return localAuthFixture{r: r, q: q, cfg: cfg}
}

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

// TestLocalAuth_FirstRunSetup verifies the empty-DB path: POST setup creates
// the owner row, returns 201 with a token, and any subsequent setup attempt
// must 409.
func TestLocalAuth_FirstRunSetup(t *testing.T) {
	fx := newLocalAuthFixture(t, config.DeploymentModeLocal)

	rec := postJSON(t, fx.r, "/v1/auth/local/setup", map[string]string{
		"email":    "owner@example.com",
		"password": "supersecure-password",
	})
	assert.Equal(t, http.StatusCreated, rec.Code, "first setup must succeed; body=%s", rec.Body.String())

	var resp struct {
		Token   string `json:"token"`
		Account struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"account"`
	}
	require.NoError(t, json.Unmarshal(rec.Body.Bytes(), &resp))
	assert.NotEmpty(t, resp.Token)
	assert.Equal(t, "owner@example.com", resp.Account.Email)
	assert.NotEmpty(t, resp.Account.ID)

	// Second attempt must be rejected — first-run is one-shot.
	rec2 := postJSON(t, fx.r, "/v1/auth/local/setup", map[string]string{
		"email":    "second@example.com",
		"password": "another-strong-password",
	})
	assert.Equal(t, http.StatusConflict, rec2.Code, "second setup must 409; body=%s", rec2.Body.String())
}

// TestLocalAuth_Login verifies that after an owner is created, login with the
// correct password issues a JWT and login with a wrong password returns 401.
func TestLocalAuth_Login(t *testing.T) {
	fx := newLocalAuthFixture(t, config.DeploymentModeLocal)

	rec := postJSON(t, fx.r, "/v1/auth/local/setup", map[string]string{
		"email":    "loginowner@example.com",
		"password": "matching-password-1",
	})
	require.Equalf(t, http.StatusCreated, rec.Code, "setup failed: %s", rec.Body.String())

	// Correct password.
	good := postJSON(t, fx.r, "/v1/auth/local/login", map[string]string{
		"email":    "loginowner@example.com",
		"password": "matching-password-1",
	})
	assert.Equal(t, http.StatusOK, good.Code, "login should succeed; body=%s", good.Body.String())
	var auth struct {
		Token string `json:"token"`
	}
	require.NoError(t, json.Unmarshal(good.Body.Bytes(), &auth))
	assert.NotEmpty(t, auth.Token, "login response must include a JWT")

	// Wrong password.
	bad := postJSON(t, fx.r, "/v1/auth/local/login", map[string]string{
		"email":    "loginowner@example.com",
		"password": "WRONG-password",
	})
	assert.Equal(t, http.StatusUnauthorized, bad.Code)
	assert.Contains(t, bad.Body.String(), "invalid_credentials")

	// Email is normalised to lowercase.
	mixed := postJSON(t, fx.r, "/v1/auth/local/login", map[string]string{
		"email":    "LoginOwner@EXAMPLE.COM",
		"password": "matching-password-1",
	})
	assert.Equal(t, http.StatusOK, mixed.Code, "email must be case-insensitive")
}

// TestLocalAuth_RejectedInCloudMode confirms the registration gate: when the
// deployment mode is "cloud" (the default), the local endpoints are not
// mounted and any client request returns 404.
func TestLocalAuth_RejectedInCloudMode(t *testing.T) {
	fx := newLocalAuthFixture(t, config.DeploymentModeCloud)

	rec := postJSON(t, fx.r, "/v1/auth/local/setup", map[string]string{
		"email":    "owner@example.com",
		"password": "doesnt-matter",
	})
	assert.Equal(t, http.StatusNotFound, rec.Code,
		"local-mode endpoint must be 404 in cloud mode; body=%s", rec.Body.String())

	rec2 := postJSON(t, fx.r, "/v1/auth/local/login", map[string]string{
		"email":    "owner@example.com",
		"password": "doesnt-matter",
	})
	assert.Equal(t, http.StatusNotFound, rec2.Code, "login endpoint must be 404 in cloud mode")
}

// TestLocalAuth_StatusEndpoint exercises GET /v1/auth/local/setup before and
// after the first owner is created so the web app can branch on the response
// without retrying with junk credentials.
func TestLocalAuth_StatusEndpoint(t *testing.T) {
	fx := newLocalAuthFixture(t, config.DeploymentModeLocal)

	req := httptest.NewRequest(http.MethodGet, "/v1/auth/local/setup", nil)
	rec := httptest.NewRecorder()
	fx.r.ServeHTTP(rec, req)
	assert.Equal(t, http.StatusOK, rec.Code)
	assert.True(t, strings.Contains(rec.Body.String(), `"owner_exists":false`),
		"fresh DB must report owner_exists=false; body=%s", rec.Body.String())

	created := postJSON(t, fx.r, "/v1/auth/local/setup", map[string]string{
		"email":    "statuser@example.com",
		"password": "long-enough-password",
	})
	require.Equalf(t, http.StatusCreated, created.Code, "setup failed: %s", created.Body.String())

	req2 := httptest.NewRequest(http.MethodGet, "/v1/auth/local/setup", nil)
	rec2 := httptest.NewRecorder()
	fx.r.ServeHTTP(rec2, req2)
	assert.Equal(t, http.StatusOK, rec2.Code)
	assert.True(t, strings.Contains(rec2.Body.String(), `"owner_exists":true`),
		"after setup, owner_exists must flip to true; body=%s", rec2.Body.String())
}

// TestLocalAuth_SetupRejectsShortPassword guards the bcrypt password floor.
func TestLocalAuth_SetupRejectsShortPassword(t *testing.T) {
	fx := newLocalAuthFixture(t, config.DeploymentModeLocal)

	rec := postJSON(t, fx.r, "/v1/auth/local/setup", map[string]string{
		"email":    "weak@example.com",
		"password": "abc",
	})
	assert.Equal(t, http.StatusBadRequest, rec.Code)
	assert.Contains(t, rec.Body.String(), "weak_password")
}
