package model

import (
	"github.com/google/uuid"
)

type CreateRewardRequest struct {
	Name            string  `json:"name"              validate:"required,min=1,max=120"`
	Description     string  `json:"description"`
	ImageURL        *string `json:"image_url,omitempty"`
	CostPoints      int     `json:"cost_points"        validate:"required,gte=0"`
	FulfillmentKind string  `json:"fulfillment_kind"   validate:"required,oneof=self_serve needs_approval"`
}

type UpdateRewardRequest struct {
	Name            *string `json:"name,omitempty"`
	Description     *string `json:"description,omitempty"`
	ImageURL        *string `json:"image_url,omitempty"`
	CostPoints      *int    `json:"cost_points,omitempty"`
	FulfillmentKind *string `json:"fulfillment_kind,omitempty"`
	Active          *bool   `json:"active,omitempty"`
}

type RedeemResponse struct {
	RedemptionID  uuid.UUID `json:"redemption_id"`
	Status        string    `json:"status"`         // "approved" or "pending"
	PointsCharged int       `json:"points_charged"` // 0 when status=pending
	NewBalance    int64     `json:"new_balance"`
	EffectiveCost int       `json:"effective_cost"`
}

type DeclineRedemptionRequest struct {
	Reason string `json:"reason"  validate:"required,min=1,max=200"`
}

type CostAdjustRequest struct {
	MemberID    uuid.UUID `json:"member_id"     validate:"required"`
	DeltaPoints int       `json:"delta_points"  validate:"required"`
	Reason      string    `json:"reason"`
	ExpiresAt   *string   `json:"expires_at,omitempty"`
}

type SetSavingsGoalRequest struct {
	RewardID *uuid.UUID `json:"reward_id"` // nil = clear
}

type TimelineEvent struct {
	Kind       string    `json:"kind"`
	ID         uuid.UUID `json:"id"`
	OccurredAt string    `json:"occurred_at"`
	Amount     int64     `json:"amount"`
	Reason     string    `json:"reason"`
	RefA       *string   `json:"ref_a,omitempty"`
	RefB       *string   `json:"ref_b,omitempty"`
}
