package service

import (
	"context"
	"errors"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// RecipeCollectionService handles recipe collection business logic.
type RecipeCollectionService struct {
	q *query.Queries
}

// NewRecipeCollectionService constructs a RecipeCollectionService.
func NewRecipeCollectionService(q *query.Queries) *RecipeCollectionService {
	return &RecipeCollectionService{q: q}
}

// slugify converts a name to a URL-safe slug.
func slugify(name string) string {
	s := strings.ToLower(name)
	re := regexp.MustCompile(`[^a-z0-9]+`)
	s = re.ReplaceAllString(s, "-")
	s = strings.Trim(s, "-")
	if s == "" {
		s = fmt.Sprintf("collection-%d", time.Now().UnixMilli())
	}
	return s
}

// List returns all collections for a household ordered by sort_order.
func (s *RecipeCollectionService) List(ctx context.Context, householdID uuid.UUID) ([]*model.RecipeCollection, error) {
	rows, err := s.q.ListRecipeCollections(ctx, householdID)
	if err != nil {
		return nil, fmt.Errorf("listing recipe collections: %w", err)
	}
	out := make([]*model.RecipeCollection, len(rows))
	for i, r := range rows {
		out[i] = collectionToModel(r)
	}
	return out, nil
}

// Create inserts a new collection.
func (s *RecipeCollectionService) Create(ctx context.Context, householdID uuid.UUID, req model.CreateRecipeCollectionRequest) (*model.RecipeCollection, error) {
	slug := slugify(req.Name)
	col, err := s.q.CreateRecipeCollection(ctx, query.CreateRecipeCollectionParams{
		ID:          uuid.New(),
		HouseholdID: householdID,
		Name:        req.Name,
		Slug:        slug,
		SortOrder:   int32(req.SortOrder),
	})
	if err != nil {
		return nil, fmt.Errorf("creating recipe collection: %w", err)
	}
	return collectionToModel(col), nil
}

// Update patches collection fields.
func (s *RecipeCollectionService) Update(ctx context.Context, householdID, collectionID uuid.UUID, req model.UpdateRecipeCollectionRequest) (*model.RecipeCollection, error) {
	var slugPtr *string
	if req.Name != nil {
		slug := slugify(*req.Name)
		slugPtr = &slug
	}
	var sortOrderPtr *int32
	if req.SortOrder != nil {
		v := int32(*req.SortOrder)
		sortOrderPtr = &v
	}

	col, err := s.q.UpdateRecipeCollection(ctx, query.UpdateRecipeCollectionParams{
		ID:          collectionID,
		HouseholdID: householdID,
		Name:        req.Name,
		Slug:        slugPtr,
		SortOrder:   sortOrderPtr,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating recipe collection: %w", err)
	}
	return collectionToModel(col), nil
}

// Delete removes a collection.
func (s *RecipeCollectionService) Delete(ctx context.Context, householdID, collectionID uuid.UUID) error {
	if _, err := s.q.GetRecipeCollection(ctx, query.GetRecipeCollectionParams{
		ID:          collectionID,
		HouseholdID: householdID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching recipe collection: %w", err)
	}
	if err := s.q.DeleteRecipeCollection(ctx, query.DeleteRecipeCollectionParams{
		ID:          collectionID,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting recipe collection: %w", err)
	}
	return nil
}

// AddRecipe adds a recipe to a collection.
func (s *RecipeCollectionService) AddRecipe(ctx context.Context, householdID, collectionID uuid.UUID, req model.AddRecipeToCollectionRequest) error {
	// Ensure the collection belongs to this household.
	if _, err := s.q.GetRecipeCollection(ctx, query.GetRecipeCollectionParams{
		ID:          collectionID,
		HouseholdID: householdID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching recipe collection: %w", err)
	}
	if err := s.q.AddRecipeToCollection(ctx, query.AddRecipeToCollectionParams{
		CollectionID: collectionID,
		RecipeID:     req.RecipeID,
		SortOrder:    int32(req.SortOrder),
	}); err != nil {
		return fmt.Errorf("adding recipe to collection: %w", err)
	}
	return nil
}

// RemoveRecipe removes a recipe from a collection.
func (s *RecipeCollectionService) RemoveRecipe(ctx context.Context, householdID, collectionID, recipeID uuid.UUID) error {
	if _, err := s.q.GetRecipeCollection(ctx, query.GetRecipeCollectionParams{
		ID:          collectionID,
		HouseholdID: householdID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching recipe collection: %w", err)
	}
	if err := s.q.RemoveRecipeFromCollection(ctx, query.RemoveRecipeFromCollectionParams{
		CollectionID: collectionID,
		RecipeID:     recipeID,
	}); err != nil {
		return fmt.Errorf("removing recipe from collection: %w", err)
	}
	return nil
}

// ListRecipes returns all recipes in a collection scoped to the household.
func (s *RecipeCollectionService) ListRecipes(ctx context.Context, householdID, collectionID uuid.UUID) ([]*model.Recipe, error) {
	if _, err := s.q.GetRecipeCollection(ctx, query.GetRecipeCollectionParams{
		ID:          collectionID,
		HouseholdID: householdID,
	}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching recipe collection: %w", err)
	}
	rows, err := s.q.ListRecipesByCollection(ctx, query.ListRecipesByCollectionParams{
		CollectionID: collectionID,
		HouseholdID:  householdID,
	})
	if err != nil {
		return nil, fmt.Errorf("listing recipes by collection: %w", err)
	}
	out := make([]*model.Recipe, len(rows))
	for i, r := range rows {
		out[i] = recipeToModel(r)
	}
	return out, nil
}

// collectionToModel converts a query.RecipeCollection to model.RecipeCollection.
func collectionToModel(c query.RecipeCollection) *model.RecipeCollection {
	out := &model.RecipeCollection{
		ID:          c.ID,
		HouseholdID: c.HouseholdID,
		Name:        c.Name,
		Slug:        c.Slug,
		SortOrder:   int(c.SortOrder),
	}
	if c.CreatedAt.Valid {
		out.CreatedAt = c.CreatedAt.Time
	}
	if c.UpdatedAt.Valid {
		out.UpdatedAt = c.UpdatedAt.Time
	}
	return out
}
