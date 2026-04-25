package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// MealPlanService handles meal plan business logic.
type MealPlanService struct {
	q *query.Queries
}

// NewMealPlanService constructs a MealPlanService.
func NewMealPlanService(q *query.Queries) *MealPlanService {
	return &MealPlanService{q: q}
}

// Upsert inserts or replaces one meal plan slot.
func (s *MealPlanService) Upsert(ctx context.Context, householdID uuid.UUID, req model.UpsertMealPlanRequest) (*model.MealPlanEntry, error) {
	t, err := time.Parse("2006-01-02", req.Date)
	if err != nil {
		return nil, fmt.Errorf("invalid date format: %w", err)
	}

	var recipeID *uuid.NullUUID
	if req.RecipeID != nil {
		recipeID = &uuid.NullUUID{UUID: *req.RecipeID, Valid: true}
	}

	row, err := s.q.UpsertMealPlanEntry(ctx, query.UpsertMealPlanEntryParams{
		HouseholdID: householdID,
		RecipeID:    recipeID,
		Date:        pgtype.Date{Time: t, Valid: true},
		Slot:        req.Slot,
	})
	if err != nil {
		return nil, fmt.Errorf("upserting meal plan entry: %w", err)
	}
	return entryToModel(row), nil
}

// List returns all meal plan entries for a household within a date range.
func (s *MealPlanService) List(ctx context.Context, householdID uuid.UUID, from, to string) ([]*model.MealPlanEntry, error) {
	fromT, err := time.Parse("2006-01-02", from)
	if err != nil {
		return nil, fmt.Errorf("invalid from date: %w", err)
	}
	toT, err := time.Parse("2006-01-02", to)
	if err != nil {
		return nil, fmt.Errorf("invalid to date: %w", err)
	}

	rows, err := s.q.ListMealPlanEntries(ctx, query.ListMealPlanEntriesParams{
		HouseholdID: householdID,
		Date:        pgtype.Date{Time: fromT, Valid: true},
		Date_2:      pgtype.Date{Time: toT, Valid: true},
	})
	if err != nil {
		return nil, fmt.Errorf("listing meal plan entries: %w", err)
	}
	out := make([]*model.MealPlanEntry, len(rows))
	for i, r := range rows {
		out[i] = entryToModel(r)
	}
	return out, nil
}

// Delete removes a meal plan entry by ID.
func (s *MealPlanService) Delete(ctx context.Context, householdID, id uuid.UUID) error {
	if err := s.q.DeleteMealPlanEntry(ctx, query.DeleteMealPlanEntryParams{
		ID:          id,
		HouseholdID: householdID,
	}); err != nil {
		return fmt.Errorf("deleting meal plan entry: %w", err)
	}
	return nil
}

// entryToModel converts a query.MealPlanEntry to model.MealPlanEntry.
func entryToModel(r query.MealPlanEntry) *model.MealPlanEntry {
	out := &model.MealPlanEntry{
		ID:          r.ID,
		HouseholdID: r.HouseholdID,
		Date:        r.Date.Time.Format("2006-01-02"),
		Slot:        r.Slot,
	}
	if r.RecipeID != nil && r.RecipeID.Valid {
		out.RecipeID = &r.RecipeID.UUID
	}
	if r.CreatedAt.Valid {
		out.CreatedAt = r.CreatedAt.Time
	}
	if r.UpdatedAt.Valid {
		out.UpdatedAt = r.UpdatedAt.Time
	}
	return out
}
