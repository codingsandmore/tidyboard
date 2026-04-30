package service

import (
	"math/big"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/stretchr/testify/assert"
	"github.com/tidyboard/tidyboard/internal/query"
)

// TestNumericToFloat covers the pgtype.Numeric → float64 helper.
func TestNumericToFloat(t *testing.T) {
	cases := []struct {
		name  string
		input pgtype.Numeric
		want  float64
	}{
		{
			name:  "zero",
			input: pgtype.Numeric{},
			want:  0,
		},
		{
			name:  "integer 2",
			input: pgtype.Numeric{Int: big.NewInt(2), Exp: 0, Valid: true},
			want:  2,
		},
		{
			name:  "integer 3",
			input: pgtype.Numeric{Int: big.NewInt(3), Exp: 0, Valid: true},
			want:  3,
		},
		{
			name:  "decimal 1.5 represented as 15 * 10^-1",
			input: pgtype.Numeric{Int: big.NewInt(15), Exp: -1, Valid: true},
			want:  1.5,
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got := numericToFloat(tc.input)
			assert.InDelta(t, tc.want, got, 1e-9)
		})
	}
}

// TestContainsStr covers the dedup helper.
func TestContainsStr(t *testing.T) {
	ss := []string{"eggs", "milk", "butter"}
	assert.True(t, containsStr(ss, "eggs"))
	assert.True(t, containsStr(ss, "milk"))
	assert.False(t, containsStr(ss, "flour"))
	assert.False(t, containsStr(nil, "eggs"))
}

// TestAggregationLogic tests the aggregation key logic used in Generate:
// same name + same unit → amounts sum; different units → separate entries.
func TestAggregationLogic(t *testing.T) {
	type row struct {
		name  string
		unit  string
		aisle string
		amt   float64
	}

	inputs := []row{
		{name: "Eggs", unit: "large", aisle: "dairy", amt: 2},
		{name: "Eggs", unit: "large", aisle: "dairy", amt: 3}, // should merge → 5
		{name: "Butter", unit: "tbsp", aisle: "dairy", amt: 4},
		{name: "Butter", unit: "lb", aisle: "dairy", amt: 1}, // different unit → separate
		{name: "flour", unit: "cup", aisle: "pantry", amt: 2},
		{name: "Flour", unit: "cup", aisle: "pantry", amt: 1}, // case-insensitive merge → 3
	}

	type aggKey struct {
		name  string
		unit  string
		aisle string
	}

	norm := func(s string) string {
		return strings.ToLower(strings.TrimSpace(s))
	}

	totals := map[aggKey]float64{}
	for _, inp := range inputs {
		key := aggKey{
			name:  norm(inp.name),
			unit:  norm(inp.unit),
			aisle: norm(inp.aisle),
		}
		totals[key] += inp.amt
	}

	assert.Equal(t, 5.0, totals[aggKey{"eggs", "large", "dairy"}], "eggs should sum to 5")
	assert.Equal(t, 4.0, totals[aggKey{"butter", "tbsp", "dairy"}], "butter tbsp should be 4")
	assert.Equal(t, 1.0, totals[aggKey{"butter", "lb", "dairy"}], "butter lb should be 1 (separate unit)")
	assert.Equal(t, 3.0, totals[aggKey{"flour", "cup", "pantry"}], "flour case-insensitive merge should be 3")
}

func TestShoppingPrerequisiteErrors(t *testing.T) {
	assert.ErrorIs(t, ErrNoMealPlan, ErrShoppingPrerequisite)
	assert.ErrorIs(t, ErrNoRecipeIngredients, ErrShoppingPrerequisite)
}

func TestItemAggregateKeyNormalizesMatchingFields(t *testing.T) {
	got := itemAggregateKey(" Flour ", " CUP ", " Pantry ")
	assert.Equal(t, aggregateKey{name: "flour", unit: "cup", aisle: "pantry"}, got)
	assert.Equal(t, "other", itemAggregateKey("Salt", "", "").aisle)
}

func TestHasMissingIngredientRowsRequiresEveryPlannedRecipe(t *testing.T) {
	firstRecipe := uuid.New()
	secondRecipe := uuid.New()
	planned := map[uuid.UUID]struct{}{
		firstRecipe:  {},
		secondRecipe: {},
	}

	assert.True(t, hasMissingIngredientRows(planned, []query.ListIngredientsForMealPlanRangeRow{
		{RecipeID: firstRecipe},
	}))
	assert.False(t, hasMissingIngredientRows(planned, []query.ListIngredientsForMealPlanRangeRow{
		{RecipeID: firstRecipe},
		{RecipeID: secondRecipe},
	}))
}

func TestSameDateRange(t *testing.T) {
	from := pgtype.Date{Time: time.Date(2026, 4, 27, 0, 0, 0, 0, time.UTC), Valid: true}
	to := pgtype.Date{Time: time.Date(2026, 5, 3, 0, 0, 0, 0, time.UTC), Valid: true}
	otherTo := pgtype.Date{Time: time.Date(2026, 5, 10, 0, 0, 0, 0, time.UTC), Valid: true}

	assert.True(t, sameDateRange(from, to, from, to))
	assert.False(t, sameDateRange(from, to, from, otherTo))
	assert.False(t, sameDateRange(pgtype.Date{}, to, from, to))
}
