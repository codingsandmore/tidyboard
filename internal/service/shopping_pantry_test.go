//go:build integration

package service_test

import (
	"context"
	"fmt"
	"testing"

	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
	"github.com/tidyboard/tidyboard/internal/service"
	"github.com/tidyboard/tidyboard/internal/testutil"
)

// TestPantrySync_AppendsStaplesToShoppingList locks in the section B.2.g
// behaviour of the pantry-staples → shopping-list pipeline.
//
// Schema intent (migrations/20260425000020_shopping.sql):
//
//	"Pantry staples: items always added to every generated shopping list"
//
// The current ShoppingService.Generate logic (internal/service/shopping.go,
// the staple-append loop after the recipe aggregation) does NOT exclude or
// reduce staples — it APPENDS each staple to the generated list, merging
// with any matching recipe ingredient (same name+unit+aisle) by summing
// amounts. This test pins that behaviour so future refactors that try to
// "filter staples out" trip a red signal here first.
//
// Layout:
//
//	Recipe:  Pancakes — 2 cups flour @ 1 serving.
//	Plan:    one entry on 2026-05-04, no multiplier (defaults to 1×1).
//	Pantry:  "Salt" 1 tsp (aisle "pantry") — distinct from recipe rows.
//
// Expect: shopping list contains BOTH "Flour" (from recipe) and "Salt"
// (from pantry staple). The staple is appended with source_recipes set
// to ["pantry staple"].
func TestPantrySync_AppendsStaplesToShoppingList(t *testing.T) {
	if testing.Short() {
		t.Skip("integration: requires TIDYBOARD_TEST_DSN")
	}

	pool := testutil.SetupTestDB(t)
	q := query.New(pool)
	ctx := context.Background()

	// ── Seed account + household + adult member (creator). ────────────────
	creatorAccountID := uuid.New()
	_, err := pool.Exec(ctx,
		`INSERT INTO accounts (id, email, password_hash) VALUES ($1, $2, 'x') ON CONFLICT DO NOTHING`,
		creatorAccountID, fmt.Sprintf("pantry-%s@test.local", creatorAccountID),
	)
	require.NoError(t, err)

	householdID := uuid.New()
	inviteCode := fmt.Sprintf("PNTR%s", uuid.New().String()[:4])
	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Pantry Test', 'UTC', $2, $3)`,
		householdID, inviteCode, creatorAccountID,
	)
	require.NoError(t, err)

	memberID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO members (id, household_id, account_id, name, display_name, role) VALUES ($1, $2, $3, 'Cook', 'Cook', 'admin')`,
		memberID, householdID, creatorAccountID,
	)
	require.NoError(t, err)

	t.Cleanup(func() {
		bg := context.Background()
		_, _ = pool.Exec(bg, `DELETE FROM shopping_list_items WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM shopping_lists WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM pantry_staples WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM meal_plan_entries WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM recipe_ingredients WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM recipes WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM members WHERE household_id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM households WHERE id = $1`, householdID)
		_, _ = pool.Exec(bg, `DELETE FROM accounts WHERE id = $1`, creatorAccountID)
	})

	// ── Seed recipe with one ingredient: 2 cups flour. ────────────────────
	recipeID := uuid.New()
	_, err = pool.Exec(ctx,
		`INSERT INTO recipes (id, household_id, title, created_by) VALUES ($1, $2, 'Pancakes', $3)`,
		recipeID, householdID, memberID,
	)
	require.NoError(t, err)

	_, err = pool.Exec(ctx, `
		INSERT INTO recipe_ingredients (id, recipe_id, household_id, sort_order, amount, unit, name)
		VALUES (gen_random_uuid(), $1, $2, 0, 2, 'cup', 'Flour')
	`, recipeID, householdID)
	require.NoError(t, err)

	// ── Seed meal-plan entry (default 1× multiplier). ─────────────────────
	plannedDate := "2026-05-04"
	_, err = pool.Exec(ctx, `
		INSERT INTO meal_plan_entries (id, household_id, recipe_id, date, slot, serving_multiplier, batch_quantity)
		VALUES (gen_random_uuid(), $1, $2, $3, 'breakfast', 1, 1)
	`, householdID, recipeID, plannedDate)
	require.NoError(t, err)

	// ── Seed pantry staple: 1 tsp salt in aisle "pantry". ─────────────────
	// This staple shares no ingredient with the recipe, so it must appear
	// as its own line item on the generated shopping list.
	stapleID := uuid.New()
	_, err = pool.Exec(ctx, `
		INSERT INTO pantry_staples (id, household_id, name, amount, unit, aisle)
		VALUES ($1, $2, 'Salt', 1, 'tsp', 'pantry')
	`, stapleID, householdID)
	require.NoError(t, err)

	// ── Generate the shopping list over a window covering plannedDate. ────
	svc := service.NewShoppingService(q)
	list, err := svc.Generate(ctx, householdID, model.GenerateShoppingListRequest{
		DateFrom: "2026-05-01",
		DateTo:   "2026-05-07",
	})
	require.NoError(t, err)
	require.NotNil(t, list)

	// ── Expect: TWO line items — recipe ingredient + pantry staple. ───────
	// The pantry staple is APPENDED, not excluded or used to reduce the
	// recipe row's amount. Lock that in.
	require.Len(t, list.Items, 2,
		"expected recipe ingredient AND pantry staple on the generated list (got %d)", len(list.Items))

	byName := map[string]model.ShoppingListItem{}
	for _, it := range list.Items {
		byName[it.Name] = it
	}

	flour, ok := byName["Flour"]
	require.True(t, ok, "shopping list must contain the recipe ingredient 'Flour'")
	assert.Equal(t, "cup", flour.Unit)
	assert.InDelta(t, 2.0, flour.Amount, 1e-9, "flour amount = recipe amount × 1×1")

	salt, ok := byName["Salt"]
	require.True(t, ok,
		"pantry staple 'Salt' must be appended to the generated shopping list "+
			"(schema comment: 'items always added to every generated shopping list')")
	assert.Equal(t, "tsp", salt.Unit)
	assert.Equal(t, "pantry", salt.Aisle)
	assert.InDelta(t, 1.0, salt.Amount, 1e-9, "pantry staple amount preserved")
	assert.Contains(t, salt.SourceRecipes, "pantry staple",
		"pantry staples are tagged with 'pantry staple' as their source recipe")
}
