//go:build integration

package handler_test

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// setupEventFixtures creates an account, household, and member in the DB
// and returns a running test server plus the JWT token scoped to that household.
func setupEventFixtures(t *testing.T) (srv *httptest.Server, token string, householdID uuid.UUID) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	// Create account
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	acc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("evt-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	// Create household
	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	hhSvc := service.NewHouseholdService(q)
	hh, err := hhSvc.Create(context.Background(), acc.ID, model.CreateHouseholdRequest{
		Name:     "Event Test Family",
		Timezone: "UTC",
	})
	require.NoError(t, err)
	householdID = hh.ID

	// Create member
	memberSvc := service.NewMemberService(q, authSvc)
	mem, err := memberSvc.Create(context.Background(), householdID, model.CreateMemberRequest{
		Name:        "Test User",
		DisplayName: "Tester",
		Color:       "#fff",
		Role:        "admin",
		AgeGroup:    "adult",
	})
	require.NoError(t, err)

	token = testutil.MakeJWT(acc.ID, householdID, mem.ID, "admin")

	bc := broadcast.NewMemoryBroadcaster()
	auditSvc := service.NewAuditService(q)
	eventSvc := service.NewEventService(q, bc, auditSvc)
	h := handler.NewEventHandler(eventSvc)

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Get("/v1/events", h.List)
	r.Post("/v1/events", h.Create)
	r.Get("/v1/events/{id}", h.Get)
	r.Patch("/v1/events/{id}", h.Update)
	r.Delete("/v1/events/{id}", h.Delete)

	srv = httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return
}

func TestEvent_CreateListInRange_Integration(t *testing.T) {
	srv, token, _ := setupEventFixtures(t)

	now := time.Now().UTC()
	start := now.Add(time.Hour)
	end := now.Add(2 * time.Hour)

	// Create event
	resp := authedPost(t, srv.URL+"/v1/events", token, map[string]any{
		"title":      "Birthday Party",
		"start_time": start.Format(time.RFC3339),
		"end_time":   end.Format(time.RFC3339),
		"all_day":    false,
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var created map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	eventID := created["id"].(string)
	assert.Equal(t, "Birthday Party", created["title"])

	// List events — no range filter
	resp2 := authedGet(t, srv.URL+"/v1/events", token)
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)

	var events []any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&events))
	assert.GreaterOrEqual(t, len(events), 1)

	// List events with range that includes the event
	rangeURL := fmt.Sprintf("%s/v1/events?start=%s&end=%s",
		srv.URL,
		now.Format(time.RFC3339),
		now.Add(3*time.Hour).Format(time.RFC3339),
	)
	resp3 := authedGet(t, rangeURL, token)
	defer resp3.Body.Close()
	require.Equal(t, http.StatusOK, resp3.StatusCode)

	var rangeEvents []any
	require.NoError(t, json.NewDecoder(resp3.Body).Decode(&rangeEvents))
	assert.GreaterOrEqual(t, len(rangeEvents), 1)

	// Get event by ID
	resp4 := authedGet(t, srv.URL+"/v1/events/"+eventID, token)
	defer resp4.Body.Close()
	require.Equal(t, http.StatusOK, resp4.StatusCode)

	var fetched map[string]any
	require.NoError(t, json.NewDecoder(resp4.Body).Decode(&fetched))
	assert.Equal(t, eventID, fetched["id"])

	// Update event
	resp5 := authedPatch(t, srv.URL+"/v1/events/"+eventID, token, map[string]string{
		"title": "Updated Party",
	})
	defer resp5.Body.Close()
	require.Equal(t, http.StatusOK, resp5.StatusCode)

	var updated map[string]any
	require.NoError(t, json.NewDecoder(resp5.Body).Decode(&updated))
	assert.Equal(t, "Updated Party", updated["title"])

	// Delete event
	resp6 := authedDelete(t, srv.URL+"/v1/events/"+eventID, token)
	defer resp6.Body.Close()
	assert.Equal(t, http.StatusNoContent, resp6.StatusCode)

	// Confirm gone
	resp7 := authedGet(t, srv.URL+"/v1/events/"+eventID, token)
	defer resp7.Body.Close()
	assert.Equal(t, http.StatusNotFound, resp7.StatusCode)
}

func TestEvent_List_OutOfRange(t *testing.T) {
	srv, token, _ := setupEventFixtures(t)

	now := time.Now().UTC()
	start := now.Add(time.Hour)
	end := now.Add(2 * time.Hour)

	// Create event in range
	resp := authedPost(t, srv.URL+"/v1/events", token, map[string]any{
		"title":      "Range Test Event",
		"start_time": start.Format(time.RFC3339),
		"end_time":   end.Format(time.RFC3339),
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	// Query with range far in the past → should return empty or not include our event
	pastURL := fmt.Sprintf("%s/v1/events?start=%s&end=%s",
		srv.URL,
		now.Add(-48*time.Hour).Format(time.RFC3339),
		now.Add(-24*time.Hour).Format(time.RFC3339),
	)
	resp2 := authedGet(t, pastURL, token)
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)

	var events []any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&events))
	// Our event is in the future, not in the past range
	for _, e := range events {
		em := e.(map[string]any)
		assert.NotEqual(t, "Range Test Event", em["title"])
	}
}
