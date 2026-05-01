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

// TestEvent_Create_WithAssignees_Success verifies the happy path: two valid
// members from the same household can be assigned to a new event and round-trip
// through both Create and Update payloads.
func TestEvent_Create_WithAssignees_Success(t *testing.T) {
	srv, token, householdID := setupEventFixtures(t)

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	// Create two additional members in the same household.
	memA, err := q.CreateMember(context.Background(), query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             householdID,
		Name:                    "Member A",
		DisplayName:             "MA",
		Color:                   "#aaa",
		Role:                    "member",
		AgeGroup:                "adult",
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)
	memB, err := q.CreateMember(context.Background(), query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             householdID,
		Name:                    "Member B",
		DisplayName:             "MB",
		Color:                   "#bbb",
		Role:                    "member",
		AgeGroup:                "adult",
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	now := time.Now().UTC()
	start := now.Add(time.Hour)
	end := now.Add(2 * time.Hour)

	// Create event with both members assigned, plus a duplicate of memA to
	// exercise the dedupe path.
	resp := authedPost(t, srv.URL+"/v1/events", token, map[string]any{
		"title":            "Family Dinner",
		"start_time":       start.Format(time.RFC3339),
		"end_time":         end.Format(time.RFC3339),
		"assigned_members": []string{memA.ID.String(), memB.ID.String(), memA.ID.String()},
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var created map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&created))
	eventID := created["id"].(string)

	// Assigned members should round-trip and be deduped.
	rawAssigned, ok := created["assigned_members"].([]any)
	require.True(t, ok, "assigned_members missing or wrong type: %v", created["assigned_members"])
	gotIDs := make([]string, 0, len(rawAssigned))
	for _, v := range rawAssigned {
		gotIDs = append(gotIDs, v.(string))
	}
	assert.ElementsMatch(t, []string{memA.ID.String(), memB.ID.String()}, gotIDs,
		"assigned_members should be deduped to the unique set")

	// Update should also accept a valid assignees set.
	resp2 := authedPatch(t, srv.URL+"/v1/events/"+eventID, token, map[string]any{
		"assigned_members": []string{memB.ID.String()},
	})
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)

	var updated map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&updated))
	rawUpdated, ok := updated["assigned_members"].([]any)
	require.True(t, ok)
	require.Len(t, rawUpdated, 1)
	assert.Equal(t, memB.ID.String(), rawUpdated[0].(string))
}

// TestEvent_Create_WithForeignHouseholdMember_Returns400 verifies that
// assigning a member that belongs to a different household is rejected with
// HTTP 400 and the error code "invalid_member".
func TestEvent_Create_WithForeignHouseholdMember_Returns400(t *testing.T) {
	srv, token, _ := setupEventFixtures(t)

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	// Create a second household with its own member that does not belong to
	// the household scoped on the JWT.
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	otherAcc, err := q.CreateAccount(context.Background(), query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("evt-other-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)
	otherHH, err := service.NewHouseholdService(q).Create(context.Background(), otherAcc.ID, model.CreateHouseholdRequest{
		Name:     "Other Family",
		Timezone: "UTC",
	})
	require.NoError(t, err)
	foreign, err := q.CreateMember(context.Background(), query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             otherHH.ID,
		Name:                    "Outsider",
		DisplayName:             "Out",
		Color:                   "#ccc",
		Role:                    "member",
		AgeGroup:                "adult",
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	now := time.Now().UTC()
	resp := authedPost(t, srv.URL+"/v1/events", token, map[string]any{
		"title":            "Should Fail",
		"start_time":       now.Add(time.Hour).Format(time.RFC3339),
		"end_time":         now.Add(2 * time.Hour).Format(time.RFC3339),
		"assigned_members": []string{foreign.ID.String()},
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusBadRequest, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "invalid_member", body["code"], "expected error code invalid_member, got %v", body)

	// A wholly unknown UUID should also be rejected as invalid_member.
	resp2 := authedPost(t, srv.URL+"/v1/events", token, map[string]any{
		"title":            "Should Also Fail",
		"start_time":       now.Add(time.Hour).Format(time.RFC3339),
		"end_time":         now.Add(2 * time.Hour).Format(time.RFC3339),
		"assigned_members": []string{uuid.New().String()},
	})
	defer resp2.Body.Close()
	require.Equal(t, http.StatusBadRequest, resp2.StatusCode)
	var body2 map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&body2))
	assert.Equal(t, "invalid_member", body2["code"])
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
