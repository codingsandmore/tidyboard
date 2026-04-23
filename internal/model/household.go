package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Household is the top-level tenant unit. Every piece of data belongs to a household.
type Household struct {
	ID         uuid.UUID       `json:"id"`
	Name       string          `json:"name"`
	Timezone   string          `json:"timezone"`
	Settings   json.RawMessage `json:"settings,omitempty"`
	CreatedBy  uuid.UUID       `json:"created_by"`
	InviteCode string          `json:"invite_code"`
	CreatedAt  time.Time       `json:"created_at"`
	UpdatedAt  time.Time       `json:"updated_at"`
}

// CreateHouseholdRequest is the payload for POST /v1/households.
type CreateHouseholdRequest struct {
	Name     string `json:"name"     validate:"required,min=1,max=100"`
	Timezone string `json:"timezone" validate:"required"`
}

// UpdateHouseholdRequest is the payload for PATCH /v1/households/:id.
type UpdateHouseholdRequest struct {
	Name     *string          `json:"name,omitempty"     validate:"omitempty,min=1,max=100"`
	Timezone *string          `json:"timezone,omitempty"`
	Settings *json.RawMessage `json:"settings,omitempty"`
}

// Invitation is an email-based invitation to join a household.
type Invitation struct {
	ID          uuid.UUID  `json:"id"`
	HouseholdID uuid.UUID  `json:"household_id"`
	Email       string     `json:"email"`
	Role        string     `json:"role"`
	Token       string     `json:"token"`
	InvitedBy   uuid.UUID  `json:"invited_by"`
	CreatedAt   time.Time  `json:"created_at"`
	ExpiresAt   time.Time  `json:"expires_at"`
	AcceptedAt  *time.Time `json:"accepted_at,omitempty"`
	Status      string     `json:"status"`
}
