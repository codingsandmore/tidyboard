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
	"github.com/jackc/pgx/v5/pgtype"
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

// choreTimerEnv is the test rig for chore-timer endpoints. Each call to
// setupChoreTimerEnv builds a fresh household, member, and a chore so tests
// don't share state. The helper also registers all four timer routes plus the
// member-summary route on a chi router behind the standard auth middleware.
type choreTimerEnv struct {
	srv         *httptest.Server
	token       string
	householdID uuid.UUID
	memberID    uuid.UUID
	choreID     uuid.UUID
	q           *query.Queries
}

func setupChoreTimerEnv(t *testing.T) *choreTimerEnv {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	ctx := context.Background()

	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	acc, err := q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("ct-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	hh, err := q.CreateHousehold(ctx, query.CreateHouseholdParams{
		ID:         uuid.New(),
		Name:       "Timer Family",
		Timezone:   "UTC",
		Settings:   []byte("{}"),
		CreatedBy:  acc.ID,
		InviteCode: fmt.Sprintf("INV%s", uuid.New().String()[:8]),
	})
	require.NoError(t, err)

	mem, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             hh.ID,
		Name:                    "Timer Member",
		DisplayName:             "TM",
		Color:                   "#abc",
		Role:                    "admin",
		AgeGroup:                "adult",
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	chore, err := q.CreateChore(ctx, query.CreateChoreParams{
		ID:            uuid.New(),
		HouseholdID:   hh.ID,
		MemberID:      mem.ID,
		Name:          "Sweep",
		Weight:        3,
		FrequencyKind: "daily",
		DaysOfWeek:    []string{},
		AutoApprove:   true,
	})
	require.NoError(t, err)

	token := testutil.MakeJWT(acc.ID, hh.ID, mem.ID, "admin")

	timerSvc := service.NewChoreTimerService(q)
	h := handler.NewChoreTimerHandler(timerSvc, q)

	verifier, err := auth.NewVerifier(ctx, config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)

	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/chores/{id}/timer/start", h.StartTimer)
	r.Post("/v1/chores/{id}/timer/stop", h.StopTimer)
	r.Post("/v1/chores/{id}/time-entries", h.CreateManualEntry)
	r.Get("/v1/members/{id}/time-summary", h.MemberSummary)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	return &choreTimerEnv{
		srv:         srv,
		token:       token,
		householdID: hh.ID,
		memberID:    mem.ID,
		choreID:     chore.ID,
		q:           q,
	}
}

// TestChoreTimer_StartStop verifies the happy path: Start opens an entry with
// no ended_at, Stop closes the same entry, and the GENERATED duration_seconds
// column populates a non-nil non-negative value.
func TestChoreTimer_StartStop(t *testing.T) {
	env := setupChoreTimerEnv(t)

	startResp := authedPost(t, fmt.Sprintf("%s/v1/chores/%s/timer/start", env.srv.URL, env.choreID), env.token, map[string]any{})
	defer startResp.Body.Close()
	require.Equal(t, http.StatusCreated, startResp.StatusCode)

	var started query.ChoreTimeEntry
	require.NoError(t, json.NewDecoder(startResp.Body).Decode(&started))
	assert.Equal(t, env.choreID, started.ChoreID)
	assert.Equal(t, env.memberID, started.MemberID)
	assert.True(t, started.StartedAt.Valid)
	assert.False(t, started.EndedAt.Valid)
	assert.Nil(t, started.DurationSeconds)
	assert.Equal(t, "timer", started.Source)

	// Sleep briefly so duration_seconds is provably > 0 only if NOW() advanced.
	// We tolerate duration_seconds == 0 because Postgres NOW() pins to txn start.
	time.Sleep(50 * time.Millisecond)

	stopResp := authedPost(t, fmt.Sprintf("%s/v1/chores/%s/timer/stop", env.srv.URL, env.choreID), env.token, map[string]any{})
	defer stopResp.Body.Close()
	require.Equal(t, http.StatusOK, stopResp.StatusCode)

	var stopped query.ChoreTimeEntry
	require.NoError(t, json.NewDecoder(stopResp.Body).Decode(&stopped))
	assert.Equal(t, started.ID, stopped.ID, "Stop should close the same entry that Start opened")
	require.True(t, stopped.EndedAt.Valid, "ended_at must be populated server-side")
	require.NotNil(t, stopped.DurationSeconds, "duration_seconds GENERATED column must populate when ended_at is set")
	assert.GreaterOrEqual(t, *stopped.DurationSeconds, int32(0))
}

// TestChoreTimer_RejectsConcurrentStart verifies that a second Start while an
// entry is already open returns 409 with code "timer_already_running".
func TestChoreTimer_RejectsConcurrentStart(t *testing.T) {
	env := setupChoreTimerEnv(t)

	first := authedPost(t, fmt.Sprintf("%s/v1/chores/%s/timer/start", env.srv.URL, env.choreID), env.token, map[string]any{})
	defer first.Body.Close()
	require.Equal(t, http.StatusCreated, first.StatusCode)

	second := authedPost(t, fmt.Sprintf("%s/v1/chores/%s/timer/start", env.srv.URL, env.choreID), env.token, map[string]any{})
	defer second.Body.Close()
	require.Equal(t, http.StatusConflict, second.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(second.Body).Decode(&body))
	// respond.Error wraps the code in an "error" object.
	if errObj, ok := body["error"].(map[string]any); ok {
		assert.Equal(t, "timer_already_running", errObj["code"])
	} else {
		assert.Equal(t, "timer_already_running", body["code"], "expected top-level or nested code field")
	}
}

// TestChoreTimer_StopWithoutStart verifies graceful handling of Stop with no
// open timer (409 with code "no_open_timer").
func TestChoreTimer_StopWithoutStart(t *testing.T) {
	env := setupChoreTimerEnv(t)

	resp := authedPost(t, fmt.Sprintf("%s/v1/chores/%s/timer/stop", env.srv.URL, env.choreID), env.token, map[string]any{})
	defer resp.Body.Close()
	// Per spec: "graceful 404 or 409". We chose 409 to mirror the conflict
	// semantics of "no resource in the right state".
	assert.True(t, resp.StatusCode == http.StatusConflict || resp.StatusCode == http.StatusNotFound,
		"expected 409 or 404, got %d", resp.StatusCode)
}

// TestChoreTimer_ManualEntry verifies the manual-entry endpoint inserts a
// closed time entry with the supplied window.
func TestChoreTimer_ManualEntry(t *testing.T) {
	env := setupChoreTimerEnv(t)

	end := time.Now().UTC().Truncate(time.Second)
	start := end.Add(-30 * time.Minute)

	resp := authedPost(t, fmt.Sprintf("%s/v1/chores/%s/time-entries", env.srv.URL, env.choreID), env.token, map[string]any{
		"started_at": start.Format(time.RFC3339),
		"ended_at":   end.Format(time.RFC3339),
		"note":       "vacuum + dust",
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var entry query.ChoreTimeEntry
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&entry))
	assert.Equal(t, env.choreID, entry.ChoreID)
	assert.Equal(t, env.memberID, entry.MemberID)
	assert.Equal(t, "manual", entry.Source)
	assert.Equal(t, "vacuum + dust", entry.Note)
	require.NotNil(t, entry.DurationSeconds)
	assert.InDelta(t, 1800, *entry.DurationSeconds, 1)
}

// TestMemberTimeSummary verifies that the aggregate endpoint sums durations
// over the supplied window and ignores entries outside it.
func TestMemberTimeSummary(t *testing.T) {
	env := setupChoreTimerEnv(t)
	ctx := context.Background()

	// Insert three closed entries: two inside the window (10 min + 20 min),
	// one outside (5 min, 10 days ago).
	now := time.Now().UTC().Truncate(time.Second)
	insertEntry := func(startedAt, endedAt time.Time) {
		t.Helper()
		_, err := env.q.InsertManualTimeEntry(ctx, query.InsertManualTimeEntryParams{
			ID:        uuid.New(),
			ChoreID:   env.choreID,
			MemberID:  env.memberID,
			StartedAt: pgtype.Timestamptz{Time: startedAt, Valid: true},
			EndedAt:   pgtype.Timestamptz{Time: endedAt, Valid: true},
			Note:      "",
		})
		require.NoError(t, err)
	}
	insertEntry(now.Add(-2*time.Hour), now.Add(-2*time.Hour).Add(10*time.Minute))
	insertEntry(now.Add(-1*time.Hour), now.Add(-1*time.Hour).Add(20*time.Minute))
	insertEntry(now.Add(-10*24*time.Hour), now.Add(-10*24*time.Hour).Add(5*time.Minute))

	from := now.Add(-3 * time.Hour)
	to := now.Add(1 * time.Hour)

	url := fmt.Sprintf("%s/v1/members/%s/time-summary?from=%s&to=%s",
		env.srv.URL,
		env.memberID,
		from.Format(time.RFC3339),
		to.Format(time.RFC3339),
	)
	resp := authedGet(t, url, env.token)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var summary service.MemberSummary
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&summary))
	assert.Equal(t, env.memberID, summary.MemberID)
	assert.Equal(t, int64(2), summary.EntryCount, "only the two in-window entries should be counted")
	assert.Equal(t, int64(30*60), summary.TotalSeconds, "10 min + 20 min = 1800 s")
	require.Len(t, summary.ByChore, 1)
	assert.Equal(t, env.choreID, summary.ByChore[0].ChoreID)
	assert.Equal(t, int64(2), summary.ByChore[0].EntryCount)
	assert.Equal(t, int64(30*60), summary.ByChore[0].TotalSeconds)
}
