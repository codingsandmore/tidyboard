package model

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

// Event is a calendar event within a household.
type Event struct {
	ID              uuid.UUID       `json:"id"`
	HouseholdID     uuid.UUID       `json:"household_id"`
	CalendarID      *uuid.UUID      `json:"calendar_id,omitempty"`
	ExternalID      *string         `json:"external_id,omitempty"`
	Title           string          `json:"title"`
	Description     string          `json:"description"`
	StartTime       time.Time       `json:"start_time"`
	EndTime         time.Time       `json:"end_time"`
	AllDay          bool            `json:"all_day"`
	Location        string          `json:"location"`
	RecurrenceRule  string          `json:"recurrence_rule"`
	AssignedMembers []uuid.UUID     `json:"assigned_members"`
	Reminders       json.RawMessage `json:"reminders,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// CreateEventRequest is the payload for POST /v1/events.
type CreateEventRequest struct {
	CalendarID      *uuid.UUID  `json:"calendar_id,omitempty"`
	Title           string      `json:"title"      validate:"required,min=1,max=500"`
	Description     string      `json:"description"`
	StartTime       time.Time   `json:"start_time" validate:"required"`
	EndTime         time.Time   `json:"end_time"   validate:"required,gtfield=StartTime"`
	AllDay          bool        `json:"all_day"`
	Location        string      `json:"location"`
	RecurrenceRule  string      `json:"recurrence_rule"`
	AssignedMembers []uuid.UUID `json:"assigned_members"`
}

// UpdateEventRequest is the payload for PATCH /v1/events/:id.
type UpdateEventRequest struct {
	Title           *string     `json:"title,omitempty"      validate:"omitempty,min=1,max=500"`
	Description     *string     `json:"description,omitempty"`
	StartTime       *time.Time  `json:"start_time,omitempty"`
	EndTime         *time.Time  `json:"end_time,omitempty"`
	AllDay          *bool       `json:"all_day,omitempty"`
	Location        *string     `json:"location,omitempty"`
	RecurrenceRule  *string     `json:"recurrence_rule,omitempty"`
	AssignedMembers []uuid.UUID `json:"assigned_members,omitempty"`
}

// ListEventsQuery are query params for GET /v1/events.
type ListEventsQuery struct {
	Start      time.Time  `schema:"start"`
	End        time.Time  `schema:"end"`
	MemberID   *uuid.UUID `schema:"member_id"`
	CalendarID *uuid.UUID `schema:"calendar_id"`
}
