package model

import (
	"time"

	"github.com/google/uuid"
)

// MealPlanEntry is one slot in a household's meal plan.
type MealPlanEntry struct {
	ID          uuid.UUID  `json:"id"`
	HouseholdID uuid.UUID  `json:"household_id"`
	RecipeID    *uuid.UUID `json:"recipe_id,omitempty"`
	Date        string     `json:"date"` // YYYY-MM-DD
	Slot        string     `json:"slot"` // breakfast | lunch | dinner | snack
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// UpsertMealPlanRequest is the payload for POST /v1/meal-plan.
type UpsertMealPlanRequest struct {
	RecipeID *uuid.UUID `json:"recipe_id,omitempty"`
	Date     string     `json:"date"` // YYYY-MM-DD
	Slot     string     `json:"slot"` // breakfast | lunch | dinner | snack
}
