//go:build integration

package handler_test

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)


func authedPost(t *testing.T, url, token string, body any) *http.Response {
	t.Helper()
	b, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPost, url, bytes.NewReader(b))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func authedGet(t *testing.T, url, token string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet, url, nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func authedPatch(t *testing.T, url, token string, body any) *http.Response {
	t.Helper()
	b, _ := json.Marshal(body)
	req, err := http.NewRequest(http.MethodPatch, url, bytes.NewReader(b))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func authedDelete(t *testing.T, url, token string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodDelete, url, nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func TestHousehold_CreateGet_Integration(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	svc := service.NewHouseholdService(q)
	h := handler.NewHouseholdHandler(svc)

	// Create an account directly for FK satisfaction (households.created_by)
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b" // dummy bcrypt
	acc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("hh-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	token := testutil.MakeJWT(acc.ID, uuid.Nil, uuid.Nil, "owner")

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/households", h.Create)
	r.Get("/v1/households/{id}", h.Get)
	r.Patch("/v1/households/{id}", h.Update)
	r.Delete("/v1/households/{id}", h.Delete)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	// Create household
	resp := authedPost(t, srv.URL+"/v1/households", token, map[string]string{
		"name":     "Integration Test Family",
		"timezone": "America/New_York",
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var created map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	householdID := created["id"].(string)
	assert.Equal(t, "Integration Test Family", created["name"])

	// Get household
	resp2 := authedGet(t, srv.URL+"/v1/households/"+householdID, token)
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)

	var fetched map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&fetched))
	assert.Equal(t, householdID, fetched["id"])
	assert.Equal(t, "Integration Test Family", fetched["name"])

	// Get non-existent → 404
	resp3 := authedGet(t, srv.URL+"/v1/households/"+uuid.New().String(), token)
	defer resp3.Body.Close()
	assert.Equal(t, http.StatusNotFound, resp3.StatusCode)

	// Update household
	newName := "Updated Family"
	resp4 := authedPatch(t, srv.URL+"/v1/households/"+householdID, token, map[string]string{
		"name": newName,
	})
	defer resp4.Body.Close()
	require.Equal(t, http.StatusOK, resp4.StatusCode)

	var updated map[string]any
	require.NoError(t, json.NewDecoder(resp4.Body).Decode(&updated))
	assert.Equal(t, newName, updated["name"])

	// Delete household
	resp5 := authedDelete(t, srv.URL+"/v1/households/"+householdID, token)
	defer resp5.Body.Close()
	assert.Equal(t, http.StatusNoContent, resp5.StatusCode)

	// Confirm gone → 404
	resp6 := authedGet(t, srv.URL+"/v1/households/"+householdID, token)
	defer resp6.Body.Close()
	assert.Equal(t, http.StatusNotFound, resp6.StatusCode)
}
