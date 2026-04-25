package model

import (
	"time"

	"github.com/google/uuid"
)

// RecipeCollection groups recipes for a household.
type RecipeCollection struct {
	ID          uuid.UUID `json:"id"`
	HouseholdID uuid.UUID `json:"household_id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	SortOrder   int       `json:"sort_order"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// CreateRecipeCollectionRequest is the payload for POST /v1/recipe-collections.
type CreateRecipeCollectionRequest struct {
	Name      string `json:"name"       validate:"required,min=1,max=200"`
	SortOrder int    `json:"sort_order"`
}

// UpdateRecipeCollectionRequest is the payload for PATCH /v1/recipe-collections/:id.
type UpdateRecipeCollectionRequest struct {
	Name      *string `json:"name,omitempty"       validate:"omitempty,min=1,max=200"`
	SortOrder *int    `json:"sort_order,omitempty"`
}

// AddRecipeToCollectionRequest is the payload for POST /v1/recipe-collections/:id/recipes.
type AddRecipeToCollectionRequest struct {
	RecipeID  uuid.UUID `json:"recipe_id"  validate:"required"`
	SortOrder int       `json:"sort_order"`
}
