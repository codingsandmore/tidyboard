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

func TestMember_CreateWithAccountID_Integration(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	memberSvc := service.NewMemberService(q, authSvc)
	householdSvc := service.NewHouseholdService(q)
	memberH := handler.NewMemberHandler(memberSvc)
	householdH := handler.NewHouseholdHandler(householdSvc)

	// Create an account for FK + JWT
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	acc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("member-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	token := testutil.MakeJWT(acc.ID, uuid.Nil, uuid.Nil, "owner")

	r := chi.NewRouter()
	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/households", householdH.Create)
	r.Post("/v1/households/{id}/members", memberH.Create)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	// Create a household first
	hhBody, _ := json.Marshal(map[string]string{"name": "Test Family", "timezone": "UTC"})
	hhReq, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/households", bytes.NewReader(hhBody))
	hhReq.Header.Set("Content-Type", "application/json")
	hhReq.Header.Set("Authorization", "Bearer "+token)
	hhResp, err := http.DefaultClient.Do(hhReq)
	require.NoError(t, err)
	defer hhResp.Body.Close()
	require.Equal(t, http.StatusCreated, hhResp.StatusCode)

	var hh map[string]any
	require.NoError(t, json.NewDecoder(hhResp.Body).Decode(&hh))
	householdID := hh["id"].(string)

	// Create a member WITH account_id — this is the self-onboarding case.
	memberBody := map[string]any{
		"name":         "Alice",
		"display_name": "Alice",
		"color":        "#FF0000",
		"role":         "admin",
		"age_group":    "adult",
		"account_id":   acc.ID.String(),
	}
	b, _ := json.Marshal(memberBody)
	mReq, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/households/"+householdID+"/members", bytes.NewReader(b))
	mReq.Header.Set("Content-Type", "application/json")
	mReq.Header.Set("Authorization", "Bearer "+token)
	mResp, err := http.DefaultClient.Do(mReq)
	require.NoError(t, err)
	defer mResp.Body.Close()
	require.Equal(t, http.StatusCreated, mResp.StatusCode)

	var created map[string]any
	require.NoError(t, json.NewDecoder(mResp.Body).Decode(&created))
	assert.Equal(t, "Alice", created["name"])

	// Verify the account_id is persisted on the row so GetPrimaryMemberByAccount
	// can resolve household + member context after onboarding.
	row, err := q.GetPrimaryMemberByAccount(context.Background(),
		&uuid.NullUUID{UUID: acc.ID, Valid: true})
	require.NoError(t, err)
	assert.Equal(t, householdID, row.HouseholdID.String())
	assert.Equal(t, "admin", row.Role)

	// Verify a PIN-only / child member created WITHOUT account_id is fine too.
	childBody := map[string]any{
		"name":         "Bob",
		"display_name": "Bob",
		"color":        "#00FF00",
		"role":         "child",
		"age_group":    "child",
	}
	cb, _ := json.Marshal(childBody)
	cReq, _ := http.NewRequest(http.MethodPost, srv.URL+"/v1/households/"+householdID+"/members", bytes.NewReader(cb))
	cReq.Header.Set("Content-Type", "application/json")
	cReq.Header.Set("Authorization", "Bearer "+token)
	cResp, err := http.DefaultClient.Do(cReq)
	require.NoError(t, err)
	defer cResp.Body.Close()
	require.Equal(t, http.StatusCreated, cResp.StatusCode)

	var child map[string]any
	require.NoError(t, json.NewDecoder(cResp.Body).Decode(&child))
	assert.Equal(t, "Bob", child["name"])
	// account_id should be absent / null for PIN-only members
	_, hasAccountID := child["account_id"]
	assert.False(t, hasAccountID, "child member should not expose account_id")
}
