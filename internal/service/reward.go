package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/tidyboard/tidyboard/internal/broadcast"
	"github.com/tidyboard/tidyboard/internal/model"
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

// ── Cost adjustments ───────────────────────────────────────────────────────

// EffectiveCostFor returns the effective cost of a reward for a single
// member at the given moment, applying all currently-active cost adjustments.
func (s *RewardService) EffectiveCostFor(ctx context.Context, memberID, rewardID uuid.UUID, baseCost int32, now time.Time) (int, error) {
	rows, err := s.q.ListActiveRewardCostAdjustments(ctx, query.ListActiveRewardCostAdjustmentsParams{
		MemberID: memberID, RewardID: rewardID,
	})
	if err != nil {
		return 0, fmt.Errorf("EffectiveCostFor: %w", err)
	}
	adjs := make([]CostAdjustment, 0, len(rows))
	for _, r := range rows {
		var exp *time.Time
		if r.ExpiresAt.Valid {
			t := r.ExpiresAt.Time
			exp = &t
		}
		adjs = append(adjs, CostAdjustment{Delta: int(r.DeltaPoints), ExpiresAt: exp})
	}
	return EffectiveCost(int(baseCost), adjs, now), nil
}

func (s *RewardService) CreateCostAdjustment(ctx context.Context, householdID, memberID, rewardID uuid.UUID, delta int, reason string, expiresAt *time.Time, byAccountID *uuid.UUID) (query.RewardCostAdjustment, error) {
	var by *uuid.NullUUID
	if byAccountID != nil {
		by = &uuid.NullUUID{UUID: *byAccountID, Valid: true}
	}
	var pgExpires pgtype.Timestamptz
	if expiresAt != nil {
		pgExpires = pgtype.Timestamptz{Time: *expiresAt, Valid: true}
	}
	adj, err := s.q.CreateRewardCostAdjustment(ctx, query.CreateRewardCostAdjustmentParams{
		ID:                 uuid.New(),
		HouseholdID:        householdID,
		MemberID:           memberID,
		RewardID:           rewardID,
		DeltaPoints:        int32(delta),
		Reason:             reason,
		ExpiresAt:          pgExpires,
		CreatedByAccountID: by,
	})
	if err != nil {
		return query.RewardCostAdjustment{}, fmt.Errorf("CreateCostAdjustment: %w", err)
	}

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"adjustment_id": adj.ID, "reward_id": rewardID, "member_id": memberID, "delta": delta})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "reward.cost_adjusted", HouseholdID: householdID.String(), Payload: payload, Timestamp: time.Now().UTC(),
		})
	}
	if s.audit != nil {
		s.audit.Log(ctx, "reward.cost_adjust", "reward_cost_adjustment", adj.ID, map[string]any{"member_id": memberID, "reward_id": rewardID, "delta": delta, "reason": reason})
	}
	return adj, nil
}

func (s *RewardService) DeleteCostAdjustment(ctx context.Context, householdID, id uuid.UUID) error {
	if err := s.q.DeleteRewardCostAdjustment(ctx, query.DeleteRewardCostAdjustmentParams{ID: id, HouseholdID: householdID}); err != nil {
		return fmt.Errorf("DeleteCostAdjustment: %w", err)
	}
	return nil
}

// ── Redemptions ─────────────────────────────────────────────────────────────

// Redeem handles both self-serve and needs-approval flows.
//   - self_serve: writes a negative point_grant immediately, status=approved
//   - needs_approval: writes redemption row only, status=pending, no debit yet
func (s *RewardService) Redeem(ctx context.Context, householdID, memberID, rewardID uuid.UUID, byAccountID *uuid.UUID) (model.RedeemResponse, error) {
	reward, err := s.GetReward(ctx, householdID, rewardID)
	if err != nil {
		return model.RedeemResponse{}, fmt.Errorf("Redeem: get reward: %w", err)
	}
	if !reward.Active {
		return model.RedeemResponse{}, fmt.Errorf("Redeem: reward not active")
	}

	cost, err := s.EffectiveCostFor(ctx, memberID, rewardID, reward.CostPoints, time.Now())
	if err != nil {
		return model.RedeemResponse{}, err
	}

	bal, err := s.points.GetBalance(ctx, householdID, memberID)
	if err != nil {
		return model.RedeemResponse{}, err
	}

	if reward.FulfillmentKind == "self_serve" {
		if int64(cost) > bal.Total {
			return model.RedeemResponse{}, ErrInsufficientPoints
		}
		red, err := s.q.CreateRedemption(ctx, query.CreateRedemptionParams{
			ID: uuid.New(), HouseholdID: householdID, RewardID: rewardID, MemberID: memberID,
			PointsAtRedemption: int32(cost), Status: "approved",
		})
		if err != nil {
			return model.RedeemResponse{}, fmt.Errorf("Redeem: create redemption: %w", err)
		}

		grant, err := s.points.Grant(ctx, householdID, memberID, nil, nil, -cost, "Redeemed: "+reward.Name, byAccountID)
		if err != nil {
			return model.RedeemResponse{}, fmt.Errorf("Redeem: debit grant: %w", err)
		}

		now := time.Now().UTC()
		var by *uuid.NullUUID
		if byAccountID != nil {
			by = &uuid.NullUUID{UUID: *byAccountID, Valid: true}
		}
		_, err = s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
			ID: red.ID, HouseholdID: householdID, Status: "approved",
			DecidedAt:          pgtype.Timestamptz{Time: now, Valid: true},
			DecidedByAccountID: by,
			GrantID:            &uuid.NullUUID{UUID: grant.ID, Valid: true},
		})
		if err != nil {
			return model.RedeemResponse{}, err
		}

		if s.bc != nil {
			payload, _ := json.Marshal(map[string]any{"redemption_id": red.ID, "status": "approved", "member_id": memberID})
			_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
				Type: "redemption.decided", HouseholdID: householdID.String(), Payload: payload, Timestamp: now,
			})
		}
		return model.RedeemResponse{
			RedemptionID: red.ID, Status: "approved",
			PointsCharged: cost, NewBalance: bal.Total - int64(cost), EffectiveCost: cost,
		}, nil
	}

	// needs_approval: just record the request, no debit yet
	red, err := s.q.CreateRedemption(ctx, query.CreateRedemptionParams{
		ID: uuid.New(), HouseholdID: householdID, RewardID: rewardID, MemberID: memberID,
		PointsAtRedemption: int32(cost), Status: "pending",
	})
	if err != nil {
		return model.RedeemResponse{}, fmt.Errorf("Redeem: create pending redemption: %w", err)
	}

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": red.ID, "member_id": memberID, "reward_id": rewardID, "cost": cost})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "redemption.requested", HouseholdID: householdID.String(), Payload: payload, Timestamp: time.Now().UTC(),
		})
	}
	return model.RedeemResponse{
		RedemptionID: red.ID, Status: "pending",
		PointsCharged: 0, NewBalance: bal.Total, EffectiveCost: cost,
	}, nil
}

func (s *RewardService) ApproveRedemption(ctx context.Context, householdID, redemptionID uuid.UUID, byAccountID *uuid.UUID) (query.Redemption, error) {
	red, err := s.q.GetRedemption(ctx, query.GetRedemptionParams{ID: redemptionID, HouseholdID: householdID})
	if err != nil {
		return query.Redemption{}, fmt.Errorf("ApproveRedemption: get: %w", err)
	}
	if red.Status != "pending" {
		return query.Redemption{}, ErrInvalidStateTransition
	}

	reward, err := s.GetReward(ctx, householdID, red.RewardID)
	if err != nil {
		return query.Redemption{}, err
	}

	grant, err := s.points.Grant(ctx, householdID, red.MemberID, nil, nil, -int(red.PointsAtRedemption), "Redeemed: "+reward.Name, byAccountID)
	if err != nil {
		return query.Redemption{}, fmt.Errorf("ApproveRedemption: debit: %w", err)
	}

	now := time.Now().UTC()
	var by *uuid.NullUUID
	if byAccountID != nil {
		by = &uuid.NullUUID{UUID: *byAccountID, Valid: true}
	}
	updated, err := s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
		ID: redemptionID, HouseholdID: householdID, Status: "approved",
		DecidedAt:          pgtype.Timestamptz{Time: now, Valid: true},
		DecidedByAccountID: by,
		GrantID:            &uuid.NullUUID{UUID: grant.ID, Valid: true},
	})
	if err != nil {
		return query.Redemption{}, err
	}

	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": updated.ID, "status": "approved"})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "redemption.decided", HouseholdID: householdID.String(), Payload: payload, Timestamp: now,
		})
	}
	return updated, nil
}

func (s *RewardService) DeclineRedemption(ctx context.Context, householdID, redemptionID uuid.UUID, reason string, byAccountID *uuid.UUID) (query.Redemption, error) {
	red, err := s.q.GetRedemption(ctx, query.GetRedemptionParams{ID: redemptionID, HouseholdID: householdID})
	if err != nil {
		return query.Redemption{}, err
	}
	if red.Status != "pending" {
		return query.Redemption{}, ErrInvalidStateTransition
	}

	now := time.Now().UTC()
	var by *uuid.NullUUID
	if byAccountID != nil {
		by = &uuid.NullUUID{UUID: *byAccountID, Valid: true}
	}
	updated, err := s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
		ID: redemptionID, HouseholdID: householdID, Status: "declined",
		DecidedAt:          pgtype.Timestamptz{Time: now, Valid: true},
		DecidedByAccountID: by,
		DeclineReason:      &reason,
	})
	if err != nil {
		return query.Redemption{}, err
	}
	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": updated.ID, "status": "declined", "reason": reason})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "redemption.decided", HouseholdID: householdID.String(), Payload: payload, Timestamp: now,
		})
	}
	return updated, nil
}

func (s *RewardService) FulfillRedemption(ctx context.Context, householdID, redemptionID uuid.UUID) (query.Redemption, error) {
	red, err := s.q.GetRedemption(ctx, query.GetRedemptionParams{ID: redemptionID, HouseholdID: householdID})
	if err != nil {
		return query.Redemption{}, err
	}
	if red.Status != "approved" {
		return query.Redemption{}, ErrInvalidStateTransition
	}

	now := time.Now().UTC()
	updated, err := s.q.SetRedemptionStatus(ctx, query.SetRedemptionStatusParams{
		ID: redemptionID, HouseholdID: householdID, Status: "fulfilled",
		FulfilledAt: pgtype.Timestamptz{Time: now, Valid: true},
	})
	if err != nil {
		return query.Redemption{}, err
	}
	if s.bc != nil {
		payload, _ := json.Marshal(map[string]any{"redemption_id": updated.ID})
		_ = s.bc.Publish(ctx, "household:"+householdID.String(), broadcast.Event{
			Type: "redemption.fulfilled", HouseholdID: householdID.String(), Payload: payload, Timestamp: now,
		})
	}
	return updated, nil
}

func (s *RewardService) ListRedemptions(ctx context.Context, householdID uuid.UUID, memberID *uuid.UUID, status *string, limit, offset int32) ([]query.Redemption, error) {
	var mid *uuid.NullUUID
	if memberID != nil {
		mid = &uuid.NullUUID{UUID: *memberID, Valid: true}
	}
	return s.q.ListRedemptions(ctx, query.ListRedemptionsParams{
		HouseholdID: householdID, MemberID: mid, Status: status,
		Limit: limit, Offset: offset,
	})
}
