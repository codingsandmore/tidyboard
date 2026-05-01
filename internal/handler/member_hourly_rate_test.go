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

// hourlyRateFixture sets up a Flintstones-style household for the rate tests:
// Wilma (admin/owner), Fred (member/adult), Pebbles (child).
type hourlyRateFixture struct {
	householdID uuid.UUID
	wilma       query.Member
	fred        query.Member
	pebbles     query.Member
	wilmaToken  string
	fredToken   string
	pebbToken   string
}

func setupHourlyRateFixture(t *testing.T, q *query.Queries) hourlyRateFixture {
	t.Helper()
	ctx := context.Background()

	mkAccount := func(label string) query.Account {
		hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
		acc, err := q.CreateAccount(ctx, query.CreateAccountParams{
			ID:           uuid.New(),
			Email:        fmt.Sprintf("%s-%s@flintstones.test", label, uuid.New().String()),
			PasswordHash: &hash,
			IsActive:     true,
		})
		require.NoError(t, err)
		return acc
	}

	wilmaAcc := mkAccount("wilma")
	fredAcc := mkAccount("fred")
	pebbAcc := mkAccount("pebbles")

	hh, err := q.CreateHousehold(ctx, query.CreateHouseholdParams{
		ID:         uuid.New(),
		Name:       "Flintstones",
		Timezone:   "UTC",
		Settings:   []byte("{}"),
		CreatedBy:  wilmaAcc.ID,
		InviteCode: uuid.New().String(),
	})
	require.NoError(t, err)

	mkMember := func(acc query.Account, name, role, ageGroup string) query.Member {
		accID := uuid.NullUUID{UUID: acc.ID, Valid: true}
		m, err := q.CreateMember(ctx, query.CreateMemberParams{
			ID:                      uuid.New(),
			HouseholdID:             hh.ID,
			AccountID:               &accID,
			Name:                    name,
			DisplayName:             name,
			Color:                   "#FF0000",
			AvatarUrl:               "",
			Role:                    role,
			AgeGroup:                ageGroup,
			EmergencyInfo:           []byte("{}"),
			NotificationPreferences: []byte("{}"),
		})
		require.NoError(t, err)
		return m
	}

	wilma := mkMember(wilmaAcc, "Wilma", "admin", "adult")
	fred := mkMember(fredAcc, "Fred", "member", "adult")
	pebbles := mkMember(pebbAcc, "Pebbles", "child", "child")

	return hourlyRateFixture{
		householdID: hh.ID,
		wilma:       wilma,
		fred:        fred,
		pebbles:     pebbles,
		wilmaToken:  testutil.MakeJWT(wilmaAcc.ID, hh.ID, wilma.ID, "admin"),
		fredToken:   testutil.MakeJWT(fredAcc.ID, hh.ID, fred.ID, "member"),
		pebbToken:   testutil.MakeJWT(pebbAcc.ID, hh.ID, pebbles.ID, "child"),
	}
}

func newHourlyRateRouter(t *testing.T, q *query.Queries) http.Handler {
	t.Helper()
	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	memberSvc := service.NewMemberService(q, authSvc)
	memberH := handler.NewMemberHandler(memberSvc)

	r := chi.NewRouter()
	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r.Use(middleware.Auth(verifier, q))
	r.Get("/v1/households/{id}/members/{memberID}", memberH.Get)
	r.Patch("/v1/households/{id}/members/{memberID}", memberH.Update)
	return r
}

func patchMember(t *testing.T, srv *httptest.Server, token, householdID, memberID string, body any) *http.Response {
	t.Helper()
	b, err := json.Marshal(body)
	require.NoError(t, err)
	req, err := http.NewRequest(http.MethodPatch,
		fmt.Sprintf("%s/v1/households/%s/members/%s", srv.URL, householdID, memberID),
		bytes.NewReader(b))
	require.NoError(t, err)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func getMember(t *testing.T, srv *httptest.Server, token, householdID, memberID string) *http.Response {
	t.Helper()
	req, err := http.NewRequest(http.MethodGet,
		fmt.Sprintf("%s/v1/households/%s/members/%s", srv.URL, householdID, memberID),
		nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)
	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	return resp
}

func TestHourlyRate_SelfCanSet(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	fx := setupHourlyRateFixture(t, q)
	srv := httptest.NewServer(newHourlyRateRouter(t, q))
	t.Cleanup(srv.Close)

	min := int32(2500)
	max := int32(5000)
	resp := patchMember(t, srv, fx.fredToken, fx.householdID.String(), fx.fred.ID.String(),
		map[string]any{"hourly_rate_cents_min": min, "hourly_rate_cents_max": max})
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var got map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&got))
	assert.EqualValues(t, 2500, got["hourly_rate_cents_min"])
	assert.EqualValues(t, 5000, got["hourly_rate_cents_max"])

	// Persisted in DB.
	row, err := q.GetMember(context.Background(), query.GetMemberParams{
		ID: fx.fred.ID, HouseholdID: fx.householdID,
	})
	require.NoError(t, err)
	require.NotNil(t, row.HourlyRateCentsMin)
	require.NotNil(t, row.HourlyRateCentsMax)
	assert.Equal(t, int32(2500), *row.HourlyRateCentsMin)
	assert.Equal(t, int32(5000), *row.HourlyRateCentsMax)
}

func TestHourlyRate_AdminCanSet(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	fx := setupHourlyRateFixture(t, q)
	srv := httptest.NewServer(newHourlyRateRouter(t, q))
	t.Cleanup(srv.Close)

	min := int32(3000)
	max := int32(6000)
	resp := patchMember(t, srv, fx.wilmaToken, fx.householdID.String(), fx.fred.ID.String(),
		map[string]any{"hourly_rate_cents_min": min, "hourly_rate_cents_max": max})
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	row, err := q.GetMember(context.Background(), query.GetMemberParams{
		ID: fx.fred.ID, HouseholdID: fx.householdID,
	})
	require.NoError(t, err)
	require.NotNil(t, row.HourlyRateCentsMin)
	assert.Equal(t, int32(3000), *row.HourlyRateCentsMin)
	assert.Equal(t, int32(6000), *row.HourlyRateCentsMax)
}

func TestHourlyRate_KidCannotSet(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	fx := setupHourlyRateFixture(t, q)
	srv := httptest.NewServer(newHourlyRateRouter(t, q))
	t.Cleanup(srv.Close)

	min := int32(9999)
	max := int32(99999)
	resp := patchMember(t, srv, fx.pebbToken, fx.householdID.String(), fx.fred.ID.String(),
		map[string]any{"hourly_rate_cents_min": min, "hourly_rate_cents_max": max})
	defer resp.Body.Close()
	assert.Equal(t, http.StatusForbidden, resp.StatusCode)

	// Side-effect must not have persisted.
	row, err := q.GetMember(context.Background(), query.GetMemberParams{
		ID: fx.fred.ID, HouseholdID: fx.householdID,
	})
	require.NoError(t, err)
	assert.Nil(t, row.HourlyRateCentsMin)
	assert.Nil(t, row.HourlyRateCentsMax)
}

func TestHourlyRate_KidCannotRead(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	fx := setupHourlyRateFixture(t, q)

	// Seed a rate on Fred so the kid would have something to read if not redacted.
	min := int32(2500)
	max := int32(5000)
	_, err := q.UpdateMemberHourlyRate(context.Background(), query.UpdateMemberHourlyRateParams{
		ID:                 fx.fred.ID,
		HouseholdID:        fx.householdID,
		HourlyRateCentsMin: &min,
		HourlyRateCentsMax: &max,
	})
	require.NoError(t, err)

	srv := httptest.NewServer(newHourlyRateRouter(t, q))
	t.Cleanup(srv.Close)

	// Pebbles (child) reading Fred's record — both rate fields MUST be omitted.
	resp := getMember(t, srv, fx.pebbToken, fx.householdID.String(), fx.fred.ID.String())
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var got map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&got))
	_, hasMin := got["hourly_rate_cents_min"]
	_, hasMax := got["hourly_rate_cents_max"]
	assert.False(t, hasMin, "non-admin viewer must NOT see hourly_rate_cents_min")
	assert.False(t, hasMax, "non-admin viewer must NOT see hourly_rate_cents_max")

	// Sanity: Wilma (admin) sees them.
	resp2 := getMember(t, srv, fx.wilmaToken, fx.householdID.String(), fx.fred.ID.String())
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)
	var adminGot map[string]any
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&adminGot))
	assert.EqualValues(t, 2500, adminGot["hourly_rate_cents_min"])
	assert.EqualValues(t, 5000, adminGot["hourly_rate_cents_max"])

	// Sanity: Fred (self) sees them too.
	resp3 := getMember(t, srv, fx.fredToken, fx.householdID.String(), fx.fred.ID.String())
	defer resp3.Body.Close()
	require.Equal(t, http.StatusOK, resp3.StatusCode)
	var selfGot map[string]any
	require.NoError(t, json.NewDecoder(resp3.Body).Decode(&selfGot))
	assert.EqualValues(t, 2500, selfGot["hourly_rate_cents_min"])
}

func TestHourlyRate_RangeValidation(t *testing.T) {
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	fx := setupHourlyRateFixture(t, q)
	srv := httptest.NewServer(newHourlyRateRouter(t, q))
	t.Cleanup(srv.Close)

	min := int32(7000)
	max := int32(5000) // min > max — must reject with 400
	resp := patchMember(t, srv, fx.fredToken, fx.householdID.String(), fx.fred.ID.String(),
		map[string]any{"hourly_rate_cents_min": min, "hourly_rate_cents_max": max})
	defer resp.Body.Close()
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Side-effect must not have persisted.
	row, err := q.GetMember(context.Background(), query.GetMemberParams{
		ID: fx.fred.ID, HouseholdID: fx.householdID,
	})
	require.NoError(t, err)
	assert.Nil(t, row.HourlyRateCentsMin)
	assert.Nil(t, row.HourlyRateCentsMax)
}
