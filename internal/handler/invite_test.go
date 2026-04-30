//go:build integration

package handler_test

import (
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

func TestInvite_ApproveFlow_Integration(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	inviteSvc := service.NewInviteService(q)
	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	memberSvc := service.NewMemberService(q, authSvc)

	inviteH := handler.NewInviteHandler(inviteSvc)
	householdH := handler.NewHouseholdHandler(service.NewHouseholdService(q))
	memberH := handler.NewMemberHandler(memberSvc)

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)

	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/households", householdH.Create)
	r.Get("/v1/households/{id}", householdH.Get)
	r.Post("/v1/households/{id}/invite/regenerate", inviteH.RegenerateInviteCode)
	r.Get("/v1/households/by-code/{code}", inviteH.GetByCode)
	r.Post("/v1/households/by-code/{code}/join", inviteH.RequestJoin)
	r.Get("/v1/households/{id}/join-requests", inviteH.ListJoinRequests)
	r.Post("/v1/join-requests/{id}/approve", inviteH.ApproveJoinRequest)
	r.Post("/v1/join-requests/{id}/reject", inviteH.RejectJoinRequest)
	r.Get("/v1/households/{id}/members", memberH.List)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	// Create two accounts: owner + joiner
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	ownerAcc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("owner-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	joinerAcc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("joiner-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	ownerToken := testutil.MakeJWT(ownerAcc.ID, uuid.Nil, uuid.Nil, "admin")
	joinerToken := testutil.MakeJWT(joinerAcc.ID, uuid.Nil, uuid.Nil, "member")

	// 1. Owner creates household.
	resp := authedPost(t, srv.URL+"/v1/households", ownerToken, map[string]string{
		"name": "Invite Test Family",
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var hh map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&hh))
	householdID := hh["id"].(string)
	inviteCode := hh["invite_code"].(string)
	require.NotEmpty(t, inviteCode)

	// 2. Regenerate invite code.
	resp2 := authedPost(t, srv.URL+"/v1/households/"+householdID+"/invite/regenerate", ownerToken, nil)
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)

	var regen map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&regen))
	newCode := regen["invite_code"].(string)
	require.NotEmpty(t, newCode)
	assert.NotEqual(t, inviteCode, newCode, "code should have changed")
	assert.Len(t, newCode, 8, "code should be 8 chars")

	// 3. Joiner looks up household by code.
	resp3 := authedGet(t, srv.URL+"/v1/households/by-code/"+newCode, joinerToken)
	defer resp3.Body.Close()
	require.Equal(t, http.StatusOK, resp3.StatusCode)

	var preview map[string]any
	require.NoError(t, json.NewDecoder(resp3.Body).Decode(&preview))
	assert.Equal(t, householdID, preview["household_id"])

	// 4. Joiner requests to join.
	resp4 := authedPost(t, srv.URL+"/v1/households/by-code/"+newCode+"/join", joinerToken, nil)
	defer resp4.Body.Close()
	require.Equal(t, http.StatusCreated, resp4.StatusCode)

	var jr map[string]any
	require.NoError(t, json.NewDecoder(resp4.Body).Decode(&jr))
	joinRequestID := jr["id"].(string)
	assert.Equal(t, "pending", jr["status"])

	// 5. Owner lists join requests.
	resp5 := authedGet(t, srv.URL+"/v1/households/"+householdID+"/join-requests", ownerToken)
	defer resp5.Body.Close()
	require.Equal(t, http.StatusOK, resp5.StatusCode)

	var requests []map[string]any
	require.NoError(t, json.NewDecoder(resp5.Body).Decode(&requests))
	require.Len(t, requests, 1)
	assert.Equal(t, joinRequestID, requests[0]["id"])

	// 6. Owner approves join request → member should be created.
	resp6 := authedPost(t, srv.URL+"/v1/join-requests/"+joinRequestID+"/approve", ownerToken, nil)
	defer resp6.Body.Close()
	require.Equal(t, http.StatusOK, resp6.StatusCode)

	var approved map[string]any
	require.NoError(t, json.NewDecoder(resp6.Body).Decode(&approved))
	assert.Equal(t, "approved", approved["status"])

	// 7. Verify a member was created with joiner's account_id.
	members, err := q.ListMembers(context.Background(), uuid.MustParse(householdID))
	require.NoError(t, err)

	found := false
	for _, m := range members {
		if m.AccountID != nil && m.AccountID.Valid && m.AccountID.UUID == joinerAcc.ID {
			found = true
			assert.Equal(t, uuid.MustParse(householdID), m.HouseholdID)
		}
	}
	assert.True(t, found, "member with joiner account_id should have been created")

	// 8. Trying to approve again should fail (not pending).
	resp8 := authedPost(t, srv.URL+"/v1/join-requests/"+joinRequestID+"/approve", ownerToken, nil)
	defer resp8.Body.Close()
	assert.Equal(t, http.StatusConflict, resp8.StatusCode)

	// 9. Test reject flow with a second joiner.
	joiner2Acc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("joiner2-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)
	joiner2Token := testutil.MakeJWT(joiner2Acc.ID, uuid.Nil, uuid.Nil, "member")

	resp9 := authedPost(t, srv.URL+"/v1/households/by-code/"+newCode+"/join", joiner2Token, nil)
	defer resp9.Body.Close()
	require.Equal(t, http.StatusCreated, resp9.StatusCode)

	var jr2 map[string]any
	require.NoError(t, json.NewDecoder(resp9.Body).Decode(&jr2))
	jr2ID := jr2["id"].(string)

	resp10 := authedPost(t, srv.URL+"/v1/join-requests/"+jr2ID+"/reject", ownerToken, nil)
	defer resp10.Body.Close()
	require.Equal(t, http.StatusOK, resp10.StatusCode)

	var rejected map[string]any
	require.NoError(t, json.NewDecoder(resp10.Body).Decode(&rejected))
	assert.Equal(t, "rejected", rejected["status"])

	// Invalid code → 404.
	resp11 := authedGet(t, srv.URL+"/v1/households/by-code/BADCODE1", joinerToken)
	defer resp11.Body.Close()
	assert.Equal(t, http.StatusNotFound, resp11.StatusCode)
}
