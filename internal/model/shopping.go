package model

import (
	"time"

	"github.com/google/uuid"
)

// ShoppingList is the top-level shopping list for a household.
type ShoppingList struct {
	ID          uuid.UUID          `json:"id"`
	HouseholdID uuid.UUID          `json:"household_id"`
	Name        string             `json:"name"`
	DateFrom    string             `json:"date_from"` // YYYY-MM-DD
	DateTo      string             `json:"date_to"`   // YYYY-MM-DD
	IsActive    bool               `json:"is_active"`
	CreatedAt   time.Time          `json:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at"`
	Items       []ShoppingListItem `json:"items,omitempty"`
}

// ShoppingListItem is one line on a shopping list.
type ShoppingListItem struct {
	ID             uuid.UUID `json:"id"`
	ShoppingListID uuid.UUID `json:"shopping_list_id"`
	Name           string    `json:"name"`
	Amount         float64   `json:"amount"`
	Unit           string    `json:"unit"`
	Aisle          string    `json:"aisle"`
	SourceRecipes  []string  `json:"source_recipes"`
	Completed      bool      `json:"completed"`
	SortOrder      int       `json:"sort_order"`
}

// PantryStaple is a recurring pantry item.
type PantryStaple struct {
	ID          uuid.UUID `json:"id"`
	HouseholdID uuid.UUID `json:"household_id"`
	Name        string    `json:"name"`
	Amount      float64   `json:"amount"`
	Unit        string    `json:"unit"`
	Aisle       string    `json:"aisle"`
}

// GenerateShoppingListRequest is the payload for POST /v1/shopping/generate.
type GenerateShoppingListRequest struct {
	DateFrom string `json:"date_from"` // YYYY-MM-DD
	DateTo   string `json:"date_to"`   // YYYY-MM-DD
}

// UpdateShoppingListItemRequest updates one item on the active shopping list.
type UpdateShoppingListItemRequest struct {
	Completed bool `json:"completed"`
}

// UpsertPantryStapleRequest is the payload for POST /v1/shopping/staples.
type UpsertPantryStapleRequest struct {
	Name   string  `json:"name"`
	Amount float64 `json:"amount"`
	Unit   string  `json:"unit"`
	Aisle  string  `json:"aisle"`
}

// DeletePantryStapleRequest is the payload for DELETE /v1/shopping/staples/:id.
type DeletePantryStapleRequest struct {
	ID uuid.UUID `json:"id"`
}

// IngredientSearchResult is one result from GET /api/ingredients/search.
type IngredientSearchResult struct {
	ID          uuid.UUID `json:"id"`
	Name        string    `json:"name"`
	Aliases     []string  `json:"aliases"`
	Category    string    `json:"category"`
	DefaultUnit string    `json:"default_unit"`
}
