package model

import (
	"github.com/google/uuid"
)

// CreatePointCategoryRequest is what POST /v1/point-categories accepts.
type CreatePointCategoryRequest struct {
	Name      string `json:"name"        validate:"required,min=1,max=80"`
	Color     string `json:"color"       validate:"required,hexcolor"`
	SortOrder int    `json:"sort_order"`
}

// UpdatePointCategoryRequest is the PATCH body. All fields optional.
type UpdatePointCategoryRequest struct {
	Name      *string `json:"name,omitempty"`
	Color     *string `json:"color,omitempty"`
	SortOrder *int    `json:"sort_order,omitempty"`
}

// CreateBehaviorRequest is what POST /v1/behaviors accepts.
type CreateBehaviorRequest struct {
	CategoryID      uuid.UUID `json:"category_id"      validate:"required"`
	Name            string    `json:"name"             validate:"required,min=1,max=80"`
	SuggestedPoints int       `json:"suggested_points" validate:"gte=0"`
}

// UpdateBehaviorRequest is the PATCH body.
type UpdateBehaviorRequest struct {
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	Name            *string    `json:"name,omitempty"`
	SuggestedPoints *int       `json:"suggested_points,omitempty"`
}

// GrantPointsRequest is what POST /v1/points/{member_id}/grant accepts.
type GrantPointsRequest struct {
	BehaviorID *uuid.UUID `json:"behavior_id,omitempty"`
	CategoryID *uuid.UUID `json:"category_id,omitempty"`
	Points     int        `json:"points"  validate:"required"`
	Reason     string     `json:"reason"`
}

// AdjustPointsRequest is the admin ± override.
type AdjustPointsRequest struct {
	Points int    `json:"points"  validate:"required"`
	Reason string `json:"reason"  validate:"required,min=1,max=200"`
}

// PointsBalanceResponse is the GET /v1/points/{member_id} payload.
type PointsBalanceResponse struct {
	MemberID   uuid.UUID           `json:"member_id"`
	Total      int64               `json:"total"`
	ByCategory []CategoryTotal     `json:"by_category"`
	Recent     []PointGrantSummary `json:"recent"`
}

// CategoryTotal is one row of a per-category breakdown.
type CategoryTotal struct {
	CategoryID *uuid.UUID `json:"category_id"`
	Total      int64      `json:"total"`
}

// PointGrantSummary is the recent-history slice on the balance response.
type PointGrantSummary struct {
	ID         uuid.UUID  `json:"id"`
	Points     int        `json:"points"`
	Reason     string     `json:"reason"`
	CategoryID *uuid.UUID `json:"category_id"`
	BehaviorID *uuid.UUID `json:"behavior_id"`
	GrantedAt  string     `json:"granted_at"`
}

// ScoreboardEntry is one row in the GET /v1/points/scoreboard response.
type ScoreboardEntry struct {
	MemberID   uuid.UUID       `json:"member_id"`
	Total      int64           `json:"total"`
	ByCategory []CategoryTotal `json:"by_category"`
}
