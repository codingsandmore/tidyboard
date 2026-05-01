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
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// chorePetsFixture captures everything needed for a chore_pets integration
// test: a running httptest server, a JWT scoped as admin in the household,
// and the IDs of the seeded chore + pets used by each subtest.
type chorePetsFixture struct {
	srv         *httptest.Server
	token       string
	householdID uuid.UUID
	choreID     uuid.UUID
	petA        uuid.UUID
	petB        uuid.UUID
	otherPet    uuid.UUID // pet in a *different* household
	notAPet     uuid.UUID // member with role=child in the same household
}

func setupChorePetsFixture(t *testing.T) chorePetsFixture {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	ctx := context.Background()

	// Account + household + admin member.
	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	acc, err := q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("chorepets-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	hhSvc := service.NewHouseholdService(q)
	hh, err := hhSvc.Create(ctx, acc.ID, model.CreateHouseholdRequest{
		Name:     "Chore Pets Test",
		Timezone: "UTC",
	})
	require.NoError(t, err)

	memberSvc := service.NewMemberService(q, authSvc)
	admin, err := memberSvc.Create(ctx, hh.ID, model.CreateMemberRequest{
		Name: "Admin", DisplayName: "A", Color: "#fff", Role: "admin", AgeGroup: "adult",
	})
	require.NoError(t, err)

	// Two pets in this household.
	petA, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID: uuid.New(), HouseholdID: hh.ID,
		Name: "Pet A", DisplayName: "PA", Color: "#aaa",
		Role: "pet", AgeGroup: "pet",
		EmergencyInfo: []byte("{}"), NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)
	petB, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID: uuid.New(), HouseholdID: hh.ID,
		Name: "Pet B", DisplayName: "PB", Color: "#bbb",
		Role: "pet", AgeGroup: "pet",
		EmergencyInfo: []byte("{}"), NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	// A non-pet member in the same household — must be rejected.
	child, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID: uuid.New(), HouseholdID: hh.ID,
		Name: "Kid", DisplayName: "K", Color: "#ccc",
		Role: "child", AgeGroup: "child",
		EmergencyInfo: []byte("{}"), NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	// A second household with its own pet — must be rejected (cross-household).
	hh2, err := hhSvc.Create(ctx, acc.ID, model.CreateHouseholdRequest{
		Name: "Other Household", Timezone: "UTC",
	})
	require.NoError(t, err)
	otherPet, err := q.CreateMember(ctx, query.CreateMemberParams{
		ID: uuid.New(), HouseholdID: hh2.ID,
		Name: "Other Pet", DisplayName: "OP", Color: "#ddd",
		Role: "pet", AgeGroup: "pet",
		EmergencyInfo: []byte("{}"), NotificationPreferences: []byte("{}"),
	})
	require.NoError(t, err)

	// Seed a chore in the primary household assigned to the admin member.
	choreSvc := service.NewChoreService(q, nil, nil, nil)
	chore, err := choreSvc.Create(ctx, hh.ID, service.ChoreCreateInput{
		MemberID:      admin.ID,
		Name:          "Feed pets",
		Weight:        3,
		FrequencyKind: "daily",
		AutoApprove:   true,
	})
	require.NoError(t, err)

	// Build router with auth middleware so JWT routing works end-to-end.
	bc := broadcast.NewMemoryBroadcaster()
	auditSvc := service.NewAuditService(q)
	choreSvcReal := service.NewChoreService(q, nil, bc, auditSvc)
	chorePetsSvc := service.NewChorePetsService(q)
	choreH := handler.NewChoreHandler(choreSvcReal, q)
	cpH := handler.NewChorePetsHandler(chorePetsSvc)

	verifier, err := auth.NewVerifier(ctx, config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)

	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Get("/v1/chores", choreH.List)
	r.Get("/v1/chores/{id}/pets", cpH.List)
	r.Post("/v1/chores/{id}/pets", cpH.Set)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	token := testutil.MakeJWT(acc.ID, hh.ID, admin.ID, "admin")

	return chorePetsFixture{
		srv: srv, token: token, householdID: hh.ID, choreID: chore.ID,
		petA: petA.ID, petB: petB.ID, otherPet: otherPet.ID, notAPet: child.ID,
	}
}

// TestChorePets_Replace verifies the replace-set semantics:
//
//   - First POST sets {petA, petB}; GET returns both.
//   - Second POST sets {petA}; GET returns only petA (petB was removed).
//   - Empty array clears all.
func TestChorePets_Replace(t *testing.T) {
	fx := setupChorePetsFixture(t)

	url := fmt.Sprintf("%s/v1/chores/%s/pets", fx.srv.URL, fx.choreID)

	// Replace 1: link both pets.
	resp := authedPost(t, url, fx.token, map[string]any{
		"pet_member_ids": []string{fx.petA.String(), fx.petB.String()},
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusOK, resp.StatusCode)

	var setBody struct {
		ChoreID      string   `json:"chore_id"`
		PetMemberIDs []string `json:"pet_member_ids"`
	}
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&setBody))
	assert.Equal(t, fx.choreID.String(), setBody.ChoreID)
	assert.ElementsMatch(t, []string{fx.petA.String(), fx.petB.String()}, setBody.PetMemberIDs)

	// GET returns both.
	resp2 := authedGet(t, url, fx.token)
	defer resp2.Body.Close()
	require.Equal(t, http.StatusOK, resp2.StatusCode)
	var listBody struct {
		PetMemberIDs []string `json:"pet_member_ids"`
	}
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&listBody))
	assert.ElementsMatch(t, []string{fx.petA.String(), fx.petB.String()}, listBody.PetMemberIDs)

	// Replace 2: shrink to {petA}.
	resp3 := authedPost(t, url, fx.token, map[string]any{
		"pet_member_ids": []string{fx.petA.String()},
	})
	defer resp3.Body.Close()
	require.Equal(t, http.StatusOK, resp3.StatusCode)

	resp4 := authedGet(t, url, fx.token)
	defer resp4.Body.Close()
	var listBody2 struct {
		PetMemberIDs []string `json:"pet_member_ids"`
	}
	require.NoError(t, json.NewDecoder(resp4.Body).Decode(&listBody2))
	assert.Equal(t, []string{fx.petA.String()}, listBody2.PetMemberIDs)

	// Replace 3: empty array clears all links.
	resp5 := authedPost(t, url, fx.token, map[string]any{"pet_member_ids": []string{}})
	defer resp5.Body.Close()
	require.Equal(t, http.StatusOK, resp5.StatusCode)

	resp6 := authedGet(t, url, fx.token)
	defer resp6.Body.Close()
	var listBody3 struct {
		PetMemberIDs []string `json:"pet_member_ids"`
	}
	require.NoError(t, json.NewDecoder(resp6.Body).Decode(&listBody3))
	assert.Equal(t, []string{}, listBody3.PetMemberIDs)
}

// TestChorePets_RejectsNonPetMember verifies that a member whose role is not
// "pet" is rejected with 400 and that the chore_pets table is not mutated.
func TestChorePets_RejectsNonPetMember(t *testing.T) {
	fx := setupChorePetsFixture(t)

	url := fmt.Sprintf("%s/v1/chores/%s/pets", fx.srv.URL, fx.choreID)

	// First, link petA to establish a known state.
	resp0 := authedPost(t, url, fx.token, map[string]any{"pet_member_ids": []string{fx.petA.String()}})
	defer resp0.Body.Close()
	require.Equal(t, http.StatusOK, resp0.StatusCode)

	// Now try to add a non-pet (the child member). Service must reject.
	resp := authedPost(t, url, fx.token, map[string]any{
		"pet_member_ids": []string{fx.petA.String(), fx.notAPet.String()},
	})
	defer resp.Body.Close()
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// State must be unchanged (still only petA).
	resp2 := authedGet(t, url, fx.token)
	defer resp2.Body.Close()
	var body struct {
		PetMemberIDs []string `json:"pet_member_ids"`
	}
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&body))
	assert.Equal(t, []string{fx.petA.String()}, body.PetMemberIDs)
}

// TestChorePets_CrossHouseholdRejected verifies that a pet that lives in a
// different household cannot be linked to this household's chore.
func TestChorePets_CrossHouseholdRejected(t *testing.T) {
	fx := setupChorePetsFixture(t)

	url := fmt.Sprintf("%s/v1/chores/%s/pets", fx.srv.URL, fx.choreID)

	resp := authedPost(t, url, fx.token, map[string]any{
		"pet_member_ids": []string{fx.otherPet.String()},
	})
	defer resp.Body.Close()
	assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

	// Confirm nothing was inserted.
	resp2 := authedGet(t, url, fx.token)
	defer resp2.Body.Close()
	var body struct {
		PetMemberIDs []string `json:"pet_member_ids"`
	}
	require.NoError(t, json.NewDecoder(resp2.Body).Decode(&body))
	assert.Equal(t, []string{}, body.PetMemberIDs)
}
