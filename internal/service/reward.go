package service

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/query"
)

// ErrInsufficientPoints is returned when a kid tries to redeem above balance.
var ErrInsufficientPoints = errors.New("insufficient points")

// ErrInvalidStateTransition is returned when admin tries an illegal redemption move.
var ErrInvalidStateTransition = errors.New("invalid redemption state transition")

// RewardService manages the rewards catalog, redemptions, savings goals,
// reward cost adjustments, and per-kid timeline aggregation.
type RewardService struct {
	q      *query.Queries
	points *PointsService
	wallet *WalletService // unused for now; reserved for future cross-ledger flows
	bc     broadcast.Broadcaster
	audit  *AuditService
}

func NewRewardService(q *query.Queries, points *PointsService, wallet *WalletService, bc broadcast.Broadcaster, audit *AuditService) *RewardService {
	return &RewardService{q: q, points: points, wallet: wallet, bc: bc, audit: audit}
}

// ── Catalog ────────────────────────────────────────────────────────────────

func (s *RewardService) CreateReward(ctx context.Context, householdID uuid.UUID, name, description string, imageURL *string, costPoints int, fulfillmentKind string, byAccountID *uuid.UUID) (query.Reward, error) {
	var by *uuid.NullUUID
	if byAccountID != nil {
		by = &uuid.NullUUID{UUID: *byAccountID, Valid: true}
	}
	r, err := s.q.CreateReward(ctx, query.CreateRewardParams{
		ID:                 uuid.New(),
		HouseholdID:        householdID,
		Name:               name,
		Description:        description,
		ImageUrl:           imageURL,
		CostPoints:         int32(costPoints),
		FulfillmentKind:    fulfillmentKind,
		Active:             true,
		CreatedByAccountID: by,
	})
	if err != nil {
		return query.Reward{}, fmt.Errorf("reward.CreateReward: %w", err)
	}
	return r, nil
}

func (s *RewardService) GetReward(ctx context.Context, householdID, id uuid.UUID) (query.Reward, error) {
	return s.q.GetReward(ctx, query.GetRewardParams{ID: id, HouseholdID: householdID})
}

func (s *RewardService) ListRewards(ctx context.Context, householdID uuid.UUID, onlyActive bool) ([]query.Reward, error) {
	return s.q.ListRewards(ctx, query.ListRewardsParams{HouseholdID: householdID, OnlyActive: onlyActive})
}

func (s *RewardService) UpdateReward(ctx context.Context, householdID, id uuid.UUID, name, description, imageURL *string, costPoints *int, fulfillmentKind *string, active *bool) (query.Reward, error) {
	params := query.UpdateRewardParams{ID: id, HouseholdID: householdID}
	if name != nil {
		params.Name = name
	}
	if description != nil {
		params.Description = description
	}
	if imageURL != nil {
		params.ImageUrl = imageURL
	}
	if costPoints != nil {
		v := int32(*costPoints)
		params.CostPoints = &v
	}
	if fulfillmentKind != nil {
		params.FulfillmentKind = fulfillmentKind
	}
	if active != nil {
		params.Active = active
	}
	r, err := s.q.UpdateReward(ctx, params)
	if err != nil {
		return query.Reward{}, fmt.Errorf("reward.UpdateReward: %w", err)
	}
	return r, nil
}

func (s *RewardService) ArchiveReward(ctx context.Context, householdID, id uuid.UUID) error {
	if err := s.q.ArchiveReward(ctx, query.ArchiveRewardParams{ID: id, HouseholdID: householdID}); err != nil {
		return fmt.Errorf("reward.ArchiveReward: %w", err)
	}
	return nil
}
