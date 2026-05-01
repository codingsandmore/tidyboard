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
	"github.com/jackc/pgx/v5/pgxpool"
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

// hkEnv is the test rig for the GET /v1/equity/housekeeper-estimate endpoint.
type hkEnv struct {
	srv         *httptest.Server
	token       string
	householdID uuid.UUID
	memberID    uuid.UUID
	pool        *pgxpool.Pool
	q           *query.Queries
}

// setupHKEnv builds a fresh household + member, registers the housekeeper
// route on a chi router behind the standard auth middleware, and returns
// handles to insert categorized chores and time entries directly via SQL
// (the only way to set chore.category since UpdateChore doesn't expose it).
func setupHKEnv(t *testing.T) *hkEnv {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	ctx := context.Background()

	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	acc, err := q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("hk-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	hh, err := q.CreateHousehold(ctx, query.CreateHouseholdParams{
		ID:         uuid.New(),
		Name:       "HK Family",
		Timezone:   "UTC",
		Settings:   []byte("{}"),
		CreatedBy:  acc.ID,
		InviteCode: fmt.Sprintf("INV%s", uuid.New().String()[:8]),
	})
	require.NoError(t, err)

	mem, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID:                      uuid.New(),
		HouseholdID:             hh.ID,
		Name:                    "HK Member",
		DisplayName:             "HK",
		Color:                   "#abc",
		Role:                    "admin",
		AgeGroup:                "adult",
		EmergencyInfo:           []byte("{}"),
		NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	token := testutil.MakeJWT(acc.ID, hh.ID, mem.ID, "admin")

	hkSvc, err := service.NewHousekeeperService(q)
	require.NoError(t, err)
	h := handler.NewHousekeeperHandler(hkSvc)

	verifier, err := auth.NewVerifier(ctx, config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)

	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Get("/v1/equity/housekeeper-estimate", h.GetEstimate)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	return &hkEnv{
		srv:         srv,
		token:       token,
		householdID: hh.ID,
		memberID:    mem.ID,
		pool:        pool,
		q:           q,
	}
}

// insertCategorizedChore creates a chore via sqlc, then sets its category via
// raw SQL (UpdateChore does not expose the category column today).
// Pass category="" to leave the category NULL.
func (e *hkEnv) insertCategorizedChore(t *testing.T, name, category string) uuid.UUID {
	t.Helper()
	ctx := context.Background()

	c, err := e.q.CreateChore(ctx, query.CreateChoreParams{
		ID:            uuid.New(),
		HouseholdID:   e.householdID,
		MemberID:      e.memberID,
		Name:          name,
		Weight:        3,
		FrequencyKind: "daily",
		DaysOfWeek:    []string{},
		AutoApprove:   true,
	})
	require.NoError(t, err)

	if category != "" {
		_, err = e.pool.Exec(ctx, `UPDATE chores SET category = $1 WHERE id = $2`, category, c.ID)
		require.NoError(t, err)
	}
	return c.ID
}

// insertClosedTimeEntry inserts a closed chore_time_entry directly via SQL,
// pinning started_at and ended_at so duration_seconds is deterministic.
func (e *hkEnv) insertClosedTimeEntry(t *testing.T, choreID uuid.UUID, start, end time.Time) {
	t.Helper()
	ctx := context.Background()
	_, err := e.pool.Exec(ctx, `
		INSERT INTO chore_time_entries (id, chore_id, member_id, started_at, ended_at, source)
		VALUES ($1, $2, $3, $4, $5, 'manual')`,
		uuid.New(), choreID, e.memberID, start, end,
	)
	require.NoError(t, err)
}

// TestHousekeeperEstimate_PerCategory seeds two chores with distinct categories
// ('cooking_meal', 'deep_clean'), seeds chore_time_entries totaling 60 minutes
// on cooking_meal, and asserts the response reports total_seconds=3600 and
// estimated_cost_cents = market_rate × 1 for cooking_meal.
func TestHousekeeperEstimate_PerCategory(t *testing.T) {
	env := setupHKEnv(t)

	// Build the rate map from the embedded asset to compute the expected cost.
	rates, err := service.LoadHousekeeperRates()
	require.NoError(t, err)
	cookingRate, ok := rates["cooking_meal"]
	require.True(t, ok, "cooking_meal must be present in housekeeper-rates.json")

	// Seed cooking_meal: 60 min total across two entries.
	cookID := env.insertCategorizedChore(t, "Make dinner", "cooking_meal")
	now := time.Now().UTC()
	env.insertClosedTimeEntry(t, cookID, now.Add(-2*time.Hour), now.Add(-2*time.Hour+45*time.Minute)) // 45 min
	env.insertClosedTimeEntry(t, cookID, now.Add(-1*time.Hour), now.Add(-45*time.Minute))              // 15 min

	// Seed deep_clean with no entries — it should not appear.
	_ = env.insertCategorizedChore(t, "Bathroom scrub", "deep_clean")

	// Window covers the inserted entries.
	from := now.Add(-3 * time.Hour).Format("2006-01-02")
	to := now.Add(2 * time.Hour).Format("2006-01-02")
	url := fmt.Sprintf("%s/v1/equity/housekeeper-estimate?from=%s&to=%s", env.srv.URL, from, to)

	resp := authedGet(t, url, env.token)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var body struct {
		Categories []service.CategoryEstimate `json:"categories"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))

	// Find cooking_meal in the response.
	var got *service.CategoryEstimate
	for i := range body.Categories {
		if body.Categories[i].Category == "cooking_meal" {
			got = &body.Categories[i]
			break
		}
	}
	require.NotNil(t, got, "cooking_meal entry should be present")
	assert.Equal(t, int64(3600), got.TotalSeconds, "60 min = 3600 s")
	assert.Equal(t, cookingRate.MarketRateCentsPerHour, got.MarketRateCentsPerHour)
	// estimated_cost_cents = total_seconds × cents_per_hour / 3600
	expected := int64(3600) * cookingRate.MarketRateCentsPerHour / 3600
	assert.Equal(t, expected, got.EstimatedCostCents)

	// deep_clean has no time entries → must not appear.
	for _, c := range body.Categories {
		assert.NotEqual(t, "deep_clean", c.Category, "deep_clean has no time entries; should be omitted")
	}
}

// TestHousekeeperEstimate_LoadsRatesAsset asserts the embedded asset parses and
// contains every category required by spec H.1.
func TestHousekeeperEstimate_LoadsRatesAsset(t *testing.T) {
	rates, err := service.LoadHousekeeperRates()
	require.NoError(t, err)

	for _, key := range []string{"cooking_meal", "deep_clean", "laundry", "child_care"} {
		r, ok := rates[key]
		require.True(t, ok, "category %q must be present in housekeeper-rates.json", key)
		assert.Greater(t, r.MarketRateCentsPerHour, int64(0), "rate for %q must be positive", key)
		assert.NotEmpty(t, r.Label, "label for %q must be set", key)
	}
}

// TestHousekeeperEstimate_OmitsUncategorizedChores verifies that time entries
// against a chore with NULL category are excluded from the response.
func TestHousekeeperEstimate_OmitsUncategorizedChores(t *testing.T) {
	env := setupHKEnv(t)

	// Categorized chore: 30 min on laundry — provides a non-empty baseline.
	laundryID := env.insertCategorizedChore(t, "Wash sheets", "laundry")
	now := time.Now().UTC()
	env.insertClosedTimeEntry(t, laundryID, now.Add(-90*time.Minute), now.Add(-60*time.Minute))

	// Uncategorized chore: 60 min — must NOT appear in the response.
	uncatID := env.insertCategorizedChore(t, "Random task", "")
	env.insertClosedTimeEntry(t, uncatID, now.Add(-2*time.Hour), now.Add(-1*time.Hour))

	from := now.Add(-3 * time.Hour).Format("2006-01-02")
	to := now.Add(2 * time.Hour).Format("2006-01-02")
	url := fmt.Sprintf("%s/v1/equity/housekeeper-estimate?from=%s&to=%s", env.srv.URL, from, to)

	resp := authedGet(t, url, env.token)
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var body struct {
		Categories []service.CategoryEstimate `json:"categories"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))

	// Only laundry should appear — sum across categories must equal exactly the
	// laundry chore's 30 min (1800 s).
	totalSeconds := int64(0)
	for _, c := range body.Categories {
		totalSeconds += c.TotalSeconds
	}
	assert.Equal(t, int64(1800), totalSeconds,
		"only categorized chores should be counted; uncategorized 60 min must be excluded")

	// And no row may have an empty/NULL category.
	for _, c := range body.Categories {
		assert.NotEmpty(t, c.Category, "category column must never be empty in response")
	}
}
