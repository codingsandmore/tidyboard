//go:build integration

package handler_test

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

func setupAuthHandler(t *testing.T) (*handler.AuthHandler, *httptest.Server) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	authSvc := service.NewAuthService(config.AuthConfig{
		JWTSecret: testutil.TestJWTSecret,
		JWTExpiry: 0,
	}, q)
	h := handler.NewAuthHandler(authSvc)

	r := chi.NewRouter()
	r.Post("/v1/auth/register", h.Register)
	r.Post("/v1/auth/login", h.Login)
	r.Post("/v1/auth/pin", h.PINLogin)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return h, srv
}

func TestAuth_RegisterLogin_Integration(t *testing.T) {
	_, srv := setupAuthHandler(t)

	email := "integration-test-" + t.Name() + "@example.com"
	password := "TestPass123!"

	// Register
	regBody, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	resp, err := http.Post(srv.URL+"/v1/auth/register", "application/json", bytes.NewReader(regBody))
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusCreated, resp.StatusCode)

	var regResp map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&regResp))
	assert.NotEmpty(t, regResp["token"])

	// Login with same credentials
	loginBody, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": password,
	})
	resp2, err := http.Post(srv.URL+"/v1/auth/login", "application/json", bytes.NewReader(loginBody))
	require.NoError(t, err)
	defer resp2.Body.Close()
	assert.Equal(t, http.StatusOK, resp2.StatusCode)

	var loginResp map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&loginResp))
	assert.NotEmpty(t, loginResp["token"])

	// Login with wrong password → 401
	badBody, _ := json.Marshal(map[string]string{
		"email":    email,
		"password": "wrong-password",
	})
	resp3, err := http.Post(srv.URL+"/v1/auth/login", "application/json", bytes.NewReader(badBody))
	require.NoError(t, err)
	defer resp3.Body.Close()
	assert.Equal(t, http.StatusUnauthorized, resp3.StatusCode)

	// Duplicate register → 409
	resp4, err := http.Post(srv.URL+"/v1/auth/register", "application/json", bytes.NewReader(regBody))
	require.NoError(t, err)
	defer resp4.Body.Close()
	assert.Equal(t, http.StatusConflict, resp4.StatusCode)
}

func TestAuth_Register_MissingFields(t *testing.T) {
	_, srv := setupAuthHandler(t)

	// Missing password
	body, _ := json.Marshal(map[string]string{"email": "x@example.com"})
	resp, err := http.Post(srv.URL+"/v1/auth/register", "application/json", bytes.NewReader(body))
	require.NoError(t, err)
	defer resp.Body.Close()
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)
}

func TestAuth_PINLogin_NoPin(t *testing.T) {
	// Member doesn't exist → 401
	body, _ := json.Marshal(map[string]any{
		"household_id": "00000000-0000-0000-0000-000000000001",
		"member_id":    "00000000-0000-0000-0000-000000000002",
		"pin":          "1234",
	})
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/pin", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	// Use handler directly so we don't need to parse the URL
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	authSvc := service.NewAuthService(config.AuthConfig{
		JWTSecret: testutil.TestJWTSecret,
	}, q)
	h := handler.NewAuthHandler(authSvc)
	h.PINLogin(rec, req)
	assert.Equal(t, http.StatusUnauthorized, rec.Code)
}
