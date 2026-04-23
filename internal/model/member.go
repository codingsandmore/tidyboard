package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Member is a person in a household. Kids may not have an Account.
type Member struct {
	ID                      uuid.UUID       `json:"id"`
	HouseholdID             uuid.UUID       `json:"household_id"`
	AccountID               *uuid.UUID      `json:"account_id,omitempty"`
	Name                    string          `json:"name"`
	DisplayName             string          `json:"display_name"`
	Color                   string          `json:"color"`
	AvatarURL               string          `json:"avatar_url"`
	Role                    string          `json:"role"`   // owner | admin | member | child | guest
	AgeGroup                string          `json:"age_group"` // toddler | child | tween | teen | adult
	PINHash                 string          `json:"-"`      // never serialized
	EmergencyInfo           json.RawMessage `json:"emergency_info,omitempty"`
	NotificationPreferences json.RawMessage `json:"notification_preferences,omitempty"`
	CreatedAt               time.Time       `json:"created_at"`
	UpdatedAt               time.Time       `json:"updated_at"`
}

// CreateMemberRequest is the payload for POST /v1/households/:id/members.
type CreateMemberRequest struct {
	Name        string  `json:"name"         validate:"required,min=1,max=100"`
	DisplayName string  `json:"display_name" validate:"required,min=1,max=50"`
	Color       string  `json:"color"        validate:"required"`
	Role        string  `json:"role"         validate:"required,oneof=admin member child guest"`
	AgeGroup    string  `json:"age_group"    validate:"required,oneof=toddler child tween teen adult"`
	PIN         *string `json:"pin,omitempty" validate:"omitempty,min=4,max=6,numeric"`
}

// UpdateMemberRequest is the payload for PATCH /v1/households/:id/members/:memberID.
type UpdateMemberRequest struct {
	Name        *string `json:"name,omitempty"         validate:"omitempty,min=1,max=100"`
	DisplayName *string `json:"display_name,omitempty" validate:"omitempty,min=1,max=50"`
	Color       *string `json:"color,omitempty"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Role        *string `json:"role,omitempty"         validate:"omitempty,oneof=admin member child guest"`
	AgeGroup    *string `json:"age_group,omitempty"    validate:"omitempty,oneof=toddler child tween teen adult"`
	PIN         *string `json:"pin,omitempty"          validate:"omitempty,min=4,max=6,numeric"`
}
