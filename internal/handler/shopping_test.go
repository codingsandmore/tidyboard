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
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/auth"
	"github.com/tidyboard/tidyboard/internal/config"
	"github.com/tidyboard/tidyboard/internal/handler"
	"github.com/tidyboard/tidyboard/internal/middleware"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

type shoppingFixture struct {
	server      *httptest.Server
	token       string
	householdID uuid.UUID
	memberID    uuid.UUID
	pool        *pgxpool.Pool
	q           *query.Queries
}

func setupShoppingFixtures(t *testing.T) shoppingFixture {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	ctx := context.Background()

	hash := "$2a$10$wIq1V7o4.LXZK5bY5b5b5OyZQZ5b5b5b5b5b5b5b5b5b5b5b5b5b"
	acc, err := q.CreateAccount(ctx, query.CreateAccountParams{
		ID:           uuid.New(),
		Email:        fmt.Sprintf("shopping-%s@test.com", uuid.New().String()),
		PasswordHash: &hash,
		IsActive:     true,
	})
	require.NoError(t, err)

	authSvc := service.NewAuthService(config.AuthConfig{JWTSecret: testutil.TestJWTSecret}, q)
	householdSvc := service.NewHouseholdService(q)
	household, err := householdSvc.Create(ctx, acc.ID, model.CreateHouseholdRequest{
		Name:     "Shopping Test Family",
		Timezone: "UTC",
	})
	require.NoError(t, err)

	memberSvc := service.NewMemberService(q, authSvc)
	member, err := memberSvc.Create(ctx, household.ID, model.CreateMemberRequest{
		Name:        "Shopping Parent",
		DisplayName: "Parent",
		Color:       "#3B82F6",
		Role:        "admin",
		AgeGroup:    "adult",
	})
	require.NoError(t, err)

	token := testutil.MakeJWT(acc.ID, household.ID, member.ID, "admin")
	shoppingSvc := service.NewShoppingService(q)
	shoppingHandler := handler.NewShoppingHandler(shoppingSvc)

	verifier, err := auth.NewVerifier(ctx, config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Post("/v1/shopping/generate", shoppingHandler.Generate)
	r.Get("/v1/shopping/current", shoppingHandler.GetCurrent)
	r.Patch("/v1/shopping/current/items/{id}", shoppingHandler.UpdateItem)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)
	return shoppingFixture{
		server:      srv,
		token:       token,
		householdID: household.ID,
		memberID:    member.ID,
		pool:        pool,
		q:           q,
	}
}

func seedShoppingRecipe(t *testing.T, fx shoppingFixture, title string, withIngredient bool) uuid.UUID {
	t.Helper()
	recipeID := uuid.New()
	_, err := fx.pool.Exec(context.Background(), `
		INSERT INTO recipes (id, household_id, title, created_by)
		VALUES ($1, $2, $3, $4)
	`, recipeID, fx.householdID, title, fx.memberID)
	require.NoError(t, err)
	if withIngredient {
		_, err = fx.pool.Exec(context.Background(), `
			INSERT INTO recipe_ingredients (recipe_id, household_id, sort_order, amount, unit, name)
			VALUES ($1, $2, 0, 2, 'lb', 'Chicken thighs')
		`, recipeID, fx.householdID)
		require.NoError(t, err)
	}
	return recipeID
}

func seedMealPlanEntry(t *testing.T, fx shoppingFixture, recipeID uuid.UUID, date string, slot string) {
	t.Helper()
	_, err := fx.pool.Exec(context.Background(), `
		INSERT INTO meal_plan_entries (household_id, recipe_id, date, slot)
		VALUES ($1, $2, $3, $4)
	`, fx.householdID, recipeID, date, slot)
	require.NoError(t, err)
}

func seedPantryStaple(t *testing.T, fx shoppingFixture) {
	t.Helper()
	_, err := fx.pool.Exec(context.Background(), `
		INSERT INTO pantry_staples (household_id, name, amount, unit, aisle)
		VALUES ($1, 'Rolled oats', 1, 'bag', 'pantry')
	`, fx.householdID)
	require.NoError(t, err)
}

func TestShoppingGenerate_Integration(t *testing.T) {
	fx := setupShoppingFixtures(t)
	recipeID := seedShoppingRecipe(t, fx, "Sheet Pan Chicken", true)
	seedMealPlanEntry(t, fx, recipeID, "2026-04-27", "dinner")
	seedPantryStaple(t, fx)

	resp := authedPost(t, fx.server.URL+"/v1/shopping/generate", fx.token, map[string]string{
		"date_from": "2026-04-27",
		"date_to":   "2026-05-03",
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusCreated, resp.StatusCode)

	var list model.ShoppingList
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&list))
	require.Len(t, list.Items, 2)
	chicken := findShoppingItem(t, list.Items, "Chicken thighs")
	assert.Equal(t, 2.0, chicken.Amount)
	assert.Equal(t, "lb", chicken.Unit)
	assert.Contains(t, chicken.SourceRecipes, "Sheet Pan Chicken")
	oats := findShoppingItem(t, list.Items, "Rolled oats")
	assert.Equal(t, 1.0, oats.Amount)
	assert.Equal(t, "bag", oats.Unit)
	assert.Equal(t, "pantry", oats.Aisle)
	assert.Contains(t, oats.SourceRecipes, "pantry staple")

	patchResp := authedPatch(t, fx.server.URL+"/v1/shopping/current/items/"+chicken.ID.String(), fx.token, map[string]bool{
		"completed": true,
	})
	defer patchResp.Body.Close()
	require.Equal(t, http.StatusOK, patchResp.StatusCode)

	regeneratedResp := authedPost(t, fx.server.URL+"/v1/shopping/generate", fx.token, map[string]string{
		"date_from": "2026-04-27",
		"date_to":   "2026-05-03",
	})
	defer regeneratedResp.Body.Close()
	require.Equal(t, http.StatusCreated, regeneratedResp.StatusCode)

	var regenerated model.ShoppingList
	require.NoError(t, json.NewDecoder(regeneratedResp.Body).Decode(&regenerated))
	regeneratedChicken := findShoppingItem(t, regenerated.Items, "Chicken thighs")
	assert.True(t, regeneratedChicken.Completed, "same-week regeneration preserves completed matching items")
}

func TestShoppingGenerateRequiresIngredientsForEveryPlannedRecipe_Integration(t *testing.T) {
	fx := setupShoppingFixtures(t)
	withIngredients := seedShoppingRecipe(t, fx, "Chicken Dinner", true)
	withoutIngredients := seedShoppingRecipe(t, fx, "Mystery Dinner", false)
	seedMealPlanEntry(t, fx, withIngredients, "2026-04-27", "dinner")
	seedMealPlanEntry(t, fx, withoutIngredients, "2026-04-28", "dinner")

	resp := authedPost(t, fx.server.URL+"/v1/shopping/generate", fx.token, map[string]string{
		"date_from": "2026-04-27",
		"date_to":   "2026-05-03",
	})
	defer resp.Body.Close()
	require.Equal(t, http.StatusUnprocessableEntity, resp.StatusCode)

	var body map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&body))
	assert.Equal(t, "missing_recipe_ingredients", body["code"])
}

func findShoppingItem(t *testing.T, items []model.ShoppingListItem, name string) model.ShoppingListItem {
	t.Helper()
	for _, item := range items {
		if item.Name == name {
			return item
		}
	}
	require.Failf(t, "missing shopping item", "item %q not found in %#v", name, items)
	return model.ShoppingListItem{}
}
