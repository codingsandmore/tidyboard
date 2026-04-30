package model

import (
	"time"

	"github.com/google/uuid"
)

// Routine is a named checklist (morning/evening/anytime) for a household.
type Routine struct {
	ID          uuid.UUID  `json:"id"`
	HouseholdID uuid.UUID  `json:"household_id"`
	Name        string     `json:"name"`
	MemberID    *uuid.UUID `json:"member_id,omitempty"`
	DaysOfWeek  []string   `json:"days_of_week"`
	TimeSlot    string     `json:"time_slot"` // morning | evening | anytime
	Archived    bool       `json:"archived"`
	SortOrder   int        `json:"sort_order"`
	Steps       []Step     `json:"steps,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// Step is a single item in a Routine checklist.
type Step struct {
	ID         uuid.UUID `json:"id"`
	RoutineID  uuid.UUID `json:"routine_id"`
	Name       string    `json:"name"`
	EstMinutes *int      `json:"est_minutes,omitempty"`
	SortOrder  int       `json:"sort_order"`
	Icon       *string   `json:"icon,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// Completion records that a member finished a step (or whole routine).
type Completion struct {
	ID          uuid.UUID  `json:"id"`
	RoutineID   uuid.UUID  `json:"routine_id"`
	StepID      *uuid.UUID `json:"step_id,omitempty"`
	MemberID    uuid.UUID  `json:"member_id"`
	CompletedAt time.Time  `json:"completed_at"`
}

// StreakResponse is the response for GET /v1/routines/:id/streak.
type StreakResponse struct {
	RoutineID uuid.UUID `json:"routine_id"`
	MemberID  uuid.UUID `json:"member_id"`
	Streak    int       `json:"streak"`
}

// CreateRoutineRequest is the payload for POST /v1/routines.
type CreateRoutineRequest struct {
	Name       string     `json:"name"`
	MemberID   *uuid.UUID `json:"member_id,omitempty"`
	DaysOfWeek []string   `json:"days_of_week"`
	TimeSlot   string     `json:"time_slot"`
	SortOrder  int        `json:"sort_order"`
}

// UpdateRoutineRequest is the payload for PATCH /v1/routines/:id.
type UpdateRoutineRequest struct {
	Name       *string    `json:"name,omitempty"`
	MemberID   *uuid.UUID `json:"member_id,omitempty"`
	DaysOfWeek []string   `json:"days_of_week,omitempty"`
	TimeSlot   *string    `json:"time_slot,omitempty"`
	Archived   *bool      `json:"archived,omitempty"`
	SortOrder  *int       `json:"sort_order,omitempty"`
}

// AddStepRequest is the payload for POST /v1/routines/:id/steps.
type AddStepRequest struct {
	Name       string  `json:"name"`
	EstMinutes *int    `json:"est_minutes,omitempty"`
	SortOrder  int     `json:"sort_order"`
	Icon       *string `json:"icon,omitempty"`
}

// UpdateStepRequest is the payload for PATCH /v1/routines/:id/steps/:stepID.
type UpdateStepRequest struct {
	Name       *string `json:"name,omitempty"`
	EstMinutes *int    `json:"est_minutes,omitempty"`
	SortOrder  *int    `json:"sort_order,omitempty"`
	Icon       *string `json:"icon,omitempty"`
}

// MarkCompleteRequest is the payload for POST /v1/routines/:id/complete.
type MarkCompleteRequest struct {
	StepID   *uuid.UUID `json:"step_id,omitempty"`
	MemberID uuid.UUID  `json:"member_id"`
}
