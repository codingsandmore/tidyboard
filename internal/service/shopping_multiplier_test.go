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

// TestShoppingMultiplier_ScalesIngredientQuantities locks in the section B.2.e
// behaviour of the meal-plan / shopping-list pipeline: when a meal plan entry
// has serving_multiplier=2.5 (and batch_quantity defaulted to 1), the recipe
// ingredient amount must be multiplied through to the generated shopping list.
//
// Recipe: 2 cups flour @ 1 serving.
// Plan:   one entry with serving_multiplier = 2.5.
// Expect: shopping list contains a "Flour" line item at quantity 5 cups.
func TestShoppingMultiplier_ScalesIngredientQuantities(t *testing.T) {
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
		creatorAccountID, fmt.Sprintf("multiplier-%s@test.local", creatorAccountID),
	)
	require.NoError(t, err)

	householdID := uuid.New()
	inviteCode := fmt.Sprintf("MULT%s", uuid.New().String()[:4])
	_, err = pool.Exec(ctx,
		`INSERT INTO households (id, name, timezone, invite_code, created_by) VALUES ($1, 'Multiplier Test', 'UTC', $2, $3)`,
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

	// ── Seed meal-plan entry with serving_multiplier = 2.5. ───────────────
	// batch_quantity is set explicitly to 1 (the DB default) for clarity.
	plannedDate := "2026-05-04"
	_, err = pool.Exec(ctx, `
		INSERT INTO meal_plan_entries (id, household_id, recipe_id, date, slot, serving_multiplier, batch_quantity)
		VALUES (gen_random_uuid(), $1, $2, $3, 'breakfast', 2.5, 1)
	`, householdID, recipeID, plannedDate)
	require.NoError(t, err)

	// ── Generate the shopping list over a window covering plannedDate. ────
	svc := service.NewShoppingService(q)
	list, err := svc.Generate(ctx, householdID, model.GenerateShoppingListRequest{
		DateFrom: "2026-05-01",
		DateTo:   "2026-05-07",
	})
	require.NoError(t, err)
	require.NotNil(t, list)

	// ── Expect: one line item, "Flour", quantity 5 (= 2 * 2.5 * 1). ───────
	require.Len(t, list.Items, 1, "expected exactly one shopping list item")
	flour := list.Items[0]
	assert.Equal(t, "Flour", flour.Name)
	assert.Equal(t, "cup", flour.Unit)
	assert.InDelta(t, 5.0, flour.Amount, 1e-9,
		"shopping list must scale ingredient by serving_multiplier × batch_quantity (got %v cups, want 5)", flour.Amount)
}
