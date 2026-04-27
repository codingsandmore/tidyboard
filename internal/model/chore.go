package model

import (
	"time"

	"github.com/google/uuid"
)

type CreateChoreRequest struct {
	MemberID      uuid.UUID `json:"member_id"      validate:"required"`
	Name          string    `json:"name"           validate:"required,min=1,max=200"`
	Weight        int       `json:"weight"         validate:"required,min=1,max=5"`
	FrequencyKind string    `json:"frequency_kind" validate:"required,oneof=daily weekdays specific_days weekly"`
	DaysOfWeek    []string  `json:"days_of_week"`
	AutoApprove   bool      `json:"auto_approve"`
}

type UpdateChoreRequest struct {
	Name          *string  `json:"name,omitempty"           validate:"omitempty,min=1,max=200"`
	Weight        *int     `json:"weight,omitempty"         validate:"omitempty,min=1,max=5"`
	FrequencyKind *string  `json:"frequency_kind,omitempty" validate:"omitempty,oneof=daily weekdays specific_days weekly"`
	DaysOfWeek    []string `json:"days_of_week,omitempty"`
	AutoApprove   *bool    `json:"auto_approve,omitempty"`
}

type CompleteChoreRequest struct {
	Date *time.Time `json:"date,omitempty"` // optional, default = today (UTC)
}
