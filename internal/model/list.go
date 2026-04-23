package model

import (
	"time"

	"github.com/google/uuid"
)

// List is a todo / grocery / packing list belonging to a household.
type List struct {
	ID               uuid.UUID  `json:"id"`
	HouseholdID      uuid.UUID  `json:"household_id"`
	Name             string     `json:"name"`
	Type             string     `json:"type"` // todo | grocery | packing | custom
	Shared           bool       `json:"shared"`
	AssignedMemberID *uuid.UUID `json:"assigned_member_id,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// ListItem is a single item in a List.
type ListItem struct {
	ID               uuid.UUID  `json:"id"`
	ListID           uuid.UUID  `json:"list_id"`
	HouseholdID      uuid.UUID  `json:"household_id"`
	Text             string     `json:"text"`
	Completed        bool       `json:"completed"`
	AssignedMemberID *uuid.UUID `json:"assigned_member_id,omitempty"`
	DueDate          *time.Time `json:"due_date,omitempty"`
	Priority         string     `json:"priority"` // none | low | medium | high
	SortOrder        int        `json:"sort_order"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
}

// CreateListRequest is the payload for POST /v1/lists.
type CreateListRequest struct {
	Name             string     `json:"name"  validate:"required,min=1,max=200"`
	Type             string     `json:"type"  validate:"required,oneof=todo grocery packing custom"`
	Shared           bool       `json:"shared"`
	AssignedMemberID *uuid.UUID `json:"assigned_member_id,omitempty"`
}

// UpdateListRequest is the payload for PATCH /v1/lists/:id.
type UpdateListRequest struct {
	Name             *string    `json:"name,omitempty"  validate:"omitempty,min=1,max=200"`
	Shared           *bool      `json:"shared,omitempty"`
	AssignedMemberID *uuid.UUID `json:"assigned_member_id,omitempty"`
}

// CreateListItemRequest is the payload for POST /v1/lists/:id/items.
type CreateListItemRequest struct {
	Text             string     `json:"text"  validate:"required,min=1,max=500"`
	AssignedMemberID *uuid.UUID `json:"assigned_member_id,omitempty"`
	DueDate          *time.Time `json:"due_date,omitempty"`
	Priority         string     `json:"priority" validate:"omitempty,oneof=none low medium high"`
	SortOrder        int        `json:"sort_order"`
}

// UpdateListItemRequest is the payload for PATCH /v1/lists/:id/items/:itemID.
type UpdateListItemRequest struct {
	Text             *string    `json:"text,omitempty"      validate:"omitempty,min=1,max=500"`
	Completed        *bool      `json:"completed,omitempty"`
	AssignedMemberID *uuid.UUID `json:"assigned_member_id,omitempty"`
	DueDate          *time.Time `json:"due_date,omitempty"`
	Priority         *string    `json:"priority,omitempty"  validate:"omitempty,oneof=none low medium high"`
	SortOrder        *int       `json:"sort_order,omitempty"`
}
