package model

import (
	"time"

	"github.com/google/uuid"
)

// JoinRequest is a request to join a household via invite code.
type JoinRequest struct {
	ID          uuid.UUID  `json:"id"`
	HouseholdID uuid.UUID  `json:"household_id"`
	AccountID   uuid.UUID  `json:"account_id"`
	RequestedAt time.Time  `json:"requested_at"`
	ReviewedBy  *uuid.UUID `json:"reviewed_by,omitempty"`
	ReviewedAt  *time.Time `json:"reviewed_at,omitempty"`
	Status      string     `json:"status"`
}

// HouseholdPreview is returned by GET /v1/households/by-code/:code.
type HouseholdPreview struct {
	HouseholdID uuid.UUID `json:"household_id"`
	Name        string    `json:"name"`
	InviteCode  string    `json:"invite_code"`
}

// RegenerateInviteCodeResponse is returned by POST /v1/households/:id/invite/regenerate.
type RegenerateInviteCodeResponse struct {
	InviteCode string `json:"invite_code"`
}
