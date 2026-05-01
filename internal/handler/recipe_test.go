//go:build integration

package handler_test

import (
	"context"
	"encoding/json"
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

// setupRecipeGetHandler wires the GET /v1/recipes/{id} route against a real DB
// with auth middleware and seeds a household + member that owns the recipe
// rows the test inserts. Returns the test server, JWT, and the household/
// member UUIDs so the test can insert recipe + ingredient + step rows.
func setupRecipeGetHandler(t *testing.T) (*httptest.Server, string, uuid.UUID, uuid.UUID) {
	t.Helper()
	pool := testutil.SetupTestDB(t)
	q := query.New(pool)

	recipeSvc := service.NewRecipeService(q, nil)
	h := handler.NewRecipeHandler(recipeSvc)

	verifier, err := auth.NewVerifier(context.Background(), config.AuthConfig{JWTSecret: testutil.TestJWTSecret})
	require.NoError(t, err)
	r := chi.NewRouter()
	r.Use(middleware.Auth(verifier, q))
	r.Get("/v1/recipes/{id}", h.Get)

	srv := httptest.NewServer(r)
	t.Cleanup(srv.Close)

	ctx := context.Background()
	accountID := uuid.New()
	householdID := uuid.New()
	memberID := uuid.New()

	_, err = pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		accountID, "recipe-get-"+accountID.String()+"@example.com",
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Recipe Get Test', 'UTC', $2, $3)`,
		householdID, "G"+householdID.String()[:7], accountID,
	)
	require.NoError(t, err)
	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role, age_group) VALUES ($1, $2, $3, 'Tester', 'Tester', 'admin', 'adult')`,
		memberID, householdID, accountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bgCtx := context.Background()
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_ingredients WHERE recipe_id IN (SELECT id FROM recipes WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipe_steps WHERE recipe_id IN (SELECT id FROM recipes WHERE household_id = $1)`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM recipes WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM members WHERE id = $1`, memberID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bgCtx, `DELETE FROM accounts WHERE id = $1`, accountID)
	})

	token := testutil.MakeJWT(accountID, householdID, memberID, "admin")

	return srv, token, householdID, memberID
}

// TestRecipeGet_IncludesIngredientsAndSteps_Integration is the contract test
// for issue #109: GET /v1/recipes/{id} must return the recipe together with
// its full ingredient + step lists, ordered by sort_order.
func TestRecipeGet_IncludesIngredientsAndSteps_Integration(t *testing.T) {
	apiSrv, token, householdID, memberID := setupRecipeGetHandler(t)

	pool := testutil.SetupTestDB(t)

	ctx := context.Background()
	recipeID := uuid.New()
	_, err := pool.Exec(ctx,
		`INSERT INTO recipes (id, household_id, title, created_by) VALUES ($1, $2, $3, $4)`,
		recipeID, householdID, "Tomato Pasta", memberID,
	)
	require.NoError(t, err)

	// Insert two ingredients in non-sequential sort_order to validate ORDER BY.
	_, err = pool.Exec(ctx,
		`INSERT INTO recipe_ingredients (recipe_id, household_id, sort_order, amount, unit, name) VALUES
		 ($1, $2, 1, 4, 'cloves', 'garlic'),
		 ($1, $2, 0, 1, 'lb', 'spaghetti')`,
		recipeID, householdID,
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx,
		`INSERT INTO recipe_steps (recipe_id, household_id, sort_order, text) VALUES
		 ($1, $2, 1, 'Cook pasta until al dente.'),
		 ($1, $2, 0, 'Boil water in a large pot.')`,
		recipeID, householdID,
	)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodGet, apiSrv.URL+"/v1/recipes/"+recipeID.String(), nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))
	assert.Equal(t, "Tomato Pasta", result["title"])

	ings, ok := result["ingredients"].([]any)
	require.True(t, ok, "expected ingredients array in response, got: %T", result["ingredients"])
	require.Len(t, ings, 2)
	first := ings[0].(map[string]any)
	assert.Equal(t, "spaghetti", first["name"], "ingredients should be ordered by sort_order asc")

	steps, ok := result["steps"].([]any)
	require.True(t, ok, "expected steps array in response, got: %T", result["steps"])
	require.Len(t, steps, 2)
	firstStep := steps[0].(map[string]any)
	assert.Equal(t, "Boil water in a large pot.", firstStep["text"], "steps should be ordered by sort_order asc")
}

// TestRecipeGet_NoIngredientsOrSteps_Integration covers the empty-state path:
// a recipe without any ingredient/step rows must still respond 200 with empty
// arrays so the frontend renders the empty-state copy gracefully.
func TestRecipeGet_NoIngredientsOrSteps_Integration(t *testing.T) {
	apiSrv, token, householdID, memberID := setupRecipeGetHandler(t)

	pool := testutil.SetupTestDB(t)
	ctx := context.Background()
	recipeID := uuid.New()
	_, err := pool.Exec(ctx,
		`INSERT INTO recipes (id, household_id, title, created_by) VALUES ($1, $2, $3, $4)`,
		recipeID, householdID, "Bare Recipe", memberID,
	)
	require.NoError(t, err)

	req, err := http.NewRequest(http.MethodGet, apiSrv.URL+"/v1/recipes/"+recipeID.String(), nil)
	require.NoError(t, err)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	require.NoError(t, err)
	defer resp.Body.Close()

	require.Equal(t, http.StatusOK, resp.StatusCode)

	var result map[string]any
	require.NoError(t, json.NewDecoder(resp.Body).Decode(&result))

	ings, ok := result["ingredients"].([]any)
	require.True(t, ok, "expected ingredients array (possibly empty) in response, got: %T", result["ingredients"])
	assert.Len(t, ings, 0)

	steps, ok := result["steps"].([]any)
	require.True(t, ok, "expected steps array (possibly empty) in response, got: %T", result["steps"])
	assert.Len(t, steps, 0)
}
