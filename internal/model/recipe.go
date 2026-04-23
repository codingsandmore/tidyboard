package model

import (
	"time"

	"github.com/google/uuid"
)

// Recipe is a household's private recipe record.
type Recipe struct {
	ID           uuid.UUID   `json:"id"`
	HouseholdID  uuid.UUID   `json:"household_id"`
	Title        string      `json:"title"`
	Description  string      `json:"description"`
	SourceURL    string      `json:"source_url"`
	SourceDomain string      `json:"source_domain"`
	ImageURL     string      `json:"image_url"`
	PrepTime     string      `json:"prep_time"`  // ISO 8601 duration e.g. PT15M
	CookTime     string      `json:"cook_time"`
	TotalTime    string      `json:"total_time"`
	Servings     int         `json:"servings"`
	ServingsUnit string      `json:"servings_unit"`
	Categories   []string    `json:"categories"`
	Cuisine      string      `json:"cuisine"`
	Tags         []string    `json:"tags"`
	Difficulty   string      `json:"difficulty"` // easy | medium | hard
	Rating       int         `json:"rating"`     // 1-5
	Notes        string      `json:"notes"`
	IsFavorite   bool        `json:"is_favorite"`
	TimesCooked  int         `json:"times_cooked"`
	LastCookedAt *time.Time  `json:"last_cooked_at,omitempty"`
	CreatedBy    uuid.UUID   `json:"created_by"`
	CreatedAt    time.Time   `json:"created_at"`
	UpdatedAt    time.Time   `json:"updated_at"`

	Ingredients   []RecipeIngredient `json:"ingredients,omitempty"`
	Steps         []RecipeStep       `json:"steps,omitempty"`
	NutritionInfo *NutritionInfo     `json:"nutrition_info,omitempty"`
}

// RecipeIngredient is one ingredient line in a recipe.
type RecipeIngredient struct {
	ID               uuid.UUID `json:"id"`
	RecipeID         uuid.UUID `json:"recipe_id"`
	Order            int       `json:"order"`
	Group            string    `json:"group"`
	Amount           float64   `json:"amount"`
	Unit             string    `json:"unit"`
	Name             string    `json:"name"`
	Preparation      string    `json:"preparation"`
	Optional         bool      `json:"optional"`
	SubstitutionNote string    `json:"substitution_note"`
}

// RecipeStep is one step in a recipe.
type RecipeStep struct {
	ID           uuid.UUID `json:"id"`
	RecipeID     uuid.UUID `json:"recipe_id"`
	Order        int       `json:"order"`
	Text         string    `json:"text"`
	TimerSeconds *int      `json:"timer_seconds,omitempty"`
	ImageURL     string    `json:"image_url"`
}

// NutritionInfo holds per-serving nutrition data.
type NutritionInfo struct {
	Calories  int     `json:"calories"`
	FatG      float64 `json:"fat_g"`
	ProteinG  float64 `json:"protein_g"`
	CarbsG    float64 `json:"carbs_g"`
	FiberG    float64 `json:"fiber_g"`
	SodiumMG  float64 `json:"sodium_mg"`
	SugarG    float64 `json:"sugar_g"`
}

// CreateRecipeRequest is the payload for POST /v1/recipes.
type CreateRecipeRequest struct {
	Title        string   `json:"title"      validate:"required,min=1,max=500"`
	Description  string   `json:"description"`
	SourceURL    string   `json:"source_url"`
	Servings     int      `json:"servings"   validate:"min=0"`
	ServingsUnit string   `json:"servings_unit"`
	Categories   []string `json:"categories"`
	Tags         []string `json:"tags"`
	Difficulty   string   `json:"difficulty" validate:"omitempty,oneof=easy medium hard"`
}

// ImportRecipeRequest is the payload for POST /v1/recipes/import.
type ImportRecipeRequest struct {
	URL string `json:"url" validate:"required,url"`
}

// UpdateRecipeRequest is the payload for PATCH /v1/recipes/:id.
type UpdateRecipeRequest struct {
	Title      *string  `json:"title,omitempty"      validate:"omitempty,min=1,max=500"`
	Notes      *string  `json:"notes,omitempty"`
	Rating     *int     `json:"rating,omitempty"     validate:"omitempty,min=1,max=5"`
	IsFavorite *bool    `json:"is_favorite,omitempty"`
	Tags       []string `json:"tags,omitempty"`
	Categories []string `json:"categories,omitempty"`
	Difficulty *string  `json:"difficulty,omitempty" validate:"omitempty,oneof=easy medium hard"`
}
