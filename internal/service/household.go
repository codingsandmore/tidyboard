package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tidyboard/tidyboard/internal/model"
	"github.com/tidyboard/tidyboard/internal/query"
)

// HouseholdService handles household business logic.
type HouseholdService struct {
	q *query.Queries
}

// NewHouseholdService constructs a HouseholdService.
func NewHouseholdService(q *query.Queries) *HouseholdService {
	return &HouseholdService{q: q}
}

// Create creates a new household owned by accountID.
func (s *HouseholdService) Create(ctx context.Context, accountID uuid.UUID, req model.CreateHouseholdRequest) (*model.Household, error) {
	tz := req.Timezone
	if tz == "" {
		tz = "UTC"
	}

	h, err := s.q.CreateHousehold(ctx, query.CreateHouseholdParams{
		ID:         uuid.New(),
		Name:       req.Name,
		Timezone:   tz,
		Settings:   []byte("{}"),
		CreatedBy:  accountID,
		InviteCode: uuid.New().String(),
	})
	if err != nil {
		return nil, fmt.Errorf("creating household: %w", err)
	}

	return householdToModel(h), nil
}

// Get returns a household by ID.
func (s *HouseholdService) Get(ctx context.Context, id uuid.UUID) (*model.Household, error) {
	h, err := s.q.GetHousehold(ctx, id)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("fetching household: %w", err)
	}
	return householdToModel(h), nil
}

// Update patches household fields.
func (s *HouseholdService) Update(ctx context.Context, id uuid.UUID, req model.UpdateHouseholdRequest) (*model.Household, error) {
	var settingsBytes []byte
	if req.Settings != nil {
		b, err := json.Marshal(req.Settings)
		if err != nil {
			return nil, fmt.Errorf("marshaling settings: %w", err)
		}
		settingsBytes = b
	}

	h, err := s.q.UpdateHousehold(ctx, query.UpdateHouseholdParams{
		ID:       id,
		Name:     req.Name,
		Timezone: req.Timezone,
		Settings: settingsBytes,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, fmt.Errorf("updating household: %w", err)
	}
	return householdToModel(h), nil
}

// Delete removes a household and all its data (cascades via FK).
func (s *HouseholdService) Delete(ctx context.Context, id uuid.UUID) error {
	// Verify it exists first so we can return ErrNotFound appropriately.
	if _, err := s.q.GetHousehold(ctx, id); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return ErrNotFound
		}
		return fmt.Errorf("fetching household: %w", err)
	}
	if err := s.q.DeleteHousehold(ctx, id); err != nil {
		return fmt.Errorf("deleting household: %w", err)
	}
	return nil
}

// householdToModel converts a query.Household to model.Household.
func householdToModel(h query.Household) *model.Household {
	m := &model.Household{
		ID:         h.ID,
		Name:       h.Name,
		Timezone:   h.Timezone,
		Settings:   json.RawMessage(h.Settings),
		CreatedBy:  h.CreatedBy,
		InviteCode: h.InviteCode,
	}
	if h.CreatedAt.Valid {
		m.CreatedAt = h.CreatedAt.Time
	}
	if h.UpdatedAt.Valid {
		m.UpdatedAt = h.UpdatedAt.Time
	}
	return m
}
