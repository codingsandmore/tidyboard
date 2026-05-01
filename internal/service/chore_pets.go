package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ChorePetsService manages the chore_pets join table.
//
// Spec: docs/specs/2026-05-01-fairplay-design.md, section D.
type ChorePetsService struct {
	q *query.Queries
}

// NewChorePetsService constructs a ChorePetsService.
func NewChorePetsService(q *query.Queries) *ChorePetsService {
	return &ChorePetsService{q: q}
}

// ErrChorePetsInvalidMember is returned when one of the supplied IDs is either
// not a member of the same household as the chore, or is not a pet.
var ErrChorePetsInvalidMember = errors.New("chore_pets: pet must belong to the same household and have role=pet")

// ListPetMemberIDs returns the pet member IDs currently linked to the chore.
// Always returns a non-nil slice for stable JSON serialization.
func (s *ChorePetsService) ListPetMemberIDs(ctx context.Context, choreID uuid.UUID) ([]uuid.UUID, error) {
	ids, err := s.q.ListChorePets(ctx, choreID)
	if err != nil {
		return nil, fmt.Errorf("chore_pets.List: %w", err)
	}
	if ids == nil {
		ids = []uuid.UUID{}
	}
	return ids, nil
}

// LinkChorePets replaces the entire set of pets linked to a chore with petIDs.
// Returns ErrChorePetsInvalidMember if any petID is not a pet member of the
// chore's household.
func (s *ChorePetsService) LinkChorePets(ctx context.Context, householdID, choreID uuid.UUID, petIDs []uuid.UUID) error {
	// Verify chore belongs to household.
	if _, err := s.q.GetChore(ctx, query.GetChoreParams{ID: choreID, HouseholdID: householdID}); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("chore_pets.Link: chore %s not in household: %w", choreID, err)
		}
		return fmt.Errorf("chore_pets.Link: get chore: %w", err)
	}

	// Build allow-set: pets in this household.
	allowed, err := s.q.ListPetMembersForHousehold(ctx, householdID)
	if err != nil {
		return fmt.Errorf("chore_pets.Link: list pets: %w", err)
	}
	allowSet := make(map[uuid.UUID]struct{}, len(allowed))
	for _, id := range allowed {
		allowSet[id] = struct{}{}
	}

	// Validate every requested petID before mutating.
	for _, p := range petIDs {
		if _, ok := allowSet[p]; !ok {
			return ErrChorePetsInvalidMember
		}
	}

	// Replace-set: clear, then re-insert.
	if err := s.q.ClearChorePets(ctx, choreID); err != nil {
		return fmt.Errorf("chore_pets.Link: clear: %w", err)
	}
	for _, p := range petIDs {
		if err := s.q.AddChorePet(ctx, query.AddChorePetParams{ChoreID: choreID, PetID: p}); err != nil {
			return fmt.Errorf("chore_pets.Link: add %s: %w", p, err)
		}
	}
	return nil
}
